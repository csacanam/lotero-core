/**
 * Shared validation for spin and claim operations.
 * Used by both Express (x402) and ACP seller.
 */
import { ethers } from "ethers";
import constants from "../utils/constants.js";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ERC20_APPROVE_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

/**
 * Validates executor has enough ETH for gas. Returns { ok, error? }.
 */
export async function validateExecutorEth(provider, executorWallet) {
  const minEthWei = ethers.utils.parseEther(
    String(constants.EXECUTOR_MIN_ETH_TRIGGER),
  );
  const balance = await provider.getBalance(executorWallet.address);
  if (balance.lt(minEthWei)) {
    return {
      ok: false,
      error: `Executor ETH too low for gas (need >= ${constants.EXECUTOR_MIN_ETH_TRIGGER} ETH)`,
    };
  }
  return { ok: true };
}

/**
 * Validates contract health before spin:
 * - Contract open, bankroll sufficient, executor ETH/USDC, VRF subscription.
 * @param {Object} ctx - { slotMachine, provider, executorWallet, vrfCoordinator, vrfSubscriptionId?, minSubscriptionNativeWei, minSubscriptionLinkJuels }
 */
export async function validateContractHealth(ctx) {
  const {
    slotMachine,
    provider,
    executorWallet,
    vrfCoordinator,
    vrfSubscriptionId,
    minSubscriptionNativeWei,
    minSubscriptionLinkJuels,
  } = ctx;

  const minUsdcForSpin = ethers.utils.parseUnits(
    String(constants.EXECUTOR_MIN_USDC_FOR_SPIN),
    6,
  );
  const minBankrollUsdc = ethers.utils.parseUnits(
    String(constants.CONTRACT_MIN_AVAILABLE_BANKROLL_USDC),
    6,
  );

  const usdc = new ethers.Contract(USDC_BASE, ERC20_APPROVE_ABI, provider);

  const [
    closed,
    moneyInContract,
    debt,
    executorEthCheck,
    executorUsdcBalance,
    useNative,
  ] = await Promise.all([
    slotMachine.isClosed(),
    slotMachine.getMoneyInContract(),
    slotMachine.getCurrentDebt(),
    validateExecutorEth(provider, executorWallet),
    usdc.balanceOf(executorWallet.address),
    slotMachine.useNativePayment(),
  ]);

  const availableBankroll = moneyInContract.sub(debt);
  const errors = [];

  if (closed) errors.push("Contract is closed");
  if (availableBankroll.lt(minBankrollUsdc))
    errors.push(
      `Available bankroll too low (need >= ${constants.CONTRACT_MIN_AVAILABLE_BANKROLL_USDC} USDC to pay max prize)`,
    );
  if (!executorEthCheck.ok) errors.push(executorEthCheck.error);
  if (executorUsdcBalance.lt(minUsdcForSpin))
    errors.push(
      `Executor USDC too low (need >= ${constants.EXECUTOR_MIN_USDC_FOR_SPIN} USDC to execute spin)`,
    );

  if (vrfSubscriptionId && vrfCoordinator) {
    try {
      const sub = await vrfCoordinator.getSubscription(vrfSubscriptionId);
      const [linkBalance, nativeBalance] = [sub.balance, sub.nativeBalance];
      if (useNative) {
        if (nativeBalance.lt(minSubscriptionNativeWei)) {
          errors.push(
            `VRF subscription native balance too low (need >= ${constants.VRF_MIN_NATIVE_ETH_FOR_SPIN} ETH)`,
          );
        }
      } else {
        if (linkBalance.lt(minSubscriptionLinkJuels)) {
          errors.push(
            `VRF subscription LINK balance too low (need >= ${constants.VRF_MIN_LINK_FOR_SPIN} LINK)`,
          );
        }
      }
    } catch (err) {
      errors.push(`VRF subscription check failed: ${err.message}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validates contract is open (not closed).
 * @param {ethers.Contract} slotMachine
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function validateContractOpen(slotMachine) {
  const closed = await slotMachine.isClosed();
  if (closed) {
    return { ok: false, error: "Contract is closed" };
  }
  return { ok: true };
}

/**
 * Validates we can execute a claim before accepting an ACP job.
 * Checks: contract open, executor ETH, user has funds to claim.
 * @param {Object} ctx - { slotMachine, provider, executorWallet }
 * @param {{ user: string }} params
 * @returns {Promise<{ ok: boolean, errors: string[] }>}
 */
export async function validateForClaim(ctx, { user }) {
  const { slotMachine, provider, executorWallet } = ctx;
  const errors = [];

  const [closed, executorCheck, userInfo] = await Promise.all([
    slotMachine.isClosed(),
    validateExecutorEth(provider, executorWallet),
    slotMachine.infoPerUser(user),
  ]);

  if (closed) errors.push("Contract is closed");
  if (!executorCheck.ok) errors.push(executorCheck.error);

  const moneyToClaimForPlay = userInfo.moneyEarned.sub(userInfo.moneyClaimed);
  const moneyToClaimForReferring = userInfo.earnedByReferrals.sub(
    userInfo.claimedByReferrals,
  );
  const moneyToClaim = moneyToClaimForPlay.add(moneyToClaimForReferring);
  if (moneyToClaim.isZero()) {
    errors.push("Nothing to claim; user has already claimed all earnings");
  }

  return { ok: errors.length === 0, errors };
}
