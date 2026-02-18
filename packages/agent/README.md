# Slot Spin Execution Service (Base)

Execute provably fair slot spins on Base using Chainlink VRF. Gasless for caller agents via x402 payment in USDC.

**Stateless, no DB** — relay + monetization + onchain execution only.

## Quick Start

```bash
cp .env.example .env
# Edit .env with SLOT_MACHINE_ADDRESS, EXECUTOR_PRIVATE_KEY, PAY_TO
yarn install
yarn start
```

## Pricing

| Service | Price | Breakdown |
|---------|-------|-----------|
| `spinWith1USDC` | 1.05 USDC | 1.00 bet + 0.05 fee (gas + VRF + service) |

## Endpoints

### Paid (x402)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/spinWith1USDC` | Execute one spin for `player`. Requires 1.05 USDC payment via x402. |

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

| Method | Path | Description |
|--------|------|-------------|
| GET | `/round/:requestId` | Round result by requestId |
| GET | `/player/:address/balances` | Player balances and referral stats |
| GET | `/contract/health` | Bankroll, max bet, open/closed |
| GET | `/` | Service info and endpoint list |

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `SLOT_MACHINE_ADDRESS` | Yes | SlotMachineV2 contract on Base |
| `EXECUTOR_PRIVATE_KEY` | Yes | Executor wallet (signs tx, pays gas) |
| `PAY_TO` | Yes | Receives x402 payments |
| `BASE_RPC` | No | Default: `https://mainnet.base.org` |
| `FACILITATOR_URL` | No | Default: `https://api.cdp.coinbase.com/platform/v2/x402` |
| `PORT` | No | Default: 4021 |
| `VRF_SUBSCRIPTION_ID` | No | VRF subscription ID (enables subscription balance check) |
| `VRF_COORDINATOR` | No | Default: Base mainnet coordinator |
| `MIN_EXECUTOR_ETH_WEI` | No | Min executor ETH for gas (default: 0.001 ETH) |
| `MIN_SUBSCRIPTION_NATIVE_WEI` | No | Min subscription native balance when useNativePayment (default: 0.0001 ETH) |
| `MIN_SUBSCRIPTION_LINK_JUELS` | No | Min subscription LINK when !useNativePayment (default: 0.1 LINK) |

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
