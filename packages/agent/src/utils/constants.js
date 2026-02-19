/**
 * Global constants for Lotero Agent and cron health endpoint.
 *
 * All thresholds and configurable values used for:
 * - Spin/claim validation in index.js
 * - x402 pricing (index.js)
 * - Cron auto top-up and Telegram alerts in routes/cron.js
 *
 * Modify these values to adjust when the agent and cron take action.
 */

// ─── Pricing (x402 paid routes) ─────────────────────────────────────────────

/** Price in USD for one spin (player pays this via x402) */
export const SPIN_PRICE_USD = "1.05";

/** Price in USD for claim (player pays this via x402 for gasless claim) */
export const CLAIM_PRICE_USD = "0.5";

// ─── Contract (SlotMachine) – spin validation ─────────────────────────────────

/**
 * Min available bankroll (moneyInContract - debt) in USDC to allow spins.
 * Must be >= 30 because max prize is 30x bet; contract closes when available < 30.
 */
export const CONTRACT_MIN_AVAILABLE_BANKROLL_USDC = 30.0;

// ─── Contract (SlotMachine) – cron auto top-up ───────────────────────────────

/** Bankroll below this triggers "contract needs funding" – auto top-up from wallet */
export const CONTRACT_TOPUP_TRIGGER_BANKROLL_USDC = 60.0;

/** Target bankroll. Transfers are capped so bankroll never exceeds this. */
export const CONTRACT_TARGET_BANKROLL_USDC = 90.0;

// ─── Executor wallet – spin validation ───────────────────────────────────────

/** Min USDC in executor wallet to execute a spin (executor pays 1 USDC on behalf of player) */
export const EXECUTOR_MIN_USDC_FOR_SPIN = 1.0;

/** Min ETH in executor wallet for gas (spin, claim). Triggers 503 if below. */
export const EXECUTOR_MIN_ETH_TRIGGER = 0.001;

// ─── Executor wallet – cron alerts ───────────────────────────────────────────

/** ETH below this triggers Telegram CRITICAL alert */
export const WALLET_MIN_ETH_TRIGGER = 0.01;

/** Target ETH balance for executor wallet (used in alert messages) */
export const WALLET_TARGET_ETH = 0.05;

/** USDC below this triggers INFO alert. Min balance to keep when topping up contract. */
export const WALLET_MIN_USDC_BUFFER = 10.0;

/** Target USDC buffer for executor wallet (used in alert messages) */
export const WALLET_TARGET_USDC_BUFFER = 20.0;

// ─── Wallet → Contract (cron reinforcement) ─────────────────────────────────

/** Min excess (wallet - min buffer) required to transfer to contract when bankroll < target */
export const WALLET_EXCESS_MIN_FOR_CONTRACT_USDC = 5.0;

// ─── VRF subscription – spin validation ──────────────────────────────────────

/** Min LINK in VRF subscription to fulfill a spin request */
export const VRF_MIN_LINK_FOR_SPIN = 0.3;

/** Min native (ETH) in VRF subscription when useNativePayment is true */
export const VRF_MIN_NATIVE_ETH_FOR_SPIN = 0.001;

// ─── VRF subscription – cron alerts ─────────────────────────────────────────

/** LINK below this triggers Telegram WARNING alert */
export const VRF_MIN_LINK_TRIGGER = 0.31;

/** Target LINK balance for VRF subscription (used in alert messages) */
export const VRF_TARGET_LINK = 1.0;

// ─── Dev fees (cron) ───────────────────────────────────────────────────────

/** Min pending dev fees (USDC) to trigger claim to wallet */
export const DEV_CLAIM_MIN_USDC = 5.0;

// ─── Default export (for cron/config consumers) ───────────────────────────────

/** All constants as a single object – useful for destructuring or passing to helpers */
export default {
  SPIN_PRICE_USD,
  CLAIM_PRICE_USD,
  CONTRACT_MIN_AVAILABLE_BANKROLL_USDC,
  CONTRACT_TOPUP_TRIGGER_BANKROLL_USDC,
  CONTRACT_TARGET_BANKROLL_USDC,
  EXECUTOR_MIN_USDC_FOR_SPIN,
  EXECUTOR_MIN_ETH_TRIGGER,
  WALLET_MIN_ETH_TRIGGER,
  WALLET_TARGET_ETH,
  WALLET_MIN_USDC_BUFFER,
  WALLET_TARGET_USDC_BUFFER,
  WALLET_EXCESS_MIN_FOR_CONTRACT_USDC,
  VRF_MIN_LINK_FOR_SPIN,
  VRF_MIN_NATIVE_ETH_FOR_SPIN,
  VRF_MIN_LINK_TRIGGER,
  VRF_TARGET_LINK,
  DEV_CLAIM_MIN_USDC,
};
