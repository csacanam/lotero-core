# Lotero Agent – API Reference

REST API and configuration for the Lotero Agent. See [packages/agent/README.md](../packages/agent/README.md) for setup and [AGENT_FLOWS.md](AGENT_FLOWS.md) for flow diagrams.

---

## Pricing

| Service | Price | Breakdown |
|---------|-------|-----------|
| `spinWith1USDC` | 1.1 USDC | 1.00 bet + 0.1 fee (gas + VRF + service) |
| `claim` | 0.1 USDC | Fee for gasless earnings withdrawal |

---

## Endpoints

### POST /spinWith1USDC (Paid, 1.1 USDC)

Execute one slot spin for a player. Gasless for caller — executor pays gas and bet.

**Request body:**

```json
{
  "player": "0x...",
  "referral": "0x..." | null
}
```

**Response:**

```json
{
  "requestId": "123",
  "txHash": "0x...",
  "status": "pending"
}
```

---

### POST /claim (Paid, 0.1 USDC)

Claim player earnings (winnings + referral income). Gasless — executor pays gas.

**Request body:**

```json
{
  "user": "0x..."
}
```

**Response (success):**

```json
{
  "user": "0x...",
  "amount": "14000000",
  "txHash": "0x...",
  "status": "claimed"
}
```

**Error (400):** `{ "error": "Nothing to claim", "details": "User has already claimed all earnings" }`

---

### GET /round (Free)

Round result by VRF `requestId`. Query parameter: `requestId`.

Example: `GET /round?requestId=123`

Returns `number1`, `number2`, `number3` (reel indices). See [Reading round results](#reading-round-results).

**Response:**

```json
{
  "requestId": "123",
  "resolved": true,
  "round": {
    "userAddress": "0x...",
    "number1": "5",
    "number2": "6",
    "number3": "6",
    "value": "1000000",
    "hasWon": true,
    "prize": "14000000"
  }
}
```

---

### GET /player/:address/balances (Free)

Player balances and referral stats.

**Response:**

```json
{
  "address": "0x...",
  "moneyAdded": "0",
  "moneyEarned": "14000000",
  "moneyClaimed": "0",
  "earnedByReferrals": "0",
  "claimedByReferrals": "0"
}
```

---

### GET /stats (Free)

Public on-chain stats. All values are derived from SlotMachineV2 contract state — verifiable on BaseScan. Designed for dashboards, build-in-public, and external integrations.

**Response:**

```json
{
  "totalSpins": 150,
  "totalVolumeUSDC": 150,
  "contractOpen": true,
  "bankrollUSDC": 85.5,
  "revenue": {
    "devFeesUSDC": 7.5,
    "devFeesClaimed": 5.0,
    "devFeesPending": 2.5,
    "houseEdgeUSDC": 12.3,
    "estimatedX402FeesUSDC": 15.0,
    "totalRevenueUSDC": 34.8
  },
  "players": {
    "totalEarnedUSDC": 120.0,
    "totalClaimedUSDC": 100.0,
    "pendingUSDC": 20.0
  },
  "referrals": {
    "totalEarnedUSDC": 10.2,
    "totalClaimedUSDC": 8.0,
    "pendingUSDC": 2.2
  }
}
```

| Field | Source | Description |
|-------|--------|-------------|
| `totalSpins` | `totalMoneyAdded / 1 USDC` | Total spins played (all time) |
| `totalVolumeUSDC` | `totalMoneyAdded` | Total USDC bet |
| `revenue.devFeesUSDC` | `totalMoneyEarnedByDevs` | 5% of every bet, on-chain |
| `revenue.houseEdgeUSDC` | Derived | Volume - player prizes - dev fees - referral fees |
| `revenue.estimatedX402FeesUSDC` | `totalSpins × 0.1` | Off-chain estimate (x402 fees are not tracked on-chain) |
| `revenue.totalRevenueUSDC` | Sum | Dev fees + house edge + x402 fees |

---

### GET /contract/health (Free)

Contract bankroll, max bet, open/closed, executor balance, VRF subscription (if configured).

**Response:**

```json
{
  "bankroll": "100000000",
  "maxBetSafe": "5000000",
  "contractOpen": true,
  "executorEthBalance": "10000000000000000",
  "executorEthSufficient": true,
  "useNativePayment": true,
  "vrfSubscription": {
    "linkBalance": "0",
    "nativeBalance": "500000000000000000",
    "balanceType": "native",
    "sufficient": true
  }
}
```

`vrfSubscription` only present when `VRF_SUBSCRIPTION_ID` is set.

---

### GET /cron/health (Free, rate-limited)

Full system status for the Ops Agent. Returns wallet, contract, VRF state and may execute USDC transfer, dev fee claim, and Telegram alerts. See [AGENT_FLOWS.md](AGENT_FLOWS.md) for the detailed flow.

---

### GET / (Free)

Service info and list of endpoints.

---

## Wallet Roles

The system uses several wallets with distinct roles. They are split into two groups: the core Lotero Agent wallets (required to run the casino) and the ACP wallets (only needed for Virtuals Agent Commerce Protocol integration).

### Lotero Agent

```
┌─────────────┐   x402 payment   ┌──────────────┐   playFor / claim   ┌───────────────┐
│   Client /   │ ───────────────► │   Executor   │ ──────────────────► │ SlotMachineV2 │
│   Frontend   │                  │   Wallet     │   (gas ETH + bet)   │   (contract)  │
└─────────────┘                  └──────────────┘                     └───────────────┘
                                   │  = PAY_TO (receives x402 USDC)
                                   │  Cron auto top-up: wallet → contract
                                   │  Cron dev claim: contract → wallet
```

| Wallet | Env variable | Role | Funds needed | Cron monitoring |
|--------|-------------|------|--------------|-----------------|
| **Executor** | `EXECUTOR_PRIVATE_KEY` | Signs all on-chain transactions (spins, claims, top-ups, dev claims). Pays gas and bets. | ETH (gas) + USDC (bets + buffer) | **ETH**: CRITICAL alert if < 0.01, target 0.05. **USDC**: INFO alert if < 10, auto top-up contract when excess > 5. Auto dev claim when pending >= 5. |
| **Pay To** | `PAY_TO` | Address that receives x402 payments from clients. Typically the same address as Executor. | — (receives USDC) | Included in Executor monitoring (same wallet) |
| **Payer** | `PAYER_PRIVATE_KEY` | Test-only wallet used by `spin-paid.js` and `claim-paid.js` scripts to simulate a paying client. Not used in production. | USDC (to pay x402 in test scripts) | None |

Additionally, the cron monitors these non-wallet resources:

| Resource | Cron monitoring |
|----------|-----------------|
| **Contract bankroll** | CRITICAL alert + auto top-up if bankroll < 60 USDC or contract closed. Target: 90 USDC. |
| **VRF subscription** | WARNING alert if LINK < 0.31 (or native ETH low). No auto-action — manual top-up required. |

> **In practice**, Executor and Pay To are usually the same wallet. The Payer is a separate wallet only used for testing.

### ACP (Virtuals Agent Commerce Protocol)

These wallets are only needed when running the ACP seller or buyer integrations (`acp:seller`, `acp:buyer`). They are independent from the Lotero Agent wallets above.

| Wallet | Env variable | Role | Funds needed | Cron monitoring |
|--------|-------------|------|--------------|-----------------|
| **Seller Whitelisted** | `ACP_SELLER_WHITELISTED_WALLET_PRIVATE_KEY` | Signs ACP transactions for the seller agent. Registered at [app.virtuals.io/acp/join](https://app.virtuals.io/acp/join). | VIRTUAL (ACP gas on Base) | None |
| **Seller Agent** | `ACP_SELLER_AGENT_WALLET_ADDRESS` | Public address of the seller agent in ACP. | — | USDC balance shown in hourly status report (read-only) |
| **Buyer Whitelisted** | `ACP_BUYER_WHITELISTED_WALLET_PRIVATE_KEY` | Signs ACP transactions for the buyer agent. | VIRTUAL (ACP gas on Base) | None |
| **Buyer Agent** | `ACP_BUYER_AGENT_WALLET_ADDRESS` | Public address of the buyer agent in ACP. | — | None |

> **Note:** ACP wallets are not actively monitored. If the Seller or Buyer Whitelisted wallets run out of gas (VIRTUAL), there will be no alert. The Seller Agent USDC balance is only displayed in the hourly status report when `CRON_STATUS_REPORT=true`.

---

## Revenue Flow

All revenue flows into the **Executor wallet**. There are two income sources and two cost categories:

### Income

```
Executor Wallet (PAY_TO)
├── x402 service fee ............. 0.1 USDC per spin (immediate, paid by client)
├── x402 claim fee ............... 0.1 USDC per claim (immediate, paid by client)
└── Dev fee (5% of each bet) ..... auto-claimed by cron when pending >= 5 USDC
```

- **x402 fees** land directly in the Executor wallet when a client pays for a spin or claim. These are not tracked on-chain — they are standard USDC transfers via the CDP facilitator.
- **Dev fees** accumulate inside the SlotMachineV2 contract (5% of every 1 USDC bet = 0.05 USDC per spin). The cron auto-claims them to the Executor wallet and sends a Telegram alert ("DEV FEES WITHDRAWN").

### Costs

```
Executor Wallet
├── Gas (ETH) .................... ~0.0001–0.001 ETH per tx (spin, claim, top-up)
└── Bet capital .................. 1 USDC per spin (sent to contract via playFor)
```

- **Bet capital** is not a loss — it stays in the contract bankroll. When players lose, the USDC remains in the contract. The cron recycles it: dev fees are claimed back, and the bankroll is maintained at the target level (90 USDC).
- **Gas** is the real operational cost. On Base L2, gas is very cheap (~$0.001 per tx).

### Net revenue per spin

| Component | Amount | Type |
|-----------|--------|------|
| x402 service fee | +0.1 USDC | Immediate income |
| Dev fee (5% of 1 USDC bet) | +0.05 USDC | Accumulated, auto-claimed |
| Gas cost | ~-0.001 USDC | Operational cost |
| **Net per spin** | **~0.149 USDC** | |

### How to know when you can withdraw profits

The Executor wallet mixes operational capital (buffer for bets + gas) with profits. To know your available profit:

```
Profit available = Executor USDC balance - operational buffer (target: 20 USDC)
```

If the Executor wallet has 50 USDC and the target buffer is 20, you can safely withdraw ~30 USDC. The cron will alert you if the buffer drops below 10 USDC.

**Withdraw how?** Simply transfer USDC out of the Executor wallet to your personal wallet using any Base-compatible wallet (e.g. MetaMask, Coinbase Wallet). The Executor private key is in your `.env`.

### Tracking revenue on-chain (for build-in-public)

The SlotMachineV2 contract exposes public read functions that give you all-time revenue stats:

| Contract function | What it tells you |
|-------------------|-------------------|
| `totalMoneyAdded` | Total USDC bet by all players (number of spins × 1 USDC) |
| `totalMoneyEarnedByDevs` | Total dev fees accumulated (5% of totalMoneyAdded) |
| `totalMoneyClaimedByDevs` | Dev fees already withdrawn to Executor |
| `totalMoneyEarnedByPlayers` | Total prizes won by players |
| `totalMoneyClaimedByPlayers` | Prizes already claimed by players |
| `totalMoneyEarnedByReferrals` | Total referral commissions earned |
| `totalMoneyClaimedByReferrals` | Referral commissions already claimed |
| `getMoneyInContract()` | Current USDC in contract |
| `getCurrentDebt()` | Unclaimed player + dev + referral earnings |

**Key metrics you can derive:**

```
Total spins         = totalMoneyAdded / 1 USDC
Dev revenue         = totalMoneyEarnedByDevs (on-chain, verifiable)
x402 revenue        = totalSpins × 0.1 USDC (off-chain, estimated from spin count)
House edge profit   = totalMoneyAdded - totalMoneyEarnedByPlayers - totalMoneyEarnedByDevs - totalMoneyEarnedByReferrals
Total revenue       = Dev fees + x402 fees + house edge profit
```

All of these are readable via BaseScan or by calling the contract directly. For a public dashboard, you could read these values periodically and display them.

---

## Environment

See [packages/agent/.env.example](../packages/agent/.env.example) for the full list. Summary:

| Variable | Required | Description |
|----------|----------|-------------|
| `SLOT_MACHINE_ADDRESS` | Yes | SlotMachineV2 contract on Base |
| `EXECUTOR_PRIVATE_KEY` | Yes | Executor wallet (signs tx, pays gas and bet) |
| `PAY_TO` | Yes | Receives x402 payments |
| `CDP_API_KEY_ID` | Yes* | For CDP facilitator. [Create at CDP](https://portal.cdp.coinbase.com/projects/api-keys) |
| `CDP_API_KEY_SECRET` | Yes* | Secret of the CDP API Key |
| `BASE_RPC` | No | Default: `https://mainnet.base.org` |
| `FACILITATOR_URL` | No | Default: `https://api.cdp.coinbase.com/platform/v2/x402` |
| `PORT` | No | Default: 4021 |
| `VRF_SUBSCRIPTION_ID` | No | VRF subscription ID (enables balance check before spin) |
| `VRF_COORDINATOR` | No | Default: Base mainnet coordinator |
| `VRF_MIN_NATIVE_ETH` | No | Override min ETH in VRF subscription (default from constants: 0.001) |
| `MIN_SUBSCRIPTION_LINK_JUELS` | No | Override min LINK in juels (default from constants: 0.3 LINK) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 60000) |
| `RATE_LIMIT_MAX` | No | Max requests per IP for read-only endpoints (default: 60) |
| `RATE_LIMIT_NO_PAYMENT_MAX` | No | Max requests per IP for paid routes without payment header (default: 10) |
| `PAYER_PRIVATE_KEY` | No | For paid scripts: wallet that pays x402 (needs USDC) |
| `TELEGRAM_BOT_TOKEN` | No | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | No | Chat ID (from [@userinfobot](https://t.me/userinfobot)) |
| `CRON_STATUS_REPORT` | No | `true` to send hourly status report via Telegram |
| `CRON_STATUS_AGENT_WALLET` | No | Agent wallet address to show in status report (falls back to `ACP_SELLER_AGENT_WALLET_ADDRESS`) |

*Required when using Coinbase facilitator (mainnet default).

**ACP variables** (only for Virtuals Agent Commerce Protocol, see [Wallet Roles](#wallet-roles)):

| Variable | Required | Description |
|----------|----------|-------------|
| `ACP_SELLER_WHITELISTED_WALLET_PRIVATE_KEY` | For acp:seller | Seller signer wallet (registered at app.virtuals.io) |
| `ACP_SELLER_ENTITY_ID` | For acp:seller | Seller entity ID from ACP |
| `ACP_SELLER_AGENT_WALLET_ADDRESS` | For acp:seller | Seller agent public address |
| `ACP_BUYER_WHITELISTED_WALLET_PRIVATE_KEY` | For acp:buyer | Buyer signer wallet |
| `ACP_BUYER_ENTITY_ID` | For acp:buyer | Buyer entity ID from ACP |
| `ACP_BUYER_AGENT_WALLET_ADDRESS` | For acp:buyer | Buyer agent public address |
| `ACP_TARGET_AGENT_KEYWORD` | No | Keyword to discover seller (default: `lotero`) |
| `ACP_BUYER_DEBUG` | No | `1` to only discover agent without executing (debug mode) |

**Optional but commonly set:** These have defaults, but you'll often set them for your setup:
- `BASE_RPC` — Use Alchemy/Infura if you need better reliability than the public RPC
- `VRF_SUBSCRIPTION_ID` — Required for VRF balance validation before spins
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — Required for Ops Agent alerts
- `PAYER_PRIVATE_KEY` — Required for `spin-paid.js` and `claim-paid.js` test scripts
- `PORT` — If 4021 is already in use

---

## Constants (utils/constants.js)

Thresholds for validation and cron logic. Modify there to change triggers:

| Constant | Value | Purpose |
|----------|-------|---------|
| `CONTRACT_MIN_AVAILABLE_BANKROLL_USDC` | 30 | Min bankroll to allow spins (pay max prize) |
| `EXECUTOR_MIN_USDC_FOR_SPIN` | 1 | Min USDC in executor to execute a spin |
| `EXECUTOR_MIN_ETH_TRIGGER` | 0.001 | Min ETH for gas (spin/claim validation) |
| `CONTRACT_TOPUP_TRIGGER_BANKROLL_USDC` | 60 | Bankroll below → cron auto top-up (step 3) |
| `CONTRACT_TARGET_BANKROLL_USDC` | 90 | Target bankroll, transfers capped at this |
| `WALLET_EXCESS_MIN_FOR_CONTRACT_USDC` | 5 | Min wallet excess for any transfer to contract (steps 3 & 5) |
| `DEV_CLAIM_MIN_USDC` | 5 | Cron claims dev fees when pending ≥ this |
| `WALLET_MIN_ETH_TRIGGER` | 0.01 | ETH below → Telegram CRITICAL |
| `WALLET_MIN_USDC_BUFFER` | 10 | USDC below → Telegram INFO; min to keep when topping up |
| `VRF_MIN_LINK_TRIGGER` | 0.31 | LINK below → Telegram WARNING |

---

## Rate limiting

- **Read-only** endpoints: 60 req/min per IP (configurable).
- **Paid routes** (`POST /spinWith1USDC`, `POST /claim`) **without** x402 payment header: 10 req/min per IP. Returns 402 with payment instructions.

---

## Executor requirements

- **ETH** on Base for gas
- **USDC** float: executor spends 1 USDC per spin (`transferFrom` to contract)
- **Approval**: SlotMachineV2 must be approved to spend executor's USDC (auto on startup)

---

## Reading round results

`GET /round?requestId=...` returns `number1`, `number2`, `number3` — **reel indices (0–9)**. Map to symbols:

| Index | Symbol |
|-------|--------|
| 0–4   | DOGE   |
| 5–6   | BNB    |
| 7–8   | ETH    |
| 9     | BTC    |

Example: `number1: 5, number2: 6, number3: 6` → BNB, BNB, BNB (14× win).

See [RTP_MODEL.md](RTP_MODEL.md) for full reel layout and RTP details.

---

## Async model

- `spin` returns `requestId` immediately
- Result is fetched via `GET /round?requestId=...` (VRF is async; do not wait in HTTP)

---

## Testing scripts

See [packages/agent/scripts/README.md](../packages/agent/scripts/README.md) for details.

| Script | Command | Description |
|--------|---------|-------------|
| spin:402 | `yarn agent:spin:402` | POST /spinWith1USDC without payment; expects 402 |
| spin:paid | `yarn agent:spin:paid` | POST /spinWith1USDC with x402 (1.1 USDC). Requires `PAYER_PRIVATE_KEY`. |
| claim:paid | `yarn agent:claim:paid` | POST /claim with x402 (0.1 USDC). Requires `PAYER_PRIVATE_KEY`. |
