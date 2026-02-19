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

```bash
yarn acp:seller
```

Or from repo root:

```bash
yarn workspace @lotero/agent acp:seller
```

## Job schema

When creating Job Offerings in the ACP UI (app.virtuals.io):

- **Spin**: `{ "player": "0x...", "referral": "0x..." | null }` – 1.375 USDC
- **Claim**: `{ "user": "0x..." }` – 0.625 USDC

Prices are higher than x402 to offset Virtuals platform fee. Override via `ACP_SPIN_PRICE_USD` and `ACP_CLAIM_PRICE_USD` in `.env`.

**Important:** Update the job offering prices in the ACP portal (app.virtuals.io) to 1.375 and 0.625 so the buyer is charged correctly.

## See also

- [ACP Dev Onboarding Guide](https://whitepaper.virtuals.io/acp-product-resources/acp-dev-onboarding-guide)
- [acp-node skip-evaluation example](https://github.com/Virtual-Protocol/acp-node/tree/main/examples/acp-base/skip-evaluation)
