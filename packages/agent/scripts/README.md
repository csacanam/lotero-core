# Agent scripts

Scripts to test the paid endpoints `POST /spinWith1USDC` and `POST /claim` locally.

## Requirements

- Agent running (`yarn agent` or `yarn agent:dev` from project root).
- For paid scripts: wallet with USDC on Base and `PAYER_PRIVATE_KEY` in `.env`.

## Scripts

### spin-402

Sends a POST **without** payment. Expects **402 Payment Required** with `PAYMENT-REQUIRED` header (payment instructions in base64).

```bash
yarn agent:spin:402
```

**Optional arguments:**

```bash
yarn workspace @lotero/agent spin:402 [player] [url]
```

| Arg    | Default                 | Description    |
| ------ | ----------------------- | -------------- |
| player | `0x0000...0001`         | Player address |
| url    | `http://localhost:4021` | Agent base URL |

**Environment variables:** none.

---

### spin-paid

Sends a POST **with** x402 payment (1.05 USDC). The client signs the payment and the spin is executed on-chain.

```bash
yarn agent:spin:paid
```

**Optional arguments:**

```bash
yarn workspace @lotero/agent spin:paid [player] [url]
```

| Arg    | Default                 | Description    |
| ------ | ----------------------- | -------------- |
| player | `0x0000...0001`         | Player address |
| url    | `http://localhost:4021` | Agent base URL |

**Environment variables:**

| Variable            | Required | Description                                                     |
| ------------------- | -------- | --------------------------------------------------------------- |
| `PAYER_PRIVATE_KEY` | Yes      | Private key of the paying wallet (must have 1.05+ USDC on Base) |

Add `PAYER_PRIVATE_KEY` to `packages/agent/.env` (not in .env.example, which is a template).

---

### claim-paid

Sends a POST **with** x402 payment (0.02 USDC). Claims earnings for a user (gasless).

```bash
yarn agent:claim:paid
```

**Optional arguments:**

```bash
yarn workspace @lotero/agent claim:paid [user] [url]
```

| Arg  | Default                 | Description                        |
| ---- | ----------------------- | ---------------------------------- |
| user | Payer address            | Address whose earnings to claim     |
| url  | `http://localhost:4021` | Agent base URL                     |

**Environment variables:** same as spin-paid (payer needs 0.02+ USDC on Base).

## Example flow

```bash
# 1. Start the agent
yarn agent

# 2. In another terminal: test 402
yarn agent:spin:402

# 3. Add PAYER_PRIVATE_KEY to .env and test real payment
yarn agent:spin:paid 0xYOUR_ADDRESS

# 4. Claim earnings for a user
yarn agent:claim:paid 0xUSER_ADDRESS
```
