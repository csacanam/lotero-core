# Lotero Agent (Base)

Execute provably fair slot spins on Base using Chainlink VRF. Gasless for caller agents via x402 payment in USDC.

**Stateless, no DB** — relay + monetization + onchain execution only.

## Step-by-step: Run the agent

### 1. Prerequisites

- Node.js v18+
- Yarn
- SlotMachineV2 deployed on Base (see [DOCS/DEPLOY_BASE.md](../../DOCS/DEPLOY_BASE.md))

### 2. Install dependencies

From the **project root** (monorepo installs all workspaces, including agent):

```bash
# From lotero-core/
yarn install
```

### 3. Create `.env`

```bash
cd packages/agent
cp .env.example .env
```

Edit `.env` and set the **required** variables:

| Variable               | Where to get it                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| `SLOT_MACHINE_ADDRESS` | From deploy output or `DEPLOY_BASE.md`                                |
| `EXECUTOR_PRIVATE_KEY` | Private key of your executor wallet                                   |
| `PAY_TO`               | Same address as executor (or another wallet to receive x402 payments) |
| `CDP_API_KEY_ID`       | Required for x402 facilitator. Create at [CDP API Keys](https://portal.cdp.coinbase.com/projects/api-keys) (Secret API Key) |
| `CDP_API_KEY_SECRET`  | Secret of the CDP API Key (keep private)                              |

### 4. Fund the executor wallet

The executor must have on Base:

- **ETH** — for gas (e.g. 0.01 ETH minimum)
- **USDC** — float for spins (1 USDC per spin; fund with ~10–50 USDC)

### 5. Start the agent (approval is automatic)

The executor pays 1 USDC per spin via `transferFrom`. On first startup, the agent automatically checks and approves USDC if needed. Ensure the executor has USDC and ETH before starting.

```bash
# From project root (lotero-core/)
yarn agent

# Or with dev mode (auto-reload)
yarn agent:dev
```

### 6. Optional: VRF subscription check

If you want the agent to validate the VRF subscription balance before each spin:

```bash
VRF_SUBSCRIPTION_ID=123  # Your subscription ID from vrf.chain.link
```

### 7. Verify it's running

```bash
curl http://localhost:4021/
```

Expected response: JSON with service name and endpoints.

```bash
curl http://localhost:4021/contract/health
```

Expected: `bankroll`, `maxBetSafe`, `contractOpen`, etc.

## Pricing

| Service         | Price     | Breakdown                                 |
| --------------- | --------- | ----------------------------------------- |
| `spinWith1USDC` | 1.05 USDC | 1.00 bet + 0.05 fee (gas + VRF + service) |

## Endpoints

### Paid (x402)

| Method | Path             | Description                                                         |
| ------ | ---------------- | ------------------------------------------------------------------- |
| POST   | `/spinWith1USDC` | Execute one spin for `player`. Requires 1.05 USDC payment via x402. |

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

### Free (Read Only)

| Method | Path                        | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| GET    | `/round/:requestId`         | Round result by requestId          |
| GET    | `/player/:address/balances` | Player balances and referral stats |
| GET    | `/contract/health`          | Bankroll, max bet, open/closed     |
| GET    | `/`                         | Service info and endpoint list     |

## Environment

| Variable                      | Required | Description                                                                          |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `SLOT_MACHINE_ADDRESS`        | Yes      | SlotMachineV2 contract on Base                                                       |
| `EXECUTOR_PRIVATE_KEY`        | Yes      | Executor wallet (signs tx, pays gas)                                                 |
| `PAY_TO`                      | Yes      | Receives x402 payments                                                               |
| `BASE_RPC`                    | No       | Default: `https://mainnet.base.org`                                                  |
| `FACILITATOR_URL`             | No       | Default: `https://api.cdp.coinbase.com/platform/v2/x402`                             |
| `PORT`                        | No       | Default: 4021                                                                        |
| `VRF_SUBSCRIPTION_ID`         | No       | VRF subscription ID (enables subscription balance check)                             |
| `VRF_COORDINATOR`             | No       | Default: Base mainnet coordinator                                                    |
| `MIN_EXECUTOR_ETH_WEI`        | No       | Min executor ETH for gas (default: 0.001 ETH)                                        |
| `MIN_SUBSCRIPTION_NATIVE_WEI` | No       | Min subscription native balance when useNativePayment (default: 0.0001 ETH)          |
| `MIN_SUBSCRIPTION_LINK_JUELS` | No       | Min subscription LINK when !useNativePayment (default: 0.1 LINK)                     |
| `RATE_LIMIT_WINDOW_MS`        | No       | Rate limit window in ms (default: 60000)                                             |
| `RATE_LIMIT_MAX`              | No       | Max requests per window per IP for read-only endpoints (default: 60)                 |
| `RATE_LIMIT_NO_PAYMENT_MAX`   | No       | Max requests per window for POST /spinWith1USDC without payment header (default: 10) |

## Rate limiting

- **Read-only** endpoints: 60 req/min per IP (configurable).
- **POST /spinWith1USDC without x402 payment header**: 10 req/min per IP. If under limit, payment middleware returns proper 402 with payment instructions. Avoids saturation from empty requests.

## Pre-spin Validations

Before executing a spin, the agent verifies:

- Contract open and bankroll sufficient for max payout
- Executor has sufficient ETH (≥ `MIN_EXECUTOR_ETH_WEI`) for gas
- If `VRF_SUBSCRIPTION_ID` is set: subscription has sufficient balance (native or LINK per `useNativePayment`)

## Executor Requirements

- **ETH** on Base for gas
- **USDC** float: executor spends 1 USDC per spin (transferFrom to contract)
- **Approval**: SlotMachineV2 must be approved to spend executor's USDC

## Async Model

- `spin` returns `requestId` immediately
- Result is fetched via `GET /round/:requestId` (VRF is async, do not wait in HTTP)
