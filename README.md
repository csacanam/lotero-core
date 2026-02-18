# 🎰 Lotero

A decentralized slot machine with verifiable randomness and on-chain rewards.

## Overview

Lotero lets users bet ERC20 tokens (e.g. USDT) and win prizes when three matching symbols appear on the reels. The game uses **Chainlink VRF 2.5** for provably fair randomness and is designed to be integrated by frontends or third-party apps.

- **RTP ~93%** — Mathematical model in [DOCS/RTP_MODEL.md](DOCS/RTP_MODEL.md) and [rtp_model.xlsx](DOCS/rtp_model.xlsx)
- **Referral system** — 1% commission on referred players' bets
- **Dev fee** — 5% of each bet to the team

> ⚠️ **Frontend in development** — The web app in `packages/nextjs` is incomplete. The contracts are production-ready and can be used by any client.

---

## Smart Contracts

### SlotMachine

Main contract implementing the game logic.

| Feature | Description |
|---------|-------------|
| **Token** | Uses an ERC20 for bets (e.g. USDT). Configurable at deployment. |
| **Symbols** | DOGE, BNB, ETH, BTC with payouts: 5x, 14x, 20x, 30x |
| **VRF** | Chainlink VRF 2.5 for secure randomness |
| **Events** | `SpinRequested` (requestId, payer, player, amount), `SpinResolved` (requestId, player, hasWon, prize, n1, n2, n3) |

**Core functions**

- `play(referringUserAddress, amountToPlay)` — Bet and spin
- `claimPlayerEarnings(userAddress)` — Claim winnings and referral earnings
- `isResolved(requestId)` — Check if a round has been resolved
- `rounds(requestId)` — Get full round data

### SlotMachineV2

Extends SlotMachine with `playFor`:

- `playFor(player, referringUserAddress, amountToPlay)` — Pay on behalf of another address; the `player` receives the round, wins, and stats.

Useful for meta-transactions, sponsored plays, or gifting spins.

### Agent (Slot Spin Execution Service)

Stateless HTTP API that sells spins as a service. Pays 1.05 USDC via x402 and relays `playFor` onchain. See [packages/agent/README.md](packages/agent/README.md).

- `POST /spinWith1USDC` — Paid endpoint (x402). Execute spin for `player`.
- `GET /round/:requestId`, `GET /player/:address/balances`, `GET /contract/health` — Read-only.

```bash
yarn agent        # Start agent
yarn agent:dev    # Dev with watch
```

---

## Project Structure

```
packages/
├── agent/            # Slot Spin Execution Service — x402 + onchain relay
│   └── src/
├── hardhat/          # Smart contracts, tests, deploy scripts
│   ├── contracts/
│   │   ├── SlotMachine.sol
│   │   ├── SlotMachineV2.sol
│   │   └── test/     # Mocks (VRFCoordinatorV2PlusMock, MockUSDT)
│   ├── deploy/
│   └── test/
└── nextjs/           # Web app (in development)
```

---

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [Yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

---

## Quick Start

**1. Install dependencies**

```bash
git clone https://github.com/csacanam/lotero-core.git
cd lotero-core
yarn install
```

**2. Run local chain**

```bash
yarn chain
```

**3. Deploy contracts** (new terminal)

```bash
yarn deploy
```

This deploys VRF mock, MockUSDT, SlotMachine, and SlotMachineV2 to the local network.

**4. Run tests**

```bash
yarn hardhat:test
```

**5. Start the frontend** (optional, in development)

```bash
yarn start
```

App runs at `http://localhost:3000`.

---

## Production Deployment

For mainnet/testnet:

1. Use the real Chainlink VRF 2.5 coordinator and subscription for your network. See [Chainlink VRF 2.5 Supported Networks](https://docs.chain.link/vrf/v2-5/supported-networks).
2. Update deploy scripts with the correct `keyHash`, `subscriptionId`, and token address.
3. Fund the VRF subscription with LINK.

---

## License

MIT
