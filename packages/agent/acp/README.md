# ACP (Agent Commerce Protocol) – Lotero Seller

Integrates Lotero with [Virtuals ACP](https://github.com/Virtual-Protocol/acp-node) for agent discovery and job-based payments.

## Setup

1. Register your agent at [app.virtuals.io/acp/join](https://app.virtuals.io/acp/join)
2. Create and whitelist a dev wallet
3. Add to `.env`:

   ```
   ACP_SELLER_WHITELISTED_WALLET_PRIVATE_KEY=0x...
   ACP_SELLER_ENTITY_ID=<from ACP profile>
   ACP_SELLER_AGENT_WALLET_ADDRESS=<smart wallet from ACP>
   ```

## Run

The ACP seller **starts automatically** when you run the main agent (`yarn agent`). Express + x402 + ACP seller run together.

To run the ACP seller **standalone** (without Express):

```bash
yarn acp:seller
```

Or from repo root:

```bash
yarn workspace @lotero/agent acp:seller
```

## Job schema

When creating Job Offerings in the ACP UI (app.virtuals.io):

- **Spin**: `{ "player": "0x...", "referral": "0x..." | null }` – service cost + 1 USDC bet (set in Virtuals)
- **Claim**: `{ "user": "0x..." }` – service cost only (set in Virtuals)

**Service costs:** Set in Virtuals portal (app.virtuals.io) per job offering. The bet amount (1 USDC) is fixed in code.

## See also

- [ACP Dev Onboarding Guide](https://whitepaper.virtuals.io/acp-product-resources/acp-dev-onboarding-guide)
- [acp-node skip-evaluation example](https://github.com/Virtual-Protocol/acp-node/tree/main/examples/acp-base/skip-evaluation)
