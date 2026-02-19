/**
 * ACP Seller – Lotero Agent
 *
 * Listens for ACP jobs (spin, claim) and executes them on-chain.
 * Run alongside the Express API (x402) or standalone.
 *
 * Env: ACP_SELLER_WHITELISTED_WALLET_PRIVATE_KEY, ACP_SELLER_ENTITY_ID, ACP_SELLER_AGENT_WALLET_ADDRESS
 *      EXECUTOR_PRIVATE_KEY, SLOT_MACHINE_ADDRESS, BASE_RPC (optional)
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import acpNode from "@virtuals-protocol/acp-node";
import { AcpContractClientV2, AcpJobPhases } from "@virtuals-protocol/acp-node";

const AcpClient = acpNode?.default ?? acpNode;
import { ethers } from "ethers";
import { SlotMachineV2Abi, VRFCoordinatorAbi } from "../src/utils/abi.js";
import constants from "../src/utils/constants.js";
import { executeSpin } from "../src/services/spin.js";
import { executeClaim } from "../src/services/claim.js";
import {
  validateContractHealth,
  validateForClaim,
} from "../src/services/validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentRoot = path.resolve(__dirname, "..");
// Load root first, then agent – agent/.env wins (override any pre-existing env from shell/yarn)
dotenv.config({ path: path.resolve(agentRoot, "../../.env") });
dotenv.config({ path: path.join(agentRoot, ".env"), override: true });

const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const SLOT_MACHINE_ADDRESS = process.env.SLOT_MACHINE_ADDRESS;
const BASE_RPC = process.env.BASE_RPC || "https://mainnet.base.org";
const VRF_COORDINATOR =
  process.env.VRF_COORDINATOR || "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634";
const VRF_SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID;
const WHITELISTED_WALLET_PRIVATE_KEY =
  process.env.ACP_SELLER_WHITELISTED_WALLET_PRIVATE_KEY ||
  process.env.ACP_WHITELISTED_WALLET_PRIVATE_KEY; // legacy
const SELLER_ENTITY_ID = process.env.ACP_SELLER_ENTITY_ID;
const SELLER_AGENT_WALLET_ADDRESS = process.env.ACP_SELLER_AGENT_WALLET_ADDRESS;

const SPIN_AMOUNT = ethers.utils.parseUnits("1", 6);
const MIN_SUBSCRIPTION_NATIVE_WEI = ethers.utils.parseEther(
  String(
    process.env.VRF_MIN_NATIVE_ETH || constants.VRF_MIN_NATIVE_ETH_FOR_SPIN,
  ),
);
const MIN_SUBSCRIPTION_LINK_JUELS = process.env.MIN_SUBSCRIPTION_LINK_JUELS
  ? ethers.BigNumber.from(process.env.MIN_SUBSCRIPTION_LINK_JUELS)
  : ethers.utils.parseEther(String(constants.VRF_MIN_LINK_FOR_SPIN));

if (!EXECUTOR_PRIVATE_KEY || !SLOT_MACHINE_ADDRESS) {
  console.error(
    "[acp-seller] Missing EXECUTOR_PRIVATE_KEY or SLOT_MACHINE_ADDRESS",
  );
  process.exit(1);
}
if (
  !WHITELISTED_WALLET_PRIVATE_KEY ||
  !SELLER_ENTITY_ID ||
  !SELLER_AGENT_WALLET_ADDRESS
) {
  console.warn(
    "[acp-seller] ACP_* env vars not set – ACP seller disabled. Set ACP_SELLER_WHITELISTED_WALLET_PRIVATE_KEY, ACP_SELLER_ENTITY_ID, ACP_SELLER_AGENT_WALLET_ADDRESS to enable.",
  );
  process.exit(0);
}

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

/** Start ACP seller. No-op if env vars missing. */
export async function startAcpSeller() {
  let key = WHITELISTED_WALLET_PRIVATE_KEY.trim().replace(/^["']|["']$/g, "");
  if (!key.startsWith("0x")) key = `0x${key}`;

  const entityId = parseInt(String(SELLER_ENTITY_ID), 10);
  if (isNaN(entityId)) {
    throw new Error(`Invalid ACP_SELLER_ENTITY_ID: ${SELLER_ENTITY_ID}`);
  }
  console.log("[acp-seller] ACP_SELLER_ENTITY_ID:", entityId);
  const acpContractClient = await AcpContractClientV2.build(
    key,
    entityId,
    SELLER_AGENT_WALLET_ADDRESS,
  );

  const acpClient = new AcpClient({
    acpContractClient,
    onNewTask: async (job, memoToSign) => {
      if (
        job.phase === AcpJobPhases.REQUEST &&
        memoToSign?.nextPhase === AcpJobPhases.NEGOTIATION
      ) {
        const req = job.requirement || {};
        const isSpin = "player" in req;
        const isClaim = "user" in req;
        if (!isSpin && !isClaim) {
          await job.reject(
            "Requirement must include 'player' (spin) or 'user' (claim)",
          );
          return;
        }

        // Validate BEFORE accepting – reject early so buyer is never charged
        try {
          if (isSpin) {
            const player = req.player;
            if (
              !player ||
              typeof player !== "string" ||
              !ethers.utils.isAddress(player)
            ) {
              await job.reject("Invalid player address");
              return;
            }
            const health = await validateContractHealth(spinCtx);
            if (!health.ok) {
              await job.reject(
                `Contract unhealthy: ${health.errors.join("; ")}`,
              );
              return;
            }
          } else {
            const user = req.user;
            if (
              !user ||
              typeof user !== "string" ||
              !ethers.utils.isAddress(user)
            ) {
              await job.reject("Invalid user address");
              return;
            }
            const claimCheck = await validateForClaim(claimCtx, { user });
            if (!claimCheck.ok) {
              await job.reject(claimCheck.errors.join("; "));
              return;
            }
          }
        } catch (err) {
          console.error(`[acp-seller] Pre-accept validation failed:`, err);
          await job.reject(err.message || "Validation failed");
          return;
        }

        await job.accept("Lotero slot machine service");
        const price = isSpin ? "1.05" : "0.5";
        await job.createRequirement(`Pay ${price} USDC to proceed`);
        console.log(`[acp-seller] Job ${job.id} accepted`);
      } else if (
        job.phase === AcpJobPhases.TRANSACTION &&
        memoToSign?.nextPhase === AcpJobPhases.EVALUATION
      ) {
        const req = job.requirement || {};
        try {
          let result;
          if ("player" in req) {
            result = await executeSpin(spinCtx, {
              player: req.player,
              referral: req.referral ?? null,
            });
          } else if ("user" in req) {
            result = await executeClaim(claimCtx, { user: req.user });
          } else {
            void job.reject("Invalid requirement: need player or user");
            return;
          }
          await job.deliver({
            type: "json",
            value: JSON.stringify(result),
          });
          console.log(`[acp-seller] Job ${job.id} delivered`);
        } catch (err) {
          console.error(`[acp-seller] Job ${job.id} error:`, err.message);
          await job.reject(err.message);
        }
      }
    },
  });

  await acpClient.init();
  console.log("[acp-seller] ACP seller listening for jobs");
}

// Run when executed directly (e.g. node acp/seller.js or node packages/agent/acp/seller.js)
const scriptPath = process.argv[1]?.replace(/\\/g, "/") ?? "";
const isRunDirectly =
  scriptPath.endsWith("acp/seller.js") || scriptPath.includes("/acp/seller.js");
if (isRunDirectly) {
  startAcpSeller().catch((err) => {
    console.error("[acp-seller] Failed:", err.message);
    process.exit(1);
  });
}
