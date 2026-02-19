/**
 * Cron / monitoring endpoints for Lotero Agent.
 *
 * GET /cron/health returns full system status (wallet, contract, VRF) and
 * may execute autonomous actions:
 * - Transfer USDC from wallet to contract when contract needs funding or is below target
 * - Claim dev fees to wallet when pending >= 5 USDC
 * - Send Telegram alerts (critical, warning, info) when thresholds are breached
 *
 * Execution order:
 * 1. Fetch wallet (ETH, USDC) and contract (bankroll, isClosed) state
 * 2. Build passive alerts (ETH low, USDC buffer low)
 * 3. Contract needs funding (closed or bankroll < 60): transfer capped at target
 * 4. Dev claim: withdraw pending dev fees to wallet when >= 5 USDC
 * 5. Wallet excess → contract: when bankroll < 90 and excess >= 5, transfer min(excess, needed)
 * 6. Fetch VRF subscription, build VRF LINK low alert if applicable
 * 7. Send all alerts in order: critical → warning → info
 */

import express from "express";
import { ethers } from "ethers";
import constants from "../utils/constants.js";
import { sendTelegramAlert } from "../utils/notify.js";

// ─── ABIs & formatting ───────────────────────────────────────────────────

const ERC20_BALANCE_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];
const ERC20_APPROVE_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const USDC_DECIMALS = 6;
const LINK_DECIMALS = 18;

/** Parse USDC amount to raw (6 decimals) */
function parseUsdc(amount) {
  return ethers.utils.parseUnits(String(amount), USDC_DECIMALS);
}

/** Format USDC from raw (6 decimals) */
function fmtUsdc(raw) {
  return ethers.utils.formatUnits(raw, USDC_DECIMALS);
}

/** Format LINK from raw (18 decimals) */
function fmtLink(raw) {
  return ethers.utils.formatUnits(raw, LINK_DECIMALS);
}

/** Format ETH from wei */
function fmtEth(wei) {
  return ethers.utils.formatEther(wei);
}

/**
 * Approve (if needed) and transfer USDC from executor to contract.
 * @param {Object} ctx - { usdcAddress, executorWallet, slotMachineAddress, provider }
 * @param {string} walletAddress - Executor address
 * @param {number} amountUSDC - Amount in USDC (human-readable)
 * @returns {Promise<void>}
 */
async function transferUsdcToContract(ctx, walletAddress, amountUSDC) {
  const { usdcAddress, executorWallet, slotMachineAddress, slotMachine } = ctx;
  const usdc = new ethers.Contract(usdcAddress, ERC20_APPROVE_ABI, executorWallet);
  const amountRaw = parseUsdc(amountUSDC);

  const allowance = await usdc.allowance(walletAddress, slotMachineAddress);
  if (allowance.lt(amountRaw)) {
    const tx = await usdc.approve(slotMachineAddress, ethers.constants.MaxUint256);
    await tx.wait();
  }

  const depositTx = await slotMachine.depositTokens(slotMachineAddress, amountRaw);
  await depositTx.wait();
}

/**
 * Fetch fresh contract state and wallet USDC balance after a transfer.
 * @returns {{ bankrollUSDC, isClosed, usdcBalance, moneyInContractRaw }}
 */
async function fetchStateAfterTransfer(ctx, walletAddress) {
  const { slotMachine, usdcAddress, provider } = ctx;
  const [newMoneyRaw, newDebtRaw, newIsClosed] = await Promise.all([
    slotMachine.getMoneyInContract(),
    slotMachine.getCurrentDebt(),
    slotMachine.isClosed(),
  ]);
  const newWalletRaw = await new ethers.Contract(
    usdcAddress,
    ERC20_BALANCE_ABI,
    provider
  ).balanceOf(walletAddress);

  const bankrollUSDC = parseFloat(fmtUsdc(newMoneyRaw.sub(newDebtRaw)));
  const usdcBalance = parseFloat(fmtUsdc(newWalletRaw));

  return {
    bankrollUSDC,
    isClosed: newIsClosed,
    usdcBalance,
    moneyInContractRaw: newMoneyRaw,
  };
}

// ─── createCronRouter ─────────────────────────────────────────────────────

/**
 * @param {Object} deps
 * @param {ethers.Contract} deps.slotMachine - SlotMachineV2 contract (connected to executor)
 * @param {ethers.Contract} deps.vrfCoordinator
 * @param {ethers.Wallet} deps.executorWallet
 * @param {ethers.providers.Provider} deps.provider
 * @param {string} deps.slotMachineAddress
 * @param {string} deps.payTo - Executor wallet address
 * @param {string} deps.usdcAddress
 * @param {string} [deps.vrfSubscriptionId]
 */
export function createCronRouter(deps) {
  const router = express.Router();
  const {
    slotMachine,
    vrfCoordinator,
    executorWallet,
    provider,
    slotMachineAddress,
    payTo,
    usdcAddress,
    vrfSubscriptionId,
  } = deps;

  const ctx = {
    slotMachine,
    vrfCoordinator,
    executorWallet,
    provider,
    usdcAddress,
    slotMachineAddress,
  };

  router.get("/health", async (_req, res) => {
    const timestamp = new Date().toISOString();
    const walletAddress = payTo || executorWallet.address;

    try {
      // ═══════════════════════════════════════════════════════════════════
      // 1. FETCH WALLET STATE (ETH + USDC)
      // ═══════════════════════════════════════════════════════════════════

      const [ethBalance, usdcBalanceRaw] = await Promise.all([
        provider.getBalance(walletAddress),
        new ethers.Contract(usdcAddress, ERC20_BALANCE_ABI, provider)
          .balanceOf(walletAddress)
          .catch(() => ethers.BigNumber.from(0)),
      ]);

      let usdcBalance = parseFloat(fmtUsdc(usdcBalanceRaw));
      const ethBalanceNum = parseFloat(fmtEth(ethBalance));

      const wallet = {
        address: walletAddress,
        eth: {
          value: fmtEth(ethBalance),
          ok: ethBalanceNum >= constants.WALLET_MIN_ETH_TRIGGER,
          min: String(constants.WALLET_MIN_ETH_TRIGGER),
          target: String(constants.WALLET_TARGET_ETH),
        },
        usdc: {
          value: String(usdcBalance),
          ok: usdcBalance >= constants.WALLET_MIN_USDC_BUFFER,
          minBuffer: String(constants.WALLET_MIN_USDC_BUFFER),
          targetBuffer: String(constants.WALLET_TARGET_USDC_BUFFER),
        },
      };

      const alertCritical = [];
      const alertWarning = [];
      const alertInfo = [];

      // ═══════════════════════════════════════════════════════════════════
      // 2. PASSIVE ALERTS (no on-chain actions)
      // ═══════════════════════════════════════════════════════════════════

      if (ethBalanceNum < constants.WALLET_MIN_ETH_TRIGGER) {
        const topup = Math.max(0, constants.WALLET_TARGET_ETH - ethBalanceNum);
        alertCritical.push({
          key: "eth_low",
          msg: `<b>🚨 CRITICAL: Executor ETH Low</b>

Current ETH balance: ${ethBalanceNum.toFixed(4)} ETH
Minimum required: ${constants.WALLET_MIN_ETH_TRIGGER} ETH
Target balance: ${constants.WALLET_TARGET_ETH} ETH

The agent cannot safely execute transactions.

<b>Action required:</b>
Send ETH to the Executor wallet:
${walletAddress}

<b>Recommended top-up:</b> ${topup.toFixed(4)} ETH.`,
        });
      }

      if (usdcBalance < constants.WALLET_MIN_USDC_BUFFER) {
        const topup = Math.max(
          0,
          constants.WALLET_TARGET_USDC_BUFFER - usdcBalance
        );
        alertInfo.push({
          key: "wallet_usdc_low",
          msg: `<b>ℹ️ INFO: Wallet USDC Buffer Low</b>

Current wallet USDC: ${usdcBalance.toFixed(1)} USDC
Minimum buffer: ${constants.WALLET_MIN_USDC_BUFFER} USDC
Target buffer: ${constants.WALLET_TARGET_USDC_BUFFER} USDC

The system is still operational, but liquidity is tight.

<b>Recommended action:</b>
Send USDC to the Executor wallet:
${walletAddress}

<b>Recommended top-up:</b> ${topup.toFixed(1)} USDC.`,
        });
      }

      // ═══════════════════════════════════════════════════════════════════
      // 3. FETCH CONTRACT STATE
      // ═══════════════════════════════════════════════════════════════════

      let [isClosed, moneyInContractRaw, currentDebtRaw] = await Promise.all([
        slotMachine.isClosed(),
        slotMachine.getMoneyInContract(),
        slotMachine.getCurrentDebt(),
      ]);

      const moneyInContract = moneyInContractRaw.sub(currentDebtRaw);
      let bankrollUSDC = parseFloat(fmtUsdc(moneyInContract));
      const currentDebtUSDC = parseFloat(fmtUsdc(currentDebtRaw));

      const contract = {
        address: slotMachineAddress,
        isClosed,
        moneyInContractUSDC: fmtUsdc(moneyInContractRaw),
        currentDebtUSDC: String(currentDebtUSDC),
        bankrollUSDC: String(bankrollUSDC),
        minTriggerUSDC: String(constants.CONTRACT_TOPUP_TRIGGER_BANKROLL_USDC),
        targetUSDC: String(constants.CONTRACT_TARGET_BANKROLL_USDC),
      };

      // ═══════════════════════════════════════════════════════════════════
      // 4. CONTRACT NEEDS FUNDING (closed or bankroll < trigger)
      // Transfer capped at target (90 USDC). Never exceed target.
      // ═══════════════════════════════════════════════════════════════════

      const contractNeedsFunding =
        isClosed ||
        bankrollUSDC < constants.CONTRACT_TOPUP_TRIGGER_BANKROLL_USDC;

      if (contractNeedsFunding) {
        if (usdcBalance < constants.WALLET_MIN_USDC_BUFFER) {
          const walletNeeded = constants.WALLET_MIN_USDC_BUFFER - usdcBalance;
          const contractNeeded =
            constants.CONTRACT_TARGET_BANKROLL_USDC - bankrollUSDC;
          const totalNeeded = walletNeeded + contractNeeded;
          alertCritical.push({
            key: "contract_wallet_critical",
            msg: `<b>🚨 CRITICAL: Contract Requires Funding – Wallet Below Minimum Buffer</b>

Current contract bankroll: ${bankrollUSDC.toFixed(1)} USDC
Target bankroll: ${constants.CONTRACT_TARGET_BANKROLL_USDC} USDC

Current wallet USDC: ${usdcBalance.toFixed(1)} USDC
Minimum wallet buffer: ${constants.WALLET_MIN_USDC_BUFFER} USDC

The wallet does not have sufficient liquidity to safely refill the contract.

<b>Action required:</b>
Send USDC to the Executor wallet:
${walletAddress}

<b>Mandatory top-up:</b> ${totalNeeded.toFixed(1)} USDC
For wallet: ${walletNeeded.toFixed(1)} USDC
For contract: ${Math.max(0, contractNeeded).toFixed(1)} USDC.`,
          });
        } else {
          const excess = usdcBalance - constants.WALLET_MIN_USDC_BUFFER;
          const neededToTarget =
            constants.CONTRACT_TARGET_BANKROLL_USDC - bankrollUSDC;
          const amountToSend = Math.min(excess, neededToTarget);

          if (amountToSend > 0) {
            const stillNeeded = Math.max(
              0,
              constants.CONTRACT_TARGET_BANKROLL_USDC - (bankrollUSDC + amountToSend)
            );

            const reasons = [];
            if (isClosed) reasons.push("Contract Closed");
            if (bankrollUSDC < constants.CONTRACT_TARGET_BANKROLL_USDC)
              reasons.push("Below Target");
            const reason = reasons.join(" and ");

            sendTelegramAlert(
              "auto_topup_pre",
              `<b>ℹ️ AUTO TOP-UP: Initiating Transfer</b>

<b>Reason:</b> Contract needs funding - (${reason})

Sending wallet USDC above buffer to contract.

<b>Amount to send:</b> ${amountToSend.toFixed(1)} USDC
<b>Still needed after transfer:</b> ${stillNeeded.toFixed(1)} USDC (to reach target ${constants.CONTRACT_TARGET_BANKROLL_USDC})`
            ).catch(() => {});

            try {
              const bankrollBefore = bankrollUSDC;

              await transferUsdcToContract(ctx, walletAddress, amountToSend);

              const after = await fetchStateAfterTransfer(ctx, walletAddress);
              bankrollUSDC = after.bankrollUSDC;
              isClosed = after.isClosed;
              usdcBalance = after.usdcBalance;
              moneyInContractRaw = after.moneyInContractRaw;

              Object.assign(contract, {
                isClosed,
                moneyInContractUSDC: fmtUsdc(after.moneyInContractRaw),
                bankrollUSDC: String(bankrollUSDC),
              });
              Object.assign(wallet.usdc, { value: String(usdcBalance) });

              if (!isClosed) {
                alertInfo.push({
                  key: "auto_topup_success",
                  msg: `<b>✅ AUTO TOP-UP SUCCESS: Contract Reopened</b>

<b>Reason:</b> Contract was CLOSED and required funding.

Contract bankroll: ${bankrollBefore.toFixed(1)} → ${bankrollUSDC.toFixed(1)} USDC
<b>Top-up sent:</b> ${amountToSend.toFixed(1)} USDC
<b>Wallet USDC (after):</b> ${usdcBalance.toFixed(1)} USDC

Status:
✅ Contract is now OPEN. Spins can resume.`,
                });
              } else {
                const remainingNeeded =
                  constants.CONTRACT_TARGET_BANKROLL_USDC - bankrollUSDC;
                alertWarning.push({
                  key: "auto_topup_partial",
                  msg: `<b>⚠️ AUTO TOP-UP PARTIAL: Contract Still Closed</b>

An automatic top-up was executed, but it was not enough to reopen the contract.

Contract bankroll: ${bankrollBefore.toFixed(1)} → ${bankrollUSDC.toFixed(1)} USDC
Target bankroll: ${constants.CONTRACT_TARGET_BANKROLL_USDC} USDC
<b>Top-up sent:</b> ${amountToSend.toFixed(1)} USDC
<b>Wallet USDC (after):</b> ${usdcBalance.toFixed(1)} USDC

Status:
⛔ Contract is STILL CLOSED.

<b>Action required:</b>
Send additional USDC to the Executor wallet:
${walletAddress}

<b>Required top-up (minimum):</b> ${remainingNeeded.toFixed(1)} USDC`,
                });
              }
            } catch (err) {
              console.error("[cron] Auto top-up failed:", err.message);
              alertCritical.push({
                key: "auto_topup_error",
                msg: `<b>❌ AUTO TOP-UP FAILED</b>

<b>Reason:</b> Transfer to contract failed.

<b>Error:</b> ${err.message}
<b>Executor wallet:</b> ${walletAddress}
<b>Intended top-up:</b> ${amountToSend.toFixed(1)} USDC

If this persists, top up ETH for gas and retry.`,
              });
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 5. DEV CLAIM (withdraw to wallet when pending >= 5 USDC)
      // ═══════════════════════════════════════════════════════════════════

      const [earnedRaw, claimedRaw] = await Promise.all([
        slotMachine.totalMoneyEarnedByDevs(),
        slotMachine.totalMoneyClaimedByDevs(),
      ]);
      const pendingDevUSDC = parseFloat(fmtUsdc(earnedRaw.sub(claimedRaw)));

      if (pendingDevUSDC >= constants.DEV_CLAIM_MIN_USDC) {
        try {
          const usdcForBalance = new ethers.Contract(
            usdcAddress,
            ERC20_BALANCE_ABI,
            provider
          );
          const walletBeforeClaim = await usdcForBalance.balanceOf(walletAddress);
          const claimTx = await slotMachine.claimDevEarnings();
          await claimTx.wait();
          const walletAfterClaim = await usdcForBalance.balanceOf(walletAddress);
          const receivedUSDC = parseFloat(
            fmtUsdc(walletAfterClaim.sub(walletBeforeClaim))
          );

          if (receivedUSDC > 0) {
            usdcBalance += receivedUSDC;
            Object.assign(wallet.usdc, { value: String(usdcBalance) });

            alertInfo.push({
              key: "dev_claim",
              msg: `<b>💰 DEV FEES WITHDRAWN</b>

Dev fees were claimed and sent to the Executor wallet.

<b>Amount withdrawn:</b> ${receivedUSDC.toFixed(1)} USDC
<b>Wallet address:</b> ${walletAddress}
<b>Wallet USDC (after):</b> ${usdcBalance.toFixed(1)} USDC`,
            });
          }
        } catch (err) {
          if (!err.message?.includes("team")) {
            console.error("[cron] Dev claim failed:", err.message);
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 6. WALLET EXCESS → CONTRACT (when bankroll < target, excess >= 5)
      // Transfer min(excess, neededToTarget). Never exceed target.
      // ═══════════════════════════════════════════════════════════════════

      const bankrollBelowTarget =
        bankrollUSDC < constants.CONTRACT_TARGET_BANKROLL_USDC;
      const excessUSDC = usdcBalance - constants.WALLET_MIN_USDC_BUFFER;

      if (
        bankrollBelowTarget &&
        excessUSDC >= constants.WALLET_EXCESS_MIN_FOR_CONTRACT_USDC
      ) {
        const neededToTarget =
          constants.CONTRACT_TARGET_BANKROLL_USDC - bankrollUSDC;
        const amountToSend = Math.min(excessUSDC, neededToTarget);
        const bankrollAfter = bankrollUSDC + amountToSend;

        sendTelegramAlert(
          "auto_topup_pre",
          `<b>ℹ️ AUTO TOP-UP: Initiating Transfer</b>

Contract bankroll below target. Sending excess wallet USDC to contract.

<b>Amount to send:</b> ${amountToSend.toFixed(1)} USDC
<b>New contract bankroll (after):</b> ${bankrollAfter.toFixed(1)} USDC`
        ).catch(() => {});

        try {
          const bankrollBeforeReinforce = bankrollUSDC;

          await transferUsdcToContract(ctx, walletAddress, amountToSend);

          const after = await fetchStateAfterTransfer(ctx, walletAddress);
          bankrollUSDC = after.bankrollUSDC;
          isClosed = after.isClosed;
          usdcBalance = after.usdcBalance;

          Object.assign(contract, {
            isClosed,
            moneyInContractUSDC: fmtUsdc(after.moneyInContractRaw),
            bankrollUSDC: String(bankrollUSDC),
          });
          Object.assign(wallet.usdc, { value: String(usdcBalance) });

          alertInfo.push({
            key: "auto_topup_success",
            msg: `<b>✅ AUTO TOP-UP SUCCESS: Bankroll Reinforced</b>

<b>Reason:</b> Contract was OPEN but below target. Bankroll reinforced.

<b>Amount sent:</b> ${amountToSend.toFixed(1)} USDC
<b>Contract bankroll:</b> ${bankrollBeforeReinforce.toFixed(1)} → ${bankrollUSDC.toFixed(1)} USDC
<b>Wallet USDC (after):</b> ${usdcBalance.toFixed(1)} USDC

Status:
✅ Contract bankroll reinforced.`,
          });
        } catch (err) {
          console.error("[cron] Wallet excess top-up failed:", err.message);
          alertCritical.push({
            key: "auto_topup_error",
            msg: `<b>❌ AUTO TOP-UP FAILED</b>

<b>Reason:</b> Transfer to contract failed.

<b>Error:</b> ${err.message}
<b>Executor wallet:</b> ${walletAddress}
<b>Intended top-up:</b> ${amountToSend.toFixed(1)} USDC

If this persists, top up ETH for gas and retry.`,
          });
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 7. VRF SUBSCRIPTION (read-only, build VRF LINK low alert)
      // ═══════════════════════════════════════════════════════════════════

      let vrf = {
        subscriptionId: vrfSubscriptionId || null,
        paymentMode: "unknown",
        error: null,
      };

      const useNativePayment = await slotMachine.useNativePayment().catch(() => false);
      vrf.paymentMode = useNativePayment ? "native" : "link";

      if (vrfSubscriptionId) {
        try {
          const sub = await vrfCoordinator.getSubscription(vrfSubscriptionId);
          const linkBal = sub.balance;
          const nativeBal = sub.nativeBalance;
          const linkBalNum = parseFloat(fmtLink(linkBal));
          const nativeBalNum = parseFloat(fmtEth(nativeBal));

          if (useNativePayment) {
            vrf.native = {
              value: fmtEth(nativeBal),
              ok: nativeBalNum >= constants.WALLET_MIN_ETH_TRIGGER,
              min: String(constants.WALLET_MIN_ETH_TRIGGER),
              target: String(constants.WALLET_TARGET_ETH),
            };
          } else {
            vrf.link = {
              value: fmtLink(linkBal),
              ok: linkBalNum >= constants.VRF_MIN_LINK_TRIGGER,
              min: String(constants.VRF_MIN_LINK_TRIGGER),
              target: String(constants.VRF_TARGET_LINK),
            };
            if (linkBalNum < constants.VRF_MIN_LINK_TRIGGER) {
              const topup = Math.max(0, constants.VRF_TARGET_LINK - linkBalNum);
              alertWarning.push({
                key: "vrf_link_low",
                msg: `<b>⚠️ WARNING: VRF Subscription LINK Low</b>

Current LINK balance: ${linkBalNum.toFixed(2)} LINK
Minimum threshold: ${constants.VRF_MIN_LINK_TRIGGER} LINK
Target balance: ${constants.VRF_TARGET_LINK} LINK

If LINK runs out, new spins will fail.

<b>Action required:</b>
Top up the Chainlink VRF subscription
Subscription ID: ${vrfSubscriptionId}

<b>Recommended top-up:</b> ${topup.toFixed(2)} LINK.`,
              });
            }
          }
        } catch (err) {
          vrf.error = err.message;
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 8. SEND TELEGRAM ALERTS (critical → warning → info)
      // ═══════════════════════════════════════════════════════════════════

      for (const a of alertCritical) {
        await sendTelegramAlert(a.key, a.msg).catch(() => {});
      }
      for (const a of alertWarning) {
        await sendTelegramAlert(a.key, a.msg).catch(() => {});
      }
      for (const a of alertInfo) {
        await sendTelegramAlert(a.key, a.msg).catch(() => {});
      }

      res.json({
        timestamp,
        network: "base",
        wallet,
        contract,
        vrf,
      });
    } catch (err) {
      console.error("[cron/health] error:", err.message);
      res.status(500).json({
        timestamp: new Date().toISOString(),
        error: err.message,
      });
    }
  });

  return router;
}
