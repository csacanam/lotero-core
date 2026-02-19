# Lotero Agent – Flow Documentation

Detailed sequence diagrams and explanations for each agent flow. The [agent README](../packages/agent/README.md) has the high-level overview.

---

## 1. Cron health flow (`GET /cron/health`)

Called by the **Ops Agent** (external cron) every few minutes. Returns system status and may execute on-chain actions.

### Sequence diagram

```mermaid
sequenceDiagram
    participant Cron as Ops Agent (cron)
    participant API as Lotero Agent
    participant Chain as Base (contracts)
    participant TG as Telegram

    Cron->>API: GET /cron/health

    Note over API: 1. Fetch state
    API->>Chain: getBalance (ETH, USDC)
    API->>Chain: isClosed, getMoneyInContract, getCurrentDebt
    Chain-->>API: wallet, contract state

    Note over API: 2. Build passive alerts
    API->>API: ETH low? USDC buffer low? → push to alertCritical/alertInfo

    alt Contract needs funding (closed or bankroll < 60)
        alt Wallet has excess >= 5 USDC
            API->>TG: auto_topup_pre
            API->>Chain: depositTokens (wallet → contract)
            Chain-->>API: ok
            API->>API: didTransferToContract = true
            API->>API: push success/partial alert
        else Wallet below buffer
            API->>API: push contract_wallet_critical
        else Insufficient excess (< 5)
            alt Contract closed
                API->>API: push contract_insufficient_excess
            end
        end
    end

    alt Pending dev fees >= 5 USDC
        API->>Chain: claimDevEarnings
        Chain-->>API: ok
        API->>API: usdcBalance += received
        API->>API: push dev_claim alert
    end

    alt Bankroll < 90 AND excess >= 5 AND !didTransferToContract
        API->>TG: auto_topup_pre (reinforcement)
        API->>Chain: depositTokens
        Chain-->>API: ok
        API->>API: push bankroll_reinforced alert
    end

    Note over API: 6. Fetch VRF
    API->>Chain: getSubscription (VRF)
    API->>API: VRF LINK low? → push alertWarning

    Note over API: 7. Send alerts
    API->>TG: critical alerts
    API->>TG: warning alerts
    API->>TG: info alerts

    API-->>Cron: 200 JSON (health status)
```

### Steps summary

| Step | Action |
|------|--------|
| 1 | Fetch wallet (ETH, USDC) and contract (bankroll, debt, isClosed) |
| 2 | Build passive alerts (ETH low → CRITICAL, USDC buffer low → INFO) |
| 3 | **Contract needs funding**: if closed or bankroll < 60, and excess ≥ 5, transfer to contract (max 1 per run) |
| 4 | **Dev claim**: if pending ≥ 5 USDC, claim to wallet |
| 5 | **Wallet excess → contract**: if bankroll < 90, excess ≥ 5, and step 3 did not transfer, reinforce |
| 6 | Fetch VRF subscription, build LINK low alert |
| 7 | Send Telegram alerts: critical → warning → info |

### Key rules

- **One transfer per run**: Step 5 is skipped if step 3 already transferred.
- **Min excess 5 USDC**: No transfer if excess < 5 (avoids micro-transactions).
- **contract_insufficient_excess** alert: Only when contract is CLOSED. When open, no alert (auto top-up will run when excess arrives).

---

## 2. Spin flow (`POST /spinWith1USDC`)

Client pays 1.05 USDC via x402. Executor pays 1 USDC on-chain and gas.

### Sequence diagram

```mermaid
sequenceDiagram
    participant Client
    participant API as Lotero Agent
    participant x402 as CDP Facilitator
    participant Chain as Base (SlotMachine, VRF)

    Client->>API: POST /spinWith1USDC (player, referral)
    API->>x402: Verify payment (payment-signature / x-payment)
    x402-->>API: Payment valid

    API->>Chain: isClosed, getMoneyInContract, getCurrentDebt
    API->>Chain: getBalance (executor ETH, USDC)
    API->>Chain: getSubscription (VRF LINK/native)

    alt Validation fails
        API-->>Client: 503 Contract unhealthy
    end

    API->>Chain: playFor(player, referral, 1 USDC)
    Chain->>Chain: transferFrom(executor → contract)
    Chain->>Chain: requestRandomWords (VRF)
    Chain-->>API: requestId, txHash

    API-->>Client: 200 { requestId, txHash, status: pending }
```

### Pre-spin validations

- Contract open (`!isClosed`)
- Available bankroll ≥ 30 USDC
- Executor ETH ≥ 0.001
- Executor USDC ≥ 1
- VRF subscription balance sufficient (if configured)

---

## 3. Claim flow (`POST /claim`)

Client pays 0.5 USDC via x402. Executor pays gas.

### Sequence diagram

```mermaid
sequenceDiagram
    participant Client
    participant API as Lotero Agent
    participant x402 as CDP Facilitator
    participant Chain as Base (SlotMachine)

    Client->>API: POST /claim (user)
    API->>x402: Verify payment
    x402-->>API: Payment valid

    API->>Chain: infoPerUser(user)
    Chain-->>API: moneyEarned, moneyClaimed, earnedByReferrals, claimedByReferrals

    alt Nothing to claim
        API-->>Client: 400 Nothing to claim
    end

    API->>Chain: getBalance (executor ETH)
    alt ETH insufficient
        API-->>Client: 503 Executor insufficient
    end

    API->>Chain: claimPlayerEarnings(user)
    Chain-->>API: txHash

    API-->>Client: 200 { user, amount, txHash, status: claimed }
```

---

## Constants reference

See [packages/agent/src/utils/constants.js](../packages/agent/src/utils/constants.js) for thresholds:

| Constant | Value | Used in |
|----------|-------|---------|
| CONTRACT_MIN_AVAILABLE_BANKROLL_USDC | 30 | Spin validation |
| CONTRACT_TOPUP_TRIGGER_BANKROLL_USDC | 60 | Cron step 3 |
| CONTRACT_TARGET_BANKROLL_USDC | 90 | Cron transfers capped at this |
| WALLET_EXCESS_MIN_FOR_CONTRACT_USDC | 5 | Cron steps 3 & 5 |
| EXECUTOR_MIN_USDC_FOR_SPIN | 1 | Spin validation |
