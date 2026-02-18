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
import { SlotMachineV2Abi, VRFCoordinatorAbi } from "./abi.js";

// ─── Config ────────────────────────────────────────────────────────────────
// Required
const SLOT_MACHINE_ADDRESS = process.env.SLOT_MACHINE_ADDRESS;
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const PAY_TO = process.env.PAY_TO;

// Optional with defaults
const PORT = process.env.PORT || 4021;
const BASE_RPC = process.env.BASE_RPC || "https://mainnet.base.org";
const FACILITATOR_URL =
  process.env.FACILITATOR_URL ||
  "https://api.cdp.coinbase.com/platform/v2/x402";

// Spin pricing
const SPIN_AMOUNT = ethers.utils.parseUnits("1", 6); // 1 USDC (6 decimals)
const SPIN_PRICE_USD = "1.05";

// Validation thresholds
const MIN_EXECUTOR_ETH_WEI = ethers.BigNumber.from(
  process.env.MIN_EXECUTOR_ETH_WEI || "1000000000000000",
); // 0.001 ETH
const VRF_COORDINATOR =
  process.env.VRF_COORDINATOR || "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634"; // Base mainnet
const VRF_SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID;
const MIN_SUBSCRIPTION_NATIVE_WEI = ethers.BigNumber.from(
  process.env.MIN_SUBSCRIPTION_NATIVE_WEI || "1000000000000000",
); // 0.001 ETH
const MIN_SUBSCRIPTION_LINK_JUELS = process.env.MIN_SUBSCRIPTION_LINK_JUELS
  ? ethers.BigNumber.from(process.env.MIN_SUBSCRIPTION_LINK_JUELS)
  : ethers.utils.parseEther("0.3"); // 0.1 LINK

// Rate limit for read-only endpoints (per IP)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000; // 1 min
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60; // 60 req/min

// Rate limit for paid route when no x402 payment header (avoid facilitator spam)
const RATE_LIMIT_NO_PAYMENT_MAX =
  Number(process.env.RATE_LIMIT_NO_PAYMENT_MAX) || 10; // 10 req/min per IP

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
];

// ─── x402 ───────────────────────────────────────────────────────────────────
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;
const isCdpFacilitator = FACILITATOR_URL.includes("api.cdp.coinbase.com");

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

// Rate limit for paid route when no x402 payment header (avoid saturation from empty requests)
// If under limit, pass to payment middleware which returns proper 402 with payment instructions
const noPaymentRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_NO_PAYMENT_MAX,
  message: { error: "Too many requests. Include x402 payment to execute spin." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, res, next) => {
  if (req.method !== "POST" || req.path !== "/spinWith1USDC") {
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
        accepts: {
          scheme: "exact",
          price: {
            amount: "1050000",
            asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            extra: {
              name: "USD Coin",
              version: "2",
              assetTransferMethod: "eip3009",
            },
          },
          network: "eip155:8453",
          payTo: PAY_TO,
        },
        description: "Execute one slot spin (1 USDC bet) for player on Base",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Validations before executing spin
 * - Contract open, bankroll sufficient
 * - Executor has prudent ETH for gas
 * - VRF subscription has sufficient balance (native or LINK per useNativePayment)
 */
async function validateContractHealth() {
  const [closed, maxBet, executorEth, useNative] = await Promise.all([
    slotMachine.isClosed(),
    slotMachine.getMaxValueToPlay(),
    provider.getBalance(executorWallet.address),
    slotMachine.useNativePayment(),
  ]);

  const errors = [];
  if (closed) errors.push("Contract is closed");
  if (maxBet.lt(SPIN_AMOUNT))
    errors.push("Bankroll insufficient for max payout");
  if (executorEth.lt(MIN_EXECUTOR_ETH_WEI)) {
    errors.push(
      `Executor ETH too low for gas (need >= ${ethers.utils.formatEther(MIN_EXECUTOR_ETH_WEI)} ETH)`,
    );
  }

  // VRF subscription balance (if subscription ID configured)
  if (VRF_SUBSCRIPTION_ID) {
    try {
      const sub = await vrfCoordinator.getSubscription(VRF_SUBSCRIPTION_ID);
      const [linkBalance, nativeBalance] = [sub.balance, sub.nativeBalance];
      if (useNative) {
        if (nativeBalance.lt(MIN_SUBSCRIPTION_NATIVE_WEI)) {
          errors.push(
            `VRF subscription native balance too low (need >= ${ethers.utils.formatEther(MIN_SUBSCRIPTION_NATIVE_WEI)} ETH)`,
          );
        }
      } else {
        if (linkBalance.lt(MIN_SUBSCRIPTION_LINK_JUELS)) {
          errors.push(
            `VRF subscription LINK balance too low (need >= ${ethers.utils.formatEther(MIN_SUBSCRIPTION_LINK_JUELS)} LINK)`,
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

// ─── Routes: read-only ──────────────────────────────────────────────────────

const readOnlyRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** GET / (service info) */
app.get("/", readOnlyRateLimit, (_req, res) => {
  res.json({
    name: "Lotero Agent (Base)",
    description:
      "Execute provably fair slot spins on Base using Chainlink VRF. Gasless for caller via x402 payment in USDC.",
    endpoints: {
      "POST /spinWith1USDC": "Paid (1.05 USDC). Execute spin for player.",
      "GET /round/:requestId": "Get round result by requestId.",
      "GET /player/:address/balances":
        "Get player balances and referral stats.",
      "GET /contract/health": "Contract bankroll, max bet, open/closed.",
    },
  });
});

/** GET /round/:requestId */
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

/** GET /player/:address/balances */
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

/** GET /contract/health */
app.get("/contract/health", readOnlyRateLimit, async (_req, res) => {
  try {
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
      executorEthSufficient: executorEth.gte(MIN_EXECUTOR_ETH_WEI),
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
