# lotero-mcp

MCP server for [Lotero](https://lotero.xyz) — play a provably fair on-chain slot machine from any AI agent. Pay 1.1 USDC per spin via x402 on Base (no account, no gas), poll the Chainlink VRF result, and claim winnings straight to the human's wallet.

**⚠️ This is gambling** (RTP ~93%, negative expected value). The server ships with an **enforced session spin limit** (default 10) and the tools require explicit human authorization and a budget before playing.

## Install

**Claude Code:**

```bash
claude mcp add lotero -- npx -y lotero-mcp
```

**Cursor / any MCP client** (`.mcp.json` / `mcp.json`):

```json
{
  "mcpServers": {
    "lotero": {
      "command": "npx",
      "args": ["-y", "lotero-mcp"],
      "env": {
        "LOTERO_WALLET_PRIVATE_KEY": "0x...",
        "LOTERO_PLAYER_ADDRESS": "0xYOUR_HUMANS_WALLET"
      }
    }
  }
}
```

## Configuration

| Env var | Required | Description |
|---|---|---|
| `LOTERO_WALLET_PRIVATE_KEY` | for spin/claim | Dedicated wallet with USDC on **Base** — pays 1.1 USDC per spin + 0.1 per claim via x402, gasless. Never use the human's main wallet. |
| `LOTERO_PLAYER_ADDRESS` | recommended | Default `player` — use the **human's** wallet: wins accrue there and `claim` sends the USDC there. |
| `LOTERO_MAX_SPINS_PER_SESSION` | no | Enforced guardrail, default `10`. |
| `LOTERO_API_BASE` | no | Default `https://api.lotero.xyz`. |

The free tools (`get_round`, `get_balances`, `get_contract_health`) work without any configuration.

## Tools

| Tool | Cost | What it does |
|---|---|---|
| `spin` | 1.1 USDC | One spin for `player` — returns a `requestId` (result is async via VRF). Refuses past the session limit |
| `get_round` | free | Spin result by requestId, with stuck-round diagnosis (`pending.vrfSubscriptionFunded`) |
| `get_balances` | free | Earnings / claims / referral stats (claimable = earned − claimed) |
| `claim` | 0.1 USDC | Withdraws **everything** to the player — claim once at the end of the session |
| `get_contract_health` | free | Bankroll + VRF subscription status |

## Fairness

Randomness is Chainlink VRF 2.5, generated on-chain — neither Lotero nor the player can manipulate results. Every spin has a public `txHash` verifiable on BaseScan (contract `0xC4b88e90a73fA9ec588E504255A43d4Ccb82edE9`, events `SpinRequested` → `SpinResolved`). Reel model and RTP math: [DOCS/RTP_MODEL.md](../DOCS/RTP_MODEL.md).

Full agent guide: [lotero.xyz/skill.md](https://lotero.xyz/skill.md) · LLM index: [lotero.xyz/llms.txt](https://lotero.xyz/llms.txt)
