/**
 * Spin service – shared by Express (x402) and ACP seller.
 * Validates, executes playFor, returns result. Throws on error.
 */
import { ethers } from "ethers";
import { validateContractHealth } from "./validation.js";

/**
 * Execute a spin for a player.
 * @param {Object} ctx - { slotMachine, provider, executorWallet, vrfCoordinator?, vrfSubscriptionId?, minSubscriptionNativeWei, minSubscriptionLinkJuels, spinAmount }
 * @param {{ player: string, referral?: string | null }} params
 * @returns {Promise<{ requestId: string, txHash: string, status: string }>}
 */
export async function executeSpin(ctx, { player, referral }) {
  if (
    !player ||
    typeof player !== "string" ||
    !ethers.utils.isAddress(player)
  ) {
    throw new Error("Invalid player address");
  }
  const referralAddr =
    referral && ethers.utils.isAddress(referral)
      ? referral
      : ethers.constants.AddressZero;

  const health = await validateContractHealth(ctx);
  if (!health.ok) {
    throw new Error(`Contract unhealthy: ${health.errors.join("; ")}`);
  }

  const { slotMachine, spinAmount } = ctx;
  const tx = await slotMachine.playFor(
    player,
    referralAddr,
    spinAmount,
    { gasLimit: 350000 },
  );
  const receipt = await tx.wait();
  const reqId = receipt.events?.find((e) => e.event === "SpinRequested")
    ?.args?.[0];

  if (!reqId) {
    throw new Error("Could not extract requestId from tx");
  }

  return {
    requestId: reqId.toString(),
    txHash: receipt.transactionHash,
    status: "pending",
  };
}
