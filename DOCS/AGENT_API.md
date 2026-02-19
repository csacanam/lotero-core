# Lotero Agent – API Reference

REST API and configuration for the Lotero Agent. See [packages/agent/README.md](../packages/agent/README.md) for setup and [AGENT_FLOWS.md](AGENT_FLOWS.md) for flow diagrams.

---

## Pricing

| Service | Price | Breakdown |
|---------|-------|-----------|
| `spinWith1USDC` | 1.05 USDC | 1.00 bet + 0.05 fee (gas + VRF + service) |
| `claim` | 0.5 USDC | Fee for gasless earnings withdrawal |

---

## Endpoints

### POST /spinWith1USDC (Paid, 1.05 USDC)

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

### POST /claim (Paid, 0.5 USDC)

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

### GET /round/:requestId (Free)

Round result by `requestId`. Returns `number1`, `number2`, `number3` (reel indices). See [Reading round results](#reading-round-results).

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

*Required when using Coinbase facilitator (mainnet default).

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

`GET /round/:requestId` returns `number1`, `number2`, `number3` — **reel indices (0–9)**. Map to symbols:

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
- Result is fetched via `GET /round/:requestId` (VRF is async; do not wait in HTTP)

---

## Testing scripts

See [packages/agent/scripts/README.md](../packages/agent/scripts/README.md) for details.

| Script | Command | Description |
|--------|---------|-------------|
| spin:402 | `yarn agent:spin:402` | POST /spinWith1USDC without payment; expects 402 |
| spin:paid | `yarn agent:spin:paid` | POST /spinWith1USDC with x402 (1.05 USDC). Requires `PAYER_PRIVATE_KEY`. |
| claim:paid | `yarn agent:claim:paid` | POST /claim with x402 (0.5 USDC). Requires `PAYER_PRIVATE_KEY`. |
