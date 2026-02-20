/**
 * Lotero Agent (Base)
 *
 * Execute provably fair slot spins on Base using Chainlink VRF.
 * Gasless for caller via x402 payment in USDC.
 *
 * Stateless, no DB, relay + monetization + onchain execution only.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
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
import { executeSpin } from "./services/spin.js";
import { executeClaim } from "./services/claim.js";

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
  String(
    process.env.VRF_MIN_NATIVE_ETH || constants.VRF_MIN_NATIVE_ETH_FOR_SPIN,
  ),
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
        "Create Secret API Keys at https://portal.cdp.coinbase.com/projects/api-keys",
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

// ─── Service context (shared spin/claim logic) ───────────────────────────────

const spinCtx = {
  slotMachine,
  provider,
  executorWallet,
  vrfCoordinator,
  vrfSubscriptionId: VRF_SUBSCRIPTION_ID,
  minSubscriptionNativeWei: MIN_SUBSCRIPTION_NATIVE_WEI,
  minSubscriptionLinkJuels: MIN_SUBSCRIPTION_LINK_JUELS,
  spinAmount: SPIN_AMOUNT,
};

const claimCtx = {
  slotMachine,
  provider,
  executorWallet,
};

function spinErrorStatus(err) {
  if (err.message.startsWith("Invalid player")) return 400;
  if (err.message.startsWith("Contract unhealthy")) return 503;
  return 500;
}

function claimErrorStatus(err) {
  if (err.message.startsWith("Invalid user")) return 400;
  if (err.message.startsWith("Nothing to claim")) return 400;
  if (err.message.includes("Executor ETH")) return 503;
  return 500;
}

// ─── Routes: paid ───────────────────────────────────────────────────────────

/**
 * POST /spinWith1USDC
 * Flow: 1) x402 verifies payment 2) executeSpin service 3) return result
 */
app.post("/spinWith1USDC", async (req, res) => {
  try {
    const { player, referral } = req.body || {};
    const result = await executeSpin(spinCtx, { player, referral });
    console.log(
      `[spin] player=${player} requestId=${result.requestId} txHash=${result.txHash}`,
    );
    return res.json(result);
  } catch (err) {
    console.error("[spin] error:", err.message);
    const status = spinErrorStatus(err);
    const payload =
      status === 503
        ? { error: "Contract unhealthy", details: [err.message] }
        : { error: err.reason || err.message || "Spin execution failed" };
    if (status === 503 && err.message.startsWith("Contract unhealthy:")) {
      payload.details = err.message
        .replace("Contract unhealthy: ", "")
        .split("; ");
    }
    return res.status(status).json(payload);
  }
});

/**
 * POST /claim
 * Flow: 1) x402 verifies payment 2) executeClaim service 3) return result
 */
app.post("/claim", async (req, res) => {
  try {
    const { user } = req.body || {};
    const result = await executeClaim(claimCtx, { user });
    console.log(
      `[claim] user=${result.user} amount=${result.amount} txHash=${result.txHash}`,
    );
    return res.json(result);
  } catch (err) {
    console.error("[claim] error:", err.message);
    const status = claimErrorStatus(err);
    const payload =
      status === 400 && err.message.startsWith("Nothing to claim")
        ? {
            error: "Nothing to claim",
            details: "User has already claimed all earnings",
          }
        : { error: err.reason || err.message || "Claim failed" };
    if (status === 503) {
      payload.error = "Executor insufficient";
      payload.details = [err.message];
    }
    return res.status(status).json(payload);
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
      "GET /round": "Get round result. Query: requestId.",
      "GET /player/:address/balances":
        "Get player balances and referral stats.",
      "GET /contract/health":
        "Executor ETH/USDC, contract bankroll, VRF subscription.",
      "GET /cron/health":
        "System health for external cron/monitoring agent (read-only).",
    },
  });
});

/** GET /round?requestId=... – Round result (numbers, prize, resolved) by VRF requestId */
app.get("/round", readOnlyRateLimit, async (req, res) => {
  try {
    const requestId = req.query.requestId;
    if (!requestId) {
      return res.status(400).json({ error: "Missing query parameter: requestId" });
    }
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

/** GET /contract/health – Executor (ETH/USDC), contract (bankroll), VRF subscription */
app.get("/contract/health", readOnlyRateLimit, async (_req, res) => {
  try {
    const minEthWei = ethers.utils.parseEther(
      String(constants.WALLET_MIN_ETH_TRIGGER),
    );
    const targetEthWei = ethers.utils.parseEther(
      String(constants.WALLET_TARGET_ETH),
    );
    const minUsdcWei = ethers.utils.parseUnits(
      String(constants.EXECUTOR_MIN_USDC_FOR_SPIN),
      6,
    );
    const triggerBankrollWei = ethers.utils.parseUnits(
      String(constants.CONTRACT_TOPUP_TRIGGER_BANKROLL_USDC),
      6,
    );
    const targetBankrollWei = ethers.utils.parseUnits(
      String(constants.CONTRACT_TARGET_BANKROLL_USDC),
      6,
    );

    const usdc = new ethers.Contract(
      USDC_BASE,
      ERC20_APPROVE_ABI,
      provider,
    );

    const [
      moneyInContract,
      currentDebt,
      maxBet,
      closed,
      useNative,
      executorEth,
      executorUsdcRaw,
    ] = await Promise.all([
      slotMachine.getMoneyInContract(),
      slotMachine.getCurrentDebt(),
      slotMachine.getMaxValueToPlay(),
      slotMachine.isClosed(),
      slotMachine.useNativePayment(),
      provider.getBalance(executorWallet.address),
      usdc.balanceOf(executorWallet.address),
    ]);

    const bankroll = moneyInContract.sub(currentDebt);

    const health = {
      executor: {
        eth: {
          value: executorEth.toString(),
          valueFormatted: ethers.utils.formatEther(executorEth),
          sufficient: executorEth.gte(minEthWei),
          minTrigger: String(constants.WALLET_MIN_ETH_TRIGGER),
          target: String(constants.WALLET_TARGET_ETH),
        },
        usdc: {
          value: executorUsdcRaw.toString(),
          valueFormatted: ethers.utils.formatUnits(executorUsdcRaw, 6),
          sufficient: executorUsdcRaw.gte(minUsdcWei),
          minTrigger: String(constants.EXECUTOR_MIN_USDC_FOR_SPIN),
          target: String(constants.WALLET_TARGET_USDC_BUFFER),
        },
      },
      contract: {
        moneyInContract: moneyInContract.toString(),
        moneyInContractFormatted: ethers.utils.formatUnits(
          moneyInContract,
          6,
        ),
        currentDebt: currentDebt.toString(),
        currentDebtFormatted: ethers.utils.formatUnits(currentDebt, 6),
        bankroll: bankroll.toString(),
        bankrollFormatted: ethers.utils.formatUnits(bankroll, 6),
        bankrollSufficient: bankroll.gte(
          ethers.utils.parseUnits(
            String(constants.CONTRACT_MIN_AVAILABLE_BANKROLL_USDC),
            6,
          ),
        ),
        minTrigger: String(constants.CONTRACT_TOPUP_TRIGGER_BANKROLL_USDC),
        target: String(constants.CONTRACT_TARGET_BANKROLL_USDC),
        contractOpen: !closed,
        maxBetSafe: maxBet.toString(),
      },
    };

    if (VRF_SUBSCRIPTION_ID) {
      try {
        const sub = await vrfCoordinator.getSubscription(VRF_SUBSCRIPTION_ID);
        const balance = useNative ? sub.nativeBalance : sub.balance;
        const sufficient = useNative
          ? sub.nativeBalance.gte(MIN_SUBSCRIPTION_NATIVE_WEI)
          : sub.balance.gte(MIN_SUBSCRIPTION_LINK_JUELS);
        health.vrfSubscription = {
          balance: balance.toString(),
          balanceFormatted: useNative
            ? ethers.utils.formatEther(sub.nativeBalance)
            : ethers.utils.formatEther(sub.balance),
          balanceType: useNative ? "native" : "link",
          sufficient,
          minTrigger: useNative
            ? String(constants.VRF_MIN_NATIVE_ETH_FOR_SPIN)
            : String(constants.VRF_MIN_LINK_TRIGGER),
          target: useNative
            ? String(constants.WALLET_TARGET_ETH)
            : String(constants.VRF_TARGET_LINK),
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
