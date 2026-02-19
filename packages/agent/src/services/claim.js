/**
 * Claim service – shared by Express (x402) and ACP seller.
 * Validates, executes claimPlayerEarnings, returns result. Throws on error.
 */
import { ethers } from "ethers";
import { validateExecutorEth } from "./validation.js";

/**
 * Execute a claim for a user.
 * @param {Object} ctx - { slotMachine, provider, executorWallet }
 * @param {{ user: string }} params
 * @returns {Promise<{ user: string, amount: string, txHash: string, status: string }>}
 */
export async function executeClaim(ctx, { user }) {
  if (
    !user ||
    typeof user !== "string" ||
    !ethers.utils.isAddress(user)
  ) {
    throw new Error("Invalid user address");
  }

  const { slotMachine, provider, executorWallet } = ctx;
  const userInfo = await slotMachine.infoPerUser(user);
  const moneyToClaimForPlay = userInfo.moneyEarned.sub(userInfo.moneyClaimed);
  const moneyToClaimForReferring = userInfo.earnedByReferrals.sub(
    userInfo.claimedByReferrals,
  );
  const moneyToClaim = moneyToClaimForPlay.add(moneyToClaimForReferring);

  if (moneyToClaim.isZero()) {
    throw new Error("Nothing to claim; user has already claimed all earnings");
  }

  const executorCheck = await validateExecutorEth(provider, executorWallet);
  if (!executorCheck.ok) {
    throw new Error(executorCheck.error);
  }

  const tx = await slotMachine.claimPlayerEarnings(user, {
    gasLimit: 150000,
  });
  const receipt = await tx.wait();

  return {
    user,
    amount: moneyToClaim.toString(),
    txHash: receipt.transactionHash,
    status: "claimed",
  };
}
