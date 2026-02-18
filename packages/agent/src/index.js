/**
 * Slot Spin Execution Service (Base)
 *
 * Execute provably fair slot spins on Base using Chainlink VRF.
 * Gasless for caller via x402 payment in USDC.
 *
 * Stateless, no DB, relay + monetization + onchain execution only.
 */

import "dotenv/config";
import express from "express";
import { ethers } from "ethers";
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

// ─── x402 ───────────────────────────────────────────────────────────────────
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "eip155:8453",
  new ExactEvmScheme(),
);

// ─── Express app ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(
  paymentMiddleware(
    {
      "POST /spinWith1USDC": {
        accepts: {
          scheme: "exact",
          price: `$${SPIN_PRICE_USD}`,
          network: "eip155:8453", // Base mainnet
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

/** GET / (service info) */
app.get("/", (_req, res) => {
  res.json({
    name: "Slot Spin Execution Service (Base)",
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
app.get("/round/:requestId", async (req, res) => {
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
app.get("/player/:address/balances", async (req, res) => {
  try {
    const addr = req.params.address;
    if (!ethers.utils.isAddress(addr)) {
      return res.status(400).json({ error: "Invalid address" });
    }
    const user = await slotMachine.infoPerUser(addr);
    return res.json({
      address: addr,
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
app.get("/contract/health", async (_req, res) => {
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

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(
    `Slot Spin Execution Service listening at http://localhost:${PORT}`,
  );
});
