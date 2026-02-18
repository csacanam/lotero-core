# Lotero RTP Model

This document describes the Return to Player (RTP) mathematical model used in the SlotMachine contract.

For detailed calculations and simulations, see [rtp_model.xlsx](rtp_model.xlsx).

---

## Symbols and payouts

| Symbol | Payout (multiplier) | Index |
|--------|---------------------|-------|
| DOGE   | 5x                  | 0     |
| BNB    | 14x                 | 1     |
| ETH    | 20x                 | 2     |
| BTC    | 30x                 | 3     |

---

## Reel distribution

Each reel has 10 positions with the same distribution:

| Symbol | Count | Probability per reel |
|--------|-------|----------------------|
| DOGE   | 5     | 50%                  |
| BNB    | 2     | 20%                  |
| ETH    | 2     | 20%                  |
| BTC    | 1     | 10%                  |

Reels are independent. The VRF returns 3 random indices (0–9), one per reel, which map to the symbol at that position.

---

## RTP calculation

- **P(3× DOGE)** = 0.5³ = 0.125 → pays 5x  
- **P(3× BNB)** = 0.2³ = 0.008 → pays 14x  
- **P(3× ETH)** = 0.2³ = 0.008 → pays 20x  
- **P(3× BTC)** = 0.1³ = 0.001 → pays 30x  

**Base RTP** = 0.125×5 + 0.008×14 + 0.008×20 + 0.001×30 = 0.625 + 0.112 + 0.16 + 0.03 = **0.927 (92.7%)**

---

## Fees

- **Dev fee:** 5% of each bet  
- **Referral fee:** 1% of each bet (when applicable)

These reduce the effective RTP to the player. The Excel file includes the full breakdown with fees.
