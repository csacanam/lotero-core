# 🎰 Lotero

**A Decentralized Casino for AI Agents**

A provably fair, on-chain slot machine with Chainlink VRF 2.5. Designed for autonomous agents: clients pay in USDC via x402, execution is gasless.

## Overview

Lotero lets users (or AI agents) bet USDC and win prizes when three matching symbols appear on the reels. The game uses **Chainlink VRF 2.5** for provably fair randomness.

- **RTP ~93%** — [DOCS/RTP_MODEL.md](DOCS/RTP_MODEL.md)
- **Max win: 30×** — Bet 1 USDC, win up to 30 USDC (three BTC)
- **Symbols** — DOGE 5×, BNB 14×, ETH 20×, BTC 30×
- **Referral** — 1% commission on referred players' bets
- **Dev fee** — 5% of each bet to the team

> ⚠️ **Frontend in development** — The web app in `packages/frontend` is incomplete. The contracts and agent are production-ready.

---

## Smart Contract

### SlotMachineV2 (Base mainnet)

| Item        | Value                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| **Address** | `0xC4b88e90a73fA9ec588E504255A43d4Ccb82edE9`                                           |
| **Token**   | USDC. Bet 1 USDC, win up to 30 USDC.                                                    |
| **VRF**     | Chainlink VRF 2.5                                                                       |
| **Events**  | `SpinRequested`, `SpinResolved`                                                         |

**Core functions**

- `playFor(player, referringUserAddress, amountToPlay)` — Pay on behalf of another address; the `player` receives the round, wins, and stats.
- `claimPlayerEarnings(userAddress)` — Claim winnings and referral earnings.
- `isResolved(requestId)` — Check if a round has been resolved.

---

## Agents

### Lotero Agent

Stateless HTTP API that sells spins and claims as a service. Clients pay via x402 (1.05 USDC spin, 0.5 USDC claim); the agent relays `playFor` and `claimPlayerEarnings` onchain. Two-agent system: **Lotero Agent** (Express API) + **Ops Agent** (external cron calling `GET /cron/health`). See [packages/agent/README.md](packages/agent/README.md).

- `POST /spinWith1USDC` — Paid (x402). Execute spin for `player`.
- `POST /claim` — Paid (x402). Claim player earnings (gasless).
- `GET /round/:requestId`, `GET /player/:address/balances`, `GET /contract/health` — Read-only.
- `GET /cron/health` — Ops Agent: system status, may execute transfers and Telegram alerts.

```bash
yarn agent        # Start agent
yarn agent:dev    # Dev with watch
```

**Documentation:** [DOCS/AGENT_FLOWS.md](DOCS/AGENT_FLOWS.md) | [DOCS/AGENT_API.md](DOCS/AGENT_API.md)

---

## Project Structure

```
packages/
├── agent/         # Lotero Agent — x402 + onchain relay
├── contracts/     # Smart contracts, tests, deploy scripts
│   ├── contracts/   SlotMachine.sol, SlotMachineV2.sol
│   ├── deploy/
│   └── test/
└── frontend/      # Web app (in development)
```

---

## Documentation

| Doc                                        | Description                              |
| ------------------------------------------ | ---------------------------------------- |
| [DOCS/AGENT_FLOWS.md](DOCS/AGENT_FLOWS.md) | Flow diagrams (cron health, spin, claim) |
| [DOCS/AGENT_API.md](DOCS/AGENT_API.md)     | API reference, endpoints, env, constants |
| [DOCS/DEPLOY_BASE.md](DOCS/DEPLOY_BASE.md) | Deploy contracts to Base                 |
| [DOCS/RTP_MODEL.md](DOCS/RTP_MODEL.md)     | RTP math and reel layout                 |

---

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [Yarn](https://yarnpkg.com/)
- [Git](https://git.scm.com/)

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

**4. Run tests**

```bash
yarn contracts:test
```

**5. Start the frontend** (optional, in development)

```bash
yarn start
```

App runs at `http://localhost:3000`.

---

## Production

For Base mainnet: see [DOCS/DEPLOY_BASE.md](DOCS/DEPLOY_BASE.md). Contract address above. Fund the VRF subscription with LINK.

---

## License

MIT
