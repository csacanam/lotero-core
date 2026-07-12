---
name: lotero
description: Play a provably fair on-chain slot machine on Base. Pay 1.1 USDC per spin via x402 (no account, no API key), poll the result, and claim winnings gasless for 0.1 USDC. Randomness by Chainlink VRF 2.5, RTP ~93%, max win 30x.
metadata: {"api_base": "https://api.lotero.xyz", "payment": "x402", "currency": "USDC", "network": "eip155:8453", "homepage": "https://lotero.xyz"}
---

# Lotero

Provably fair on-chain slot machine on **Base mainnet**. You pay per spin via x402 (USDC on Base), the agent executes the bet on-chain for you (gasless), Chainlink VRF 2.5 generates the result, and you claim winnings with another x402 call. No account, no API key, no ETH needed.

**Base URL:** `https://api.lotero.xyz`
**Homepage:** `https://lotero.xyz`
**Contract:** `SlotMachineV2` — `0xC4b88e90a73fA9ec588E504255A43d4Ccb82edE9` (Base, verifiable on BaseScan)

**IMPORTANT — this is gambling.** The expected value of every spin is negative (RTP ~93%). Before playing:

1. Get your human's **explicit authorization and a budget** (e.g. "play at most 5 spins" or "spend at most 6 USDC").
2. **Never** loop spins autonomously without a hard stop condition.
3. Report results honestly after each spin — wins AND losses.
4. If your human hasn't asked to gamble, do not suggest it.

---

## Game rules

- Bet is fixed: **1 USDC per spin** (+0.1 USDC service fee = 1.1 USDC total via x402).
- Three reels; each shows a number 0–9 that maps to a symbol.
- **Three matching symbols win.** Payouts (on the 1 USDC bet):

| Reel numbers | Symbol | Payout |
|---|---|---|
| 0–4 | DOGE | 5× |
| 5–6 | BNB | 14× |
| 7–8 | ETH | 20× |
| 9 | BTC | 30× |

- Randomness: Chainlink VRF 2.5 — the result is generated on-chain and is verifiable; neither Lotero nor the player can manipulate it.
- Winnings accrue to the `player` address inside the contract; withdraw them with `/claim`.
- Optional referral: pass another address as `referral` and it earns 1% of your bets.

---

## Quick start

### Step 0 — Wallet setup

1. Use a **dedicated EVM wallet** for the agent (do NOT use your human's main wallet).
2. **NEVER display the private key in chat.** Write it directly to a `.env` file.
3. Ask your human to fund it with USDC on **Base** (1.1 USDC per spin + 0.1 per claim; no ETH needed — everything is gasless via x402).

| Network | Chain ID | USDC address |
|---|---|---|
| Base | `8453` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

Public RPC: `https://mainnet.base.org`

### Step 1 — Install

```bash
npm install @x402/fetch @x402/evm viem
```

### Step 2 — Spin, poll, claim

```js
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.PRIVATE_KEY);
const client = new x402Client();
registerExactEvmScheme(client, { signer });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// 1. Spin (pays 1.1 USDC via x402: 1 bet + 0.1 fee)
const res = await fetchWithPayment("https://api.lotero.xyz/spinWith1USDC", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ player: signer.address, referral: null }),
});
const { requestId } = await res.json();

// 2. Poll for the VRF result (free endpoint; resolves in seconds–minutes)
let result;
do {
  await new Promise((r) => setTimeout(r, 3000));
  const poll = await fetch(`https://api.lotero.xyz/round?requestId=${requestId}`);
  result = await poll.json();
} while (!result.resolved);
console.log(result.round); // { number1, number2, number3, hasWon, prize }

// 3. Claim accumulated winnings (pays 0.1 USDC via x402, gasless)
const balances = await fetch(`https://api.lotero.xyz/player/${signer.address}/balances`).then((r) => r.json());
if (Number(balances.moneyEarned) > Number(balances.moneyClaimed)) {
  await fetchWithPayment("https://api.lotero.xyz/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: signer.address }),
  });
}
```

**Async model:** `POST /spinWith1USDC` returns immediately with `status: "pending"` — Chainlink VRF resolves the round asynchronously. Always poll `GET /round` until `resolved: true`. Do not assume a spin lost because the first poll isn't resolved.

---

## Endpoints

### Paid (x402, USDC on Base)

| Endpoint | Price | Body | Returns |
|---|---|---|---|
| `POST /spinWith1USDC` | 1.1 USDC | `{ "player": "0x...", "referral": "0x..." \| null }` | `{ requestId, txHash, status: "pending" }` |
| `POST /claim` | 0.1 USDC | `{ "user": "0x..." }` | `{ user, amount, txHash, status: "claimed" }` |

Note: the x402 payer and the `player` can be different addresses. Wins and stats always belong to `player`.

### Free (read-only)

| Endpoint | Returns |
|---|---|
| `GET /` | Service descriptor (name, description, endpoints) |
| `GET /round?requestId=...` | `{ requestId, resolved, round: { number1, number2, number3, hasWon, prize } }` |
| `GET /player/:address/balances` | `moneyAdded`, `moneyEarned`, `moneyClaimed`, `earnedByReferrals`, `claimedByReferrals` |
| `GET /stats` | Global on-chain stats (volume, spins, revenue) |
| `GET /contract/health` | Executor balances, contract bankroll, VRF subscription status |

All USDC amounts in responses are in base units (6 decimals): `prize: "5000000"` = 5 USDC.

---

## How x402 works here (protocol level)

1. You POST to a paid endpoint without payment → `402` with a `PAYMENT-REQUIRED` header (base64 JSON) listing `accepts[]`: network `eip155:8453`, USDC asset, amount, `payTo`.
2. Your x402 client signs a `TransferWithAuthorization` (EIP-3009) — a gasless USDC authorization — and retries with the `X-PAYMENT` header.
3. The facilitator settles the payment on-chain; the Lotero agent then executes `playFor(player, referral, 1 USDC)` (or `claimPlayerEarnings`) on-chain, paying the gas itself.

Any x402-v2 compatible SDK works. If yours fails, parse the `PAYMENT-REQUIRED` header manually — see https://www.x402.org.

---

## Rate limits & errors

- Paid routes without a valid payment header: **10 req/min per IP** (you'll get the 402 challenge).
- Read-only routes: **60 req/min per IP**. Poll `/round` every ~3 seconds, not faster.

| Code | Meaning | What to do |
|---|---|---|
| `400` | Invalid body (bad address, missing player) | Fix the field named in the error and retry. |
| `402` | Payment required / payment failed | Your x402 SDK should handle this. If it persists, check USDC balance on Base. |
| `429` | Rate limited | Back off and retry after a minute. |
| `500` | Execution error (e.g. contract paused, bankroll issue) | Check `GET /contract/health`; retry once; report if it persists. |

---

## Verify fairness (optional, free)

Every spin is an on-chain transaction (`txHash` in the response). Your human can verify on BaseScan that the result came from Chainlink VRF: contract `0xC4b88e90a73fA9ec588E504255A43d4Ccb82edE9`, events `SpinRequested` → `SpinResolved`. The reel model and RTP math are public: https://github.com/csacanam/lotero-core.
