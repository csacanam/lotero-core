#!/usr/bin/env node
/**
 * Lotero MCP server — provably fair on-chain slot machine (Base + Chainlink VRF).
 *
 * Tools:
 *   - spin           (paid, 1.1 USDC via x402)  → execute a spin for the player
 *   - get_round      (free)                     → VRF result by requestId (+ stuck diagnosis)
 *   - get_balances   (free)                     → player earnings / claims / referrals
 *   - claim          (paid, 0.1 USDC via x402)  → withdraw ALL accumulated winnings to the player
 *   - get_contract_health (free)                → bankroll + VRF subscription status
 *
 * Responsible-gambling guardrails (enforced, not just documented):
 *   - Session spin limit: LOTERO_MAX_SPINS_PER_SESSION (default 10). When reached,
 *     `spin` refuses until the human raises the limit and the server is restarted.
 *   - Tool descriptions require explicit human authorization + budget before playing.
 *
 * Config (env):
 *   LOTERO_WALLET_PRIVATE_KEY     EVM key with USDC on Base — pays spins/claims via x402 (never logged)
 *   LOTERO_PLAYER_ADDRESS         default `player`: use the HUMAN's wallet so winnings land there
 *   LOTERO_MAX_SPINS_PER_SESSION  default 10
 *   LOTERO_API_BASE               default https://api.lotero.xyz
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.LOTERO_API_BASE || "https://api.lotero.xyz";
const DEFAULT_PLAYER = process.env.LOTERO_PLAYER_ADDRESS || null;
const MAX_SPINS = Math.max(1, Number(process.env.LOTERO_MAX_SPINS_PER_SESSION) || 10);

let spinsThisSession = 0;

// ---------------------------------------------------------------- payment
let paidFetch = null;

async function getPaidFetch() {
  if (paidFetch) return paidFetch;
  const pk = process.env.LOTERO_WALLET_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "LOTERO_WALLET_PRIVATE_KEY not set. Use a dedicated wallet funded with USDC on Base (1.1 USDC per spin + 0.1 for the final claim). Never use the human's main wallet.",
    );
  }
  const { wrapFetchWithPaymentFromConfig } = await import("@x402/fetch");
  const { ExactEvmScheme } = await import("@x402/evm");
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(account) }],
  });
  return paidFetch;
}

// ---------------------------------------------------------------- helpers
function text(t) {
  return { content: [{ type: "text", text: typeof t === "string" ? t : JSON.stringify(t, null, 2) }] };
}

function errorText(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function resolvePlayer(player) {
  const p = player || DEFAULT_PLAYER;
  if (!p) {
    throw new Error(
      "No player address. Pass `player` or set LOTERO_PLAYER_ADDRESS. Use the HUMAN's wallet address — winnings accrue to the player and `claim` sends the USDC there.",
    );
  }
  return p;
}

// ---------------------------------------------------------------- server
const server = new McpServer({ name: "lotero", version: "0.1.0" });

server.tool(
  "spin",
  "Execute one slot-machine spin — COSTS 1.1 USDC (1 bet + 0.1 fee) via x402, paid by the configured wallet. GAMBLING with negative expected value (RTP ~93%): require the human's explicit authorization and budget BEFORE calling, report every result honestly, and never loop spins to 'chase' a win. `player` should be the HUMAN's wallet (winnings accrue and get claimed there). Returns a requestId — the result is async (Chainlink VRF): poll get_round until resolved.",
  {
    player: z.string().optional().describe("Player wallet — the human's address (defaults to LOTERO_PLAYER_ADDRESS)"),
    referral: z.string().optional().describe("Optional referral address (earns 1% of bets)"),
  },
  async ({ player, referral }) => {
    if (spinsThisSession >= MAX_SPINS) {
      return errorText(
        `Session spin limit reached (${spinsThisSession}/${MAX_SPINS}). This is a responsible-gambling guardrail. If your human explicitly wants more, they must raise LOTERO_MAX_SPINS_PER_SESSION and restart the MCP server.`,
      );
    }
    let p, doFetch;
    try {
      p = resolvePlayer(player);
      doFetch = await getPaidFetch();
    } catch (e) {
      return errorText(e.message);
    }
    const res = await doFetch(`${API_BASE}/spinWith1USDC`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: p, referral: referral || null }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return errorText(
        `HTTP ${res.status}: ${body.error || "spin failed"}${body.paymentNote ? `\n${body.paymentNote}` : ""}`,
      );
    }
    spinsThisSession += 1;
    return text({
      ...body,
      spins_this_session: `${spinsThisSession}/${MAX_SPINS}`,
      next_step: "Poll get_round with this requestId every ~3s until resolved (VRF takes seconds to minutes).",
    });
  },
);

server.tool(
  "get_round",
  "Get a spin's result by requestId. Free. resolved=false means Chainlink VRF hasn't delivered yet — poll every ~3s; if still unresolved after ~10 minutes check the `pending.vrfSubscriptionFunded` flag in the response (the requestId never expires; re-poll later, never re-spin to replace a pending round). Reels: 0-4 DOGE (5x), 5-6 BNB (14x), 7-8 ETH (20x), 9 BTC (30x); three matching symbols win; prize is in USDC base units (6 decimals).",
  { request_id: z.string().describe("requestId returned by spin") },
  async ({ request_id }) => {
    const res = await fetch(`${API_BASE}/round?requestId=${encodeURIComponent(request_id)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return errorText(`HTTP ${res.status}: ${body.error || "request failed"}`);
    return text(body);
  },
);

server.tool(
  "get_balances",
  "Player balances: moneyAdded, moneyEarned, moneyClaimed, earnedByReferrals, claimedByReferrals (USDC base units, 6 decimals). Free. Claimable = moneyEarned - moneyClaimed. Check before claiming to avoid paying for an empty claim.",
  { player: z.string().optional().describe("Player wallet (defaults to LOTERO_PLAYER_ADDRESS)") },
  async ({ player }) => {
    let p;
    try {
      p = resolvePlayer(player);
    } catch (e) {
      return errorText(e.message);
    }
    const res = await fetch(`${API_BASE}/player/${encodeURIComponent(p)}/balances`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return errorText(`HTTP ${res.status}: ${body.error || "request failed"}`);
    return text(body);
  },
);

server.tool(
  "claim",
  "Withdraw ALL accumulated winnings (wins + referral earnings) to the player's wallet — COSTS 0.1 USDC via x402, gasless for the player. The fee is flat and the claim withdraws everything, so claim ONCE at the end of the session, not after each win. Check get_balances first (claimable must be > 0).",
  { player: z.string().optional().describe("Player wallet to claim for (defaults to LOTERO_PLAYER_ADDRESS)") },
  async ({ player }) => {
    let p, doFetch;
    try {
      p = resolvePlayer(player);
      doFetch = await getPaidFetch();
    } catch (e) {
      return errorText(e.message);
    }
    const res = await doFetch(`${API_BASE}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: p }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return errorText(
        `HTTP ${res.status}: ${body.error || "claim failed"}${body.paymentNote ? `\n${body.paymentNote}` : ""}`,
      );
    }
    return text(body);
  },
);

server.tool(
  "get_contract_health",
  "System status: executor ETH/USDC balances, contract bankroll, VRF subscription funding. Free. Use to diagnose stuck rounds or before a session (if the contract is unhealthy, don't spin).",
  {},
  async () => {
    const res = await fetch(`${API_BASE}/contract/health`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return errorText(`HTTP ${res.status}: ${body.error || "request failed"}`);
    return text(body);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
