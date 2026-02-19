/**
 * Lotero Agent (Base)
 *
 * Execute provably fair slot spins on Base using Chainlink VRF.
 * Gasless for caller via x402 payment in USDC.
 *
 * Stateless, no DB, relay + monetization + onchain execution only.
 */

import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { ethers } from "ethers";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { SlotMachineV2Abi, VRFCoordinatorAbi } from "./utils/abi.js";
import constants from "./utils/constants.js";
import { createCronRouter } from "./routes/cron.js";

// ─── Config ────────────────────────────────────────────────────────────────
// Required env vars (no defaults)
const SLOT_MACHINE_ADDRESS = process.env.SLOT_MACHINE_ADDRESS;
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const PAY_TO = process.env.PAY_TO;

// Optional: server & facilitator
const PORT = process.env.PORT || 4021;
const BASE_RPC = process.env.BASE_RPC || "https://mainnet.base.org";
const FACILITATOR_URL =
  process.env.FACILITATOR_URL ||
  "https://api.cdp.coinbase.com/platform/v2/x402";

// On-chain spin amount (1 USDC)
const SPIN_AMOUNT = ethers.utils.parseUnits("1", 6);

// Validation: use constants (allow env override for VRF only)
const VRF_COORDINATOR =
  process.env.VRF_COORDINATOR || "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634"; // Base mainnet
const VRF_SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID;
const MIN_SUBSCRIPTION_NATIVE_WEI = ethers.utils.parseEther(
  String(process.env.VRF_MIN_NATIVE_ETH || constants.VRF_MIN_NATIVE_ETH_FOR_SPIN),
);
const MIN_SUBSCRIPTION_LINK_JUELS = process.env.MIN_SUBSCRIPTION_LINK_JUELS
  ? ethers.BigNumber.from(process.env.MIN_SUBSCRIPTION_LINK_JUELS)
  : ethers.utils.parseEther(String(constants.VRF_MIN_LINK_FOR_SPIN));

// Rate limits
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000; // 1 min
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60; // read-only: 60 req/min per IP
const RATE_LIMIT_NO_PAYMENT_MAX =
  Number(process.env.RATE_LIMIT_NO_PAYMENT_MAX) || 10; // paid route without x402 header: 10 req/min

if (!SLOT_MACHINE_ADDRESS || !EXECUTOR_PRIVATE_KEY || !PAY_TO) {
  console.error(
    "Missing required env: SLOT_MACHINE_ADDRESS, EXECUTOR_PRIVATE_KEY, PAY_TO",
  );
  process.exit(1);
}

// ─── Ethers / contracts ─────────────────────────────────────────────────────
const provider = new ethers.providers.JsonRpcProvider(BASE_RPC);
const executorWallet = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);
const slotMachine = new ethers.Contract(
  SLOT_MACHINE_ADDRESS,
  SlotMachineV2Abi,
  executorWallet,
);
const vrfCoordinator = new ethers.Contract(
  VRF_COORDINATOR,
  VRFCoordinatorAbi,
  provider,
);

// USDC Base mainnet
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ERC20_APPROVE_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
];

// ─── x402 ───────────────────────────────────────────────────────────────────
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;
const isCdpFacilitator = FACILITATOR_URL.includes("api.cdp.coinbase.com");

/**
 * Build HTTP facilitator client for x402 payment verification.
 * Uses CDP JWT auth when facilitator is Coinbase (api.cdp.coinbase.com).
 * @returns {HTTPFacilitatorClient}
 */
function buildFacilitatorClient() {
  const config = { url: FACILITATOR_URL };

  if (isCdpFacilitator && CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
    const facilitatorUrl = new URL(FACILITATOR_URL);
    const host = facilitatorUrl.host;
    const basePath = facilitatorUrl.pathname.replace(/\/$/, "") || "";

    config.createAuthHeaders = async () => {
      const [supportedJwt, verifyJwt, settleJwt] = await Promise.all([
        generateJwt({
          apiKeyId: CDP_API_KEY_ID,
          apiKeySecret: CDP_API_KEY_SECRET,
          requestMethod: "GET",
          requestHost: host,
          requestPath: `${basePath}/supported`,
        }),
        generateJwt({
          apiKeyId: CDP_API_KEY_ID,
          apiKeySecret: CDP_API_KEY_SECRET,
          requestMethod: "POST",
          requestHost: host,
          requestPath: `${basePath}/verify`,
        }),
        generateJwt({
          apiKeyId: CDP_API_KEY_ID,
          apiKeySecret: CDP_API_KEY_SECRET,
          requestMethod: "POST",
          requestHost: host,
          requestPath: `${basePath}/settle`,
        }),
      ]);
      return {
        supported: { Authorization: `Bearer ${supportedJwt}` },
        verify: { Authorization: `Bearer ${verifyJwt}` },
        settle: { Authorization: `Bearer ${settleJwt}` },
      };
    };
  } else if (isCdpFacilitator) {
    console.error(
      "CDP facilitator requires CDP_API_KEY_ID and CDP_API_KEY_SECRET in .env.\n" +
        "Create Secret API Keys at https://portal.cdp.coinbase.com/projects/api-keys"
    );
    process.exit(1);
  }

  return new HTTPFacilitatorClient(config);
}

const facilitatorClient = buildFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "eip155:8453",
  new ExactEvmScheme(),
);

// ─── Express app ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Paid routes without x402 header: apply stricter rate limit to avoid facilitator spam.
// With header: skip this limit; without: if under limit → next() → paymentMiddleware returns 402 + payment instructions.
const noPaymentRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_NO_PAYMENT_MAX,
  message: { error: "Too many requests. Include x402 payment to proceed." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply noPaymentRateLimit only to paid routes that lack x402 payment headers
app.use((req, res, next) => {
  const paidPaths = ["/spinWith1USDC", "/claim"];
  const isPaidRoute =
    req.method === "POST" && paidPaths.some((p) => req.path === p);
  if (!isPaidRoute) {
    return next();
  }
  const hasPayment = req.get("payment-signature") || req.get("x-payment");
  if (hasPayment) {
    return next(); // Has payment header, let payment middleware verify with facilitator
  }
  noPaymentRateLimit(req, res, next); // Under limit → next() so middleware returns proper 402
});

app.use(
  paymentMiddleware(
    {
      "POST /spinWith1USDC": {
        accepts: [
          {
            scheme: "exact",
            price: `$${constants.SPIN_PRICE_USD}`,
            network: "eip155:8453",
            payTo: PAY_TO,
          },
        ],
        description: "Execute one slot spin (1 USDC bet) for player on Base",
        mimeType: "application/json",
      },
      "POST /claim": {
        accepts: [
          {
            scheme: "exact",
            price: `$${constants.CLAIM_PRICE_USD}`,
            network: "eip155:8453",
            payTo: PAY_TO,
          },
        ],
        description: `Claim player earnings (gasless, ${constants.CLAIM_PRICE_USD} USDC fee)`,
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Shared by spin and claim. Returns { ok, error? } */
async function validateExecutorEth() {
  const minEthWei = ethers.utils.parseEther(
    String(constants.EXECUTOR_MIN_ETH_TRIGGER),
  );
  const balance = await provider.getBalance(executorWallet.address);
  if (balance.lt(minEthWei)) {
    return {
      ok: false,
      error: `Executor ETH too low for gas (need >= ${constants.EXECUTOR_MIN_ETH_TRIGGER} ETH)`,
    };
  }
  return { ok: true };
}

/**
 * Validations before executing spin:
 * - Contract open (isClosed = false)
 * - Available bankroll (moneyInContract - debt) >= 30 USDC (can pay max prize 30x)
 * - Executor ETH for gas
 * - Executor USDC >= 1 (executor pays 1 USDC on behalf of player via playFor)
 * - VRF subscription has sufficient balance (native or LINK per useNativePayment)
 */
async function validateContractHealth() {
  const minUsdcForSpin = ethers.utils.parseUnits(
    String(constants.EXECUTOR_MIN_USDC_FOR_SPIN),
    6,
  );
  const minBankrollUsdc = ethers.utils.parseUnits(
    String(constants.CONTRACT_MIN_AVAILABLE_BANKROLL_USDC),
    6,
  );

  const usdc = new ethers.Contract(
    USDC_BASE,
    ERC20_APPROVE_ABI,
    provider,
  );

  const [
    closed,
    moneyInContract,
    debt,
    executorEthCheck,
    executorUsdcBalance,
    useNative,
  ] = await Promise.all([
    slotMachine.isClosed(),
    slotMachine.getMoneyInContract(),
    slotMachine.getCurrentDebt(),
    validateExecutorEth(),
    usdc.balanceOf(executorWallet.address),
    slotMachine.useNativePayment(),
  ]);

  const availableBankroll = moneyInContract.sub(debt);
  const errors = [];

  if (closed) errors.push("Contract is closed");
  if (availableBankroll.lt(minBankrollUsdc))
    errors.push(
      `Available bankroll too low (need >= ${constants.CONTRACT_MIN_AVAILABLE_BANKROLL_USDC} USDC to pay max prize)`,
    );
  if (!executorEthCheck.ok) errors.push(executorEthCheck.error);
  if (executorUsdcBalance.lt(minUsdcForSpin))
    errors.push(
      `Executor USDC too low (need >= ${constants.EXECUTOR_MIN_USDC_FOR_SPIN} USDC to execute spin)`,
    );

  // VRF subscription balance (if subscription ID configured)
  if (VRF_SUBSCRIPTION_ID) {
    try {
      const sub = await vrfCoordinator.getSubscription(VRF_SUBSCRIPTION_ID);
      const [linkBalance, nativeBalance] = [sub.balance, sub.nativeBalance];
      if (useNative) {
        if (nativeBalance.lt(MIN_SUBSCRIPTION_NATIVE_WEI)) {
          errors.push(
            `VRF subscription native balance too low (need >= ${constants.VRF_MIN_NATIVE_ETH_FOR_SPIN} ETH)`,
          );
        }
      } else {
        if (linkBalance.lt(MIN_SUBSCRIPTION_LINK_JUELS)) {
          errors.push(
            `VRF subscription LINK balance too low (need >= ${constants.VRF_MIN_LINK_FOR_SPIN} LINK)`,
          );
        }
      }
    } catch (err) {
      errors.push(`VRF subscription check failed: ${err.message}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─── Routes: paid ───────────────────────────────────────────────────────────

/**
 * POST /spinWith1USDC
 * Flow: 1) x402 verifies payment 2) validate health 3) playFor 4) return requestId + txHash
 */
app.post("/spinWith1USDC", async (req, res) => {
  try {
    const { player, referral } = req.body || {};
    if (
      !player ||
      typeof player !== "string" ||
      !ethers.utils.isAddress(player)
    ) {
      return res.status(400).json({ error: "Invalid player address" });
    }
    const referralAddr =
      referral && ethers.utils.isAddress(referral)
        ? referral
        : ethers.constants.AddressZero;

    const health = await validateContractHealth();
    if (!health.ok) {
      return res.status(503).json({
        error: "Contract unhealthy",
        details: health.errors,
      });
    }

    const tx = await slotMachine.playFor(player, referralAddr, SPIN_AMOUNT, {
      gasLimit: 350000,
    });
    const receipt = await tx.wait();
    const reqId = receipt.events?.find((e) => e.event === "SpinRequested")
      ?.args?.[0];

    if (!reqId) {
      return res
        .status(500)
        .json({ error: "Could not extract requestId from tx" });
    }

    console.log(
      `[spin] player=${player} requestId=${reqId.toString()} txHash=${receipt.transactionHash}`,
    );

    return res.json({
      requestId: reqId.toString(),
      txHash: receipt.transactionHash,
      status: "pending",
    });
  } catch (err) {
    console.error("[spin] error:", err.message);
    return res.status(500).json({
      error: err.reason || err.message || "Spin execution failed",
    });
  }
});

/**
 * POST /claim
 * Flow: 1) x402 verifies payment 2) claimPlayerEarnings for user 3) return txHash
 */
app.post("/claim", async (req, res) => {
  try {
    const { user } = req.body || {};
    if (
      !user ||
      typeof user !== "string" ||
      !ethers.utils.isAddress(user)
    ) {
      return res.status(400).json({ error: "Invalid user address" });
    }

    const userInfo = await slotMachine.infoPerUser(user);
    const moneyToClaimForPlay =
      userInfo.moneyEarned.sub(userInfo.moneyClaimed);
    const moneyToClaimForReferring =
      userInfo.earnedByReferrals.sub(userInfo.claimedByReferrals);
    const moneyToClaim = moneyToClaimForPlay.add(moneyToClaimForReferring);

    if (moneyToClaim.isZero()) {
      return res.status(400).json({
        error: "Nothing to claim",
        details: "User has already claimed all earnings",
      });
    }

    const executorCheck = await validateExecutorEth();
    if (!executorCheck.ok) {
      return res.status(503).json({
        error: "Executor insufficient",
        details: [executorCheck.error],
      });
    }

    const tx = await slotMachine.claimPlayerEarnings(user, {
      gasLimit: 150000,
    });
    const receipt = await tx.wait();

    console.log(
      `[claim] user=${user} amount=${moneyToClaim.toString()} txHash=${receipt.transactionHash}`,
    );

    return res.json({
      user,
      amount: moneyToClaim.toString(),
      txHash: receipt.transactionHash,
      status: "claimed",
    });
  } catch (err) {
    console.error("[claim] error:", err.message);
    return res.status(500).json({
      error: err.reason || err.message || "Claim failed",
    });
  }
});

// ─── Routes: read-only ──────────────────────────────────────────────────────

const readOnlyRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cron / monitoring (external agent hits this to verify system state)
const cronRouter = createCronRouter({
  slotMachine,
  vrfCoordinator,
  executorWallet,
  provider,
  slotMachineAddress: SLOT_MACHINE_ADDRESS,
  payTo: PAY_TO,
  usdcAddress: USDC_BASE,
  vrfSubscriptionId: VRF_SUBSCRIPTION_ID,
});
app.use("/cron", readOnlyRateLimit, cronRouter);

/** GET / – Service info and endpoint list */
app.get("/", readOnlyRateLimit, (_req, res) => {
  res.json({
    name: "Lotero Agent (Base)",
    description:
      "Execute provably fair slot spins on Base using Chainlink VRF. Gasless for caller via x402 payment in USDC.",
    endpoints: {
      "POST /spinWith1USDC": `Paid (${constants.SPIN_PRICE_USD} USDC). Execute spin for player.`,
      "POST /claim": `Paid (${constants.CLAIM_PRICE_USD} USDC). Claim player earnings (gasless).`,
      "GET /round/:requestId": "Get round result by requestId.",
      "GET /player/:address/balances":
        "Get player balances and referral stats.",
      "GET /contract/health": "Contract bankroll, max bet, open/closed.",
      "GET /cron/health": "System health for external cron/monitoring agent (read-only).",
    },
  });
});

/** GET /round/:requestId – Round result (numbers, prize, resolved) by VRF requestId */
app.get("/round/:requestId", readOnlyRateLimit, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const resolved = await slotMachine.isResolved(requestId);
    const round = await slotMachine.getRoundInfo(requestId);

    return res.json({
      requestId,
      resolved,
      round: {
        userAddress: round.userAddress,
        number1: round.number1.toString(),
        number2: round.number2.toString(),
        number3: round.number3.toString(),
        value: round.value.toString(),
        hasWon: round.hasWon,
        prize: round.prize.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** GET /player/:address/balances – Player balances (moneyAdded, earned, claimed, referrals) */
app.get("/player/:address/balances", readOnlyRateLimit, async (req, res) => {
  try {
    const addr = req.params.address;
    if (!ethers.utils.isAddress(addr)) {
      return res.status(400).json({ error: "Invalid address" });
    }
    const user = await slotMachine.infoPerUser(addr);
    return res.json({
      address: addr,
      moneyAdded: user.moneyAdded.toString(),
      moneyEarned: user.moneyEarned.toString(),
      moneyClaimed: user.moneyClaimed.toString(),
      earnedByReferrals: user.earnedByReferrals.toString(),
      claimedByReferrals: user.claimedByReferrals.toString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** GET /contract/health – Bankroll, max bet, open/closed, executor ETH, VRF subscription */
app.get("/contract/health", readOnlyRateLimit, async (_req, res) => {
  try {
    const minEthWei = ethers.utils.parseEther(
      String(constants.EXECUTOR_MIN_ETH_TRIGGER),
    );
    const [moneyInContract, maxBet, closed, useNative] = await Promise.all([
      slotMachine.getMoneyInContract(),
      slotMachine.getMaxValueToPlay(),
      slotMachine.isClosed(),
      slotMachine.useNativePayment(),
    ]);
    const executorEth = await provider.getBalance(executorWallet.address);

    const health = {
      bankroll: moneyInContract.toString(),
      maxBetSafe: maxBet.toString(),
      contractOpen: !closed,
      executorEthBalance: executorEth.toString(),
      executorEthSufficient: executorEth.gte(minEthWei),
      useNativePayment: useNative,
    };

    if (VRF_SUBSCRIPTION_ID) {
      try {
        const sub = await vrfCoordinator.getSubscription(VRF_SUBSCRIPTION_ID);
        health.vrfSubscription = {
          linkBalance: sub.balance.toString(),
          nativeBalance: sub.nativeBalance.toString(),
          balanceType: useNative ? "native" : "link",
          sufficient: useNative
            ? sub.nativeBalance.gte(MIN_SUBSCRIPTION_NATIVE_WEI)
            : sub.balance.gte(MIN_SUBSCRIPTION_LINK_JUELS),
        };
      } catch (e) {
        health.vrfSubscription = { error: e.message };
      }
    }

    return res.json(health);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Startup: ensure USDC approval, then listen ──────────────────────────────

/**
 * Ensures executor wallet has unlimited USDC approval for SlotMachine.
 * Approves max uint256 if allowance is zero; no-op otherwise.
 */
async function ensureUsdcApproval() {
  const usdc = new ethers.Contract(
    USDC_BASE,
    ERC20_APPROVE_ABI,
    executorWallet,
  );
  const allowance = await usdc.allowance(
    executorWallet.address,
    SLOT_MACHINE_ADDRESS,
  );
  if (!allowance.isZero()) {
    console.log("[startup] USDC already approved for SlotMachineV2");
    return;
  }
  console.log("[startup] Approving USDC for SlotMachineV2...");
  const tx = await usdc.approve(
    SLOT_MACHINE_ADDRESS,
    ethers.constants.MaxUint256,
  );
  await tx.wait();
  console.log("[startup] USDC approved. Tx:", tx.hash);
}

/** Ensures USDC approval, then starts Express server on PORT. */
async function start() {
  await ensureUsdcApproval();
  app.listen(PORT, () => {
    console.log(`Lotero Agent listening at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("[startup] Failed:", err.message);
  process.exit(1);
});
