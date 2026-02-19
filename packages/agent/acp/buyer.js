/**
 * ACP Buyer – Lotero Agent
 *
 * Initiates spin or claim jobs against the Lotero ACP seller.
 * Uses x402 for payment routing.
 *
 * Usage:
 *   node acp/buyer.js spin <playerAddress> [referralAddress]
 *   node acp/buyer.js claim <userAddress>
 *
 * Env: ACP_BUYER_WHITELISTED_WALLET_PRIVATE_KEY, ACP_BUYER_ENTITY_ID, ACP_BUYER_AGENT_WALLET_ADDRESS
 *      ACP_TARGET_AGENT_KEYWORD (default: "lotero"), BASE_RPC (optional – Alchemy/etc to avoid rate limits)
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import acpNode from "@virtuals-protocol/acp-node";
import {
  AcpContractClientV2,
  AcpJobPhases,
  AcpAgentSort,
  AcpGraduationStatus,
  AcpOnlineStatus,
  baseAcpX402ConfigV2,
} from "@virtuals-protocol/acp-node";

const AcpClient = acpNode?.default ?? acpNode;
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(agentRoot, "../../.env") });
dotenv.config({ path: path.join(agentRoot, ".env"), override: true });

const WHITELISTED_WALLET_PRIVATE_KEY =
  process.env.ACP_BUYER_WHITELISTED_WALLET_PRIVATE_KEY ||
  process.env.ACP_WHITELISTED_WALLET_PRIVATE_KEY; // legacy
const BUYER_ENTITY_ID = process.env.ACP_BUYER_ENTITY_ID;
const BUYER_AGENT_WALLET_ADDRESS =
  process.env.ACP_BUYER_AGENT_WALLET_ADDRESS;
const TARGET_AGENT_KEYWORD =
  process.env.ACP_TARGET_AGENT_KEYWORD || "lotero";
const SELLER_AGENT_WALLET = process.env.ACP_SELLER_AGENT_WALLET_ADDRESS
  ? process.env.ACP_SELLER_AGENT_WALLET_ADDRESS.trim().toLowerCase()
  : null;
// ACP_BUYER_DEBUG=1: only discover agent, skip job execution (debug agent finding)
const DEBUG_AGENT_DISCOVERY =
  process.env.ACP_BUYER_DEBUG === "1" || process.env.ACP_BUYER_DEBUG === "true";

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: node acp/buyer.js spin <playerAddress> [referralAddress]"
    );
    console.error("       node acp/buyer.js claim <userAddress>");
    process.exit(1);
  }
  const action = args[0].toLowerCase();
  if (action !== "spin" && action !== "claim") {
    console.error("Action must be 'spin' or 'claim'");
    process.exit(1);
  }
  const addr = args[1];
  const referral = args[2] || null;
  if (!ethers.utils.isAddress(addr)) {
    console.error(`Invalid address: ${addr}`);
    process.exit(1);
  }
  if (referral && !ethers.utils.isAddress(referral)) {
    console.error(`Invalid referral address: ${referral}`);
    process.exit(1);
  }
  return { action, addr, referral };
}

/** Run ACP buyer: browse seller, initiate job, handle payment/completion. */
export async function runAcpBuyer() {
  const { action, addr, referral } = parseArgs();

  if (
    !WHITELISTED_WALLET_PRIVATE_KEY ||
    !BUYER_ENTITY_ID ||
    !BUYER_AGENT_WALLET_ADDRESS
  ) {
    console.error(
      "[acp-buyer] Missing ACP_BUYER_* env vars. Set ACP_BUYER_WHITELISTED_WALLET_PRIVATE_KEY, ACP_BUYER_ENTITY_ID, ACP_BUYER_AGENT_WALLET_ADDRESS."
    );
    process.exit(1);
  }

  let key = WHITELISTED_WALLET_PRIVATE_KEY.trim().replace(/^["']|["']$/g, "");
  if (!key.startsWith("0x")) key = `0x${key}`;

  const entityId = parseInt(BUYER_ENTITY_ID, 10);
  if (isNaN(entityId)) {
    console.error("[acp-buyer] ACP_BUYER_ENTITY_ID must be a valid number");
    process.exit(1);
  }

  // Only override rpcEndpoint for public reads (avoids rate limit). Keep alchemyRpcUrl as default
  // (Virtuals proxy) – policy 186aaa4a... requires Virtuals' Alchemy app, not custom key.
  const baseRpc = process.env.BASE_RPC?.trim();
  const acpConfig = baseRpc
    ? { ...baseAcpX402ConfigV2, rpcEndpoint: baseRpc }
    : baseAcpX402ConfigV2;

  const acpContractClient = await AcpContractClientV2.build(
    key,
    entityId,
    BUYER_AGENT_WALLET_ADDRESS,
    acpConfig
  );

  const paidJobIds = new Set();
  const signedRejectionIds = new Set();

  const acpClient = new AcpClient({
    acpContractClient,
    onNewTask: async (job, memoToSign) => {
      if (
        job.phase === AcpJobPhases.NEGOTIATION &&
        memoToSign?.nextPhase === AcpJobPhases.TRANSACTION
      ) {
        if (paidJobIds.has(job.id)) {
          console.log(`[acp-buyer] Job ${job.id} already paid, skipping`);
          return;
        }
        paidJobIds.add(job.id);
        console.log(`[acp-buyer] Paying for job ${job.id}`);
        await job.payAndAcceptRequirement();
        console.log(`[acp-buyer] Job ${job.id} paid`);
      } else if (
        job.phase === AcpJobPhases.TRANSACTION &&
        memoToSign?.nextPhase === AcpJobPhases.REJECTED
      ) {
        if (signedRejectionIds.has(job.id)) {
          console.log(`[acp-buyer] Job ${job.id} rejection already signed, skipping`);
          return;
        }
        signedRejectionIds.add(job.id);
        console.log(
          `[acp-buyer] Signing job ${job.id} rejection memo, reason: ${memoToSign?.content ?? "N/A"}`
        );
        await memoToSign?.sign(true, "Accepts job rejection");
        console.log(`[acp-buyer] Job ${job.id} rejection memo signed`);
      } else if (job.phase === AcpJobPhases.COMPLETED) {
        console.log(
          `[acp-buyer] Job ${job.id} completed, deliverable:`,
          job.deliverable
        );
      } else if (job.phase === AcpJobPhases.REJECTED) {
        console.log(`[acp-buyer] Job ${job.id} rejected by seller`);
      }
    },
  });

  await acpClient.init();
  console.log(`[acp-buyer] Browsing agents for "${TARGET_AGENT_KEYWORD}"...`);

  const agents = await acpClient.browseAgents(TARGET_AGENT_KEYWORD, {
    sortBy: [AcpAgentSort.SUCCESSFUL_JOB_COUNT],
    topK: 10,
    graduationStatus: AcpGraduationStatus.ALL,
    onlineStatus: AcpOnlineStatus.ALL,
    showHiddenOfferings: true,
  });

  // Debug: show all agents found
  console.log(`[acp-buyer] Found ${agents.length} agent(s) for "${TARGET_AGENT_KEYWORD}":`);
  agents.forEach((a, i) => {
    const wallet = a.walletAddress || "(no wallet)";
    const isOurSeller = SELLER_AGENT_WALLET && wallet.toLowerCase() === SELLER_AGENT_WALLET;
    console.log(`  [${i}] id=${a.id} name="${a.name}" wallet=${wallet}${isOurSeller ? " <- YOUR LOTERO SELLER" : ""}`);
  });

  let chosenAgent;
  if (SELLER_AGENT_WALLET) {
    chosenAgent = agents.find(
      (a) => a.walletAddress?.toLowerCase() === SELLER_AGENT_WALLET
    );
    if (!chosenAgent) {
      console.error(
        `[acp-buyer] Your seller (wallet ${SELLER_AGENT_WALLET}) NOT in results. ` +
          `Try different ACP_TARGET_AGENT_KEYWORD or ensure Lotero is discoverable in Virtuals.`
      );
      process.exit(1);
    }
    console.log(`[acp-buyer] Using your Lotero seller: id=${chosenAgent.id} name="${chosenAgent.name}"`);
  } else {
    chosenAgent = agents[0];
    console.log(`[acp-buyer] ACP_SELLER_AGENT_WALLET_ADDRESS not set, using first result: id=${chosenAgent?.id} name="${chosenAgent?.name}"`);
  }

  if (!chosenAgent || !chosenAgent.jobOfferings?.length) {
    console.error(
      "[acp-buyer] No agent or job offering found. Register your seller at app.virtuals.io/acp/join"
    );
    process.exit(1);
  }

  console.log(`[acp-buyer] Agent found. Job offerings: ${chosenAgent.jobOfferings.length}`);
  chosenAgent.jobOfferings.forEach((o, i) => {
    console.log(`  [${i}] ${o.name} price=${o.price}`);
  });

  if (DEBUG_AGENT_DISCOVERY) {
    console.log("[acp-buyer] DEBUG mode: skipping job initiation. Set ACP_BUYER_DEBUG=0 to run jobs.");
    return;
  }

  const offeringForSpin = chosenAgent.jobOfferings.find((o) =>
    /spin/i.test(o.name || "")
  );
  const offeringForClaim = chosenAgent.jobOfferings.find((o) =>
    /claim/i.test(o.name || "")
  );
  const offering = action === "spin" ? offeringForSpin : offeringForClaim;

  if (!offering) {
    console.error(
      `[acp-buyer] No ${action} offering found. Available: ${chosenAgent.jobOfferings.map((o) => o.name).join(", ")}`
    );
    process.exit(1);
  }

  const requirement =
    action === "spin"
      ? { player: addr, referral: referral ?? undefined }
      : { user: addr };

  console.log(
    `[acp-buyer] Initiating ${action} job with requirement:`,
    JSON.stringify(requirement)
  );
  try {
    const jobId = await offering.initiateJob(requirement, undefined);
    console.log(`[acp-buyer] Job ${jobId} initiated. Waiting for payment/completion...`);
  } catch (err) {
    console.error("[acp-buyer] initiateJob failed:", err.message);
    if (err.stack) console.error("[acp-buyer] stack (see 'Caused by' for root error):\n", err.stack);
    console.error(
      "[acp-buyer] Tip: Ensure buyer agent wallet has ETH on Base for gas and is funded in app.virtuals.io/acp"
    );
    throw err;
  }
}

// Run when executed directly
const scriptPath = process.argv[1]?.replace(/\\/g, "/") ?? "";
const isRunDirectly =
  scriptPath.endsWith("acp/buyer.js") || scriptPath.includes("/acp/buyer.js");
if (isRunDirectly) {
  runAcpBuyer().catch((err) => {
    console.error("[acp-buyer] Failed:", err.message);
    process.exit(1);
  });
}
