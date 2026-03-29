import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useAccount, useContractRead, useDisconnect, useEnsName, useWalletClient } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import externalContracts from "~~/contracts/externalContracts";
import { useTranslation } from "~~/i18n";
import scaffoldConfig from "~~/scaffold.config";

// x402 loaded dynamically to avoid blocking SSR/page compilation

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:4021";
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 60;

const SlotMachine = (): JSX.Element => {
  // Reel array: maps VRF index (0-9) to symbol name
  const { t } = useTranslation();
  const reel = ["DOGE", "DOGE", "DOGE", "DOGE", "DOGE", "BNB", "BNB", "ETH", "ETH", "BTC"];

  const [firstResult, setFirstResult] = useState<number>(0);
  const [secondResult, setSecondResult] = useState<number>(0);
  const [thirdResult, setThirdResult] = useState<number>(0);

  const [, setIsRolling] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [reelsStopped, setReelsStopped] = useState<[boolean, boolean, boolean]>([true, true, true]);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ status: "success" | "error" | "nothing"; amount?: string } | null>(
    null,
  );
  const [spinError, setSpinError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ won: boolean; prize?: string } | null>(null);

  // Check localStorage for disclaimer acceptance on mount
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("lotero_disclaimer_accepted") === "true") {
      setDisclaimerAccepted(true);
    }
  }, []);

  const acceptDisclaimer = () => {
    localStorage.setItem("lotero_disclaimer_accepted", "true");
    setDisclaimerAccepted(true);
  };
  const casinoSoundRef = useRef<HTMLAudioElement | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  const router = useRouter();
  const referralFromUrl = router.query.ref?.toString() || "";
  const referralUserAddress = referralFromUrl || "0x0000000000000000000000000000000000000000";
  const isReferred = referralFromUrl.length > 0;
  const [referralBannerDismissed, setReferralBannerDismissed] = useState(false);

  const chainId = scaffoldConfig.targetNetwork.id;
  const mockUSDTContract = externalContracts[chainId][0].contracts.USDT;
  const slotMachineContract = externalContracts[chainId][0].contracts.SlotMachine;

  const { address: connectedAddress } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address: connectedAddress, chainId: 1 });
  const { data: walletClient } = useWalletClient();

  const userInfo = {
    moneyAdded: 0,
    moneyEarned: 0,
    moneyClaimed: 0,
    active: false,
    referringUserAddress: "0x0000000000000000000000000000000000000000",
    earnedByReferrals: 0,
    claimedByReferrals: 0,
  };

  const { data: tokenUserBalance, refetch: refetchBalance } = useContractRead({
    address: mockUSDTContract.address,
    abi: mockUSDTContract.abi,
    functionName: "balanceOf",
    args: [connectedAddress as string],
    enabled: !!connectedAddress,
  });

  const { data: userInfoTx, refetch: refetchUserInfo } = useContractRead({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "infoPerUser",
    args: [connectedAddress as string],
    enabled: !!connectedAddress,
  });

  if (userInfoTx) {
    const values = Object.values(userInfoTx);
    userInfo.moneyAdded = values[0] as any;
    userInfo.moneyEarned = values[1] as any;
    userInfo.moneyClaimed = values[2] as any;
    userInfo.active = values[3] as boolean;
    userInfo.referringUserAddress = values[4] as string;
    userInfo.earnedByReferrals = values[5] as any;
    userInfo.claimedByReferrals = values[6] as any;
  }

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  // ─── x402 signer creation ────────────────────────────────────────────────
  const createX402Fetch = useCallback(async () => {
    if (!walletClient || !connectedAddress) throw new Error("Wallet not connected");

    // Dynamic import to avoid blocking SSR
    const [{ x402Client, wrapFetchWithPayment }, { registerExactEvmScheme }] = await Promise.all([
      import("@x402/fetch" as any),
      import("@x402/evm/exact/client" as any),
    ]);

    const signer = {
      address: connectedAddress as `0x${string}`,
      signTypedData: async (params: {
        domain: Record<string, unknown>;
        types: Record<string, unknown>;
        primaryType: string;
        message: Record<string, unknown>;
      }): Promise<`0x${string}`> => {
        console.log("[x402] signTypedData called");
        try {
          // Use wagmi walletClient which handles EIP-712 serialization correctly
          const signature = await walletClient.signTypedData({
            account: walletClient.account,
            domain: params.domain as any,
            types: params.types as any,
            primaryType: params.primaryType as any,
            message: params.message as any,
          });
          console.log("[x402] Signature obtained:", signature);
          return signature;
        } catch (err: any) {
          console.error("[x402] signTypedData FAILED:", err.message);
          throw err;
        }
      },
    };

    const client = new x402Client();
    registerExactEvmScheme(client, { signer });
    return wrapFetchWithPayment(fetch, client);
  }, [walletClient, connectedAddress]);

  // ─── Reset states ─────────────────────────────────────────────────────────
  const resetStates = () => {
    setIsPlaying(false);
    setIsRolling(false);
    setIsWaitingForResponse(false);
    stopSoundCasino();
  };

  // ─── Poll for round result ───────────────────────────────────────────────
  const pollForResult = async (requestId: string) => {
    const abortController = new AbortController();
    pollAbortRef.current = abortController;

    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      if (abortController.signal.aborted) throw new Error("Polling aborted");

      try {
        const res = await fetch(`${AGENT_URL}/round?requestId=${requestId}`, {
          signal: abortController.signal,
        });
        if (!res.ok) throw new Error(`Round fetch failed: ${res.status}`);
        const data = await res.json();
        if (data.resolved) {
          return {
            n1: Number(data.round.number1),
            n2: Number(data.round.number2),
            n3: Number(data.round.number3),
            hasWon: data.round.hasWon,
            prize: data.round.prize,
          };
        }
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        console.error("Poll error:", err.message);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error("Timed out waiting for VRF result");
  };

  // ─── Handle spin via agent ────────────────────────────────────────────────
  const handleSpin = async () => {
    if (!connectedAddress) {
      handleConnect();
      return;
    }
    if (isPlaying || isWaitingForResponse) return;

    if (!tokenUserBalance || tokenUserBalance < BigInt(1100000)) {
      setSpinError(t("index.needUsdc"));
      (document.getElementById("spin_error_modal") as HTMLDialogElement)?.showModal();
      return;
    }

    try {
      setIsPlaying(true);
      setLastResult(null);
      startClickSound();

      const fetchWithPayment = await createX402Fetch();

      const res = await fetchWithPayment(`${AGENT_URL}/spinWith1USDC`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: connectedAddress,
          referral: referralUserAddress === "0x0000000000000000000000000000000000000000" ? null : referralUserAddress,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error("[x402] Response:", res.status, errBody);
        // Parse error for user-friendly message
        let userMsg = t("index.spinError");
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error?.includes("Settlement failed")) userMsg = t("index.settlementFailed");
          else if (parsed.error?.includes("Contract unhealthy")) userMsg = t("index.contractUnhealthy");
          else if (parsed.details) userMsg = parsed.details;
        } catch {
          if (errBody.includes("execution reverted")) userMsg = t("index.executionReverted");
        }
        throw new Error(userMsg);
      }

      const { requestId } = await res.json();
      console.log("Spin requested via agent. requestId:", requestId);

      startSoundCasino("/casino.mp3");
      startSlotMachine();
      setIsWaitingForResponse(true);

      const result = await pollForResult(requestId);

      stopSoundCasino();
      setFirstResult(result.n1);
      setSecondResult(result.n2);
      setThirdResult(result.n3);
      stopSlotMachine();

      resetStates();
      refetchBalance();
      refetchUserInfo();

      if (result.hasWon) {
        const prize =
          reel[result.n1] === "BTC" ? "30" : reel[result.n1] === "ETH" ? "20" : reel[result.n1] === "BNB" ? "14" : "5";
        setLastResult({ won: true, prize });
        setShowWinCelebration(true);
        startWinSound();
        setTimeout(() => setShowWinCelebration(false), 4000);
      } else {
        setLastResult({ won: false });
      }
      // Clear result message after 6 seconds
      setTimeout(() => setLastResult(null), 6000);
    } catch (error: any) {
      console.error("Spin error:", error);
      resetStates();
      if (error.name === "AbortError") return;
      if (error.message?.includes("rejected") || error.message?.includes("denied")) return;

      // Map technical errors to user-friendly messages
      const msg = error.message || "";
      let userMsg = t("index.spinError");
      if (msg.includes("connection") || msg.includes("chunk") || msg.includes("fetch")) {
        userMsg = t("index.connectionError");
      } else if (msg.includes("Wallet not connected")) {
        userMsg = t("index.walletNotConnected");
      } else if (
        msg === t("index.settlementFailed") ||
        msg === t("index.contractUnhealthy") ||
        msg === t("index.executionReverted") ||
        msg === t("index.needUsdc")
      ) {
        userMsg = msg; // Already user-friendly from our error handler above
      }

      setSpinError(userMsg);
      (document.getElementById("spin_error_modal") as HTMLDialogElement)?.showModal();
    }
  };

  // ─── Handle claim via agent ───────────────────────────────────────────────
  const handleClaim = async () => {
    if (!connectedAddress) {
      handleConnect();
      return;
    }

    setIsClaiming(true);
    setClaimResult(null);

    try {
      const claimableAmount = formatUnits(BigInt(winBalance + referralBalance), 6);
      const fetchWithPayment = await createX402Fetch();
      const res = await fetchWithPayment(`${AGENT_URL}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: connectedAddress }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Claim failed: ${res.status}`);
      }

      await res.json();
      refetchBalance();
      refetchUserInfo();
      setClaimResult({ status: "success", amount: claimableAmount });
      (document.getElementById("claim_modal") as HTMLDialogElement)?.showModal();
    } catch (error: any) {
      console.error("Claim error:", error);
      if (error.message?.includes("rejected") || error.message?.includes("denied")) {
        setIsClaiming(false);
        return;
      }
      if (error.message?.includes("Nothing to claim")) {
        setClaimResult({ status: "nothing" });
      } else {
        setClaimResult({ status: "error" });
      }
      (document.getElementById("claim_modal") as HTMLDialogElement)?.showModal();
    }
    setIsClaiming(false);
  };

  // ─── Slot machine animation ──────────────────────────────────────────────
  function startSlotMachine() {
    setIsRolling(true);
    setReelsStopped([false, false, false]);
  }

  function stopSlotMachine() {
    // Stop reels one by one, left to right (like a real casino)
    setTimeout(() => {
      setReelsStopped(prev => [true, prev[1], prev[2]]);
      setTimeout(() => {
        setReelsStopped(prev => [prev[0], true, prev[2]]);
        setTimeout(() => {
          setReelsStopped(prev => [prev[0], prev[1], true]);
          setIsRolling(false);
        }, 700);
      }, 700);
    }, 500);
  }

  // ─── Sound functions ─────────────────────────────────────────────────────
  const startSoundCasino = (src: string) => {
    if (casinoSoundRef.current) {
      casinoSoundRef.current.src = src;
      casinoSoundRef.current.loop = true;
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      casinoSoundRef.current.play().catch(() => {});
    }
  };

  const stopSoundCasino = () => {
    if (casinoSoundRef.current) {
      casinoSoundRef.current.pause();
      casinoSoundRef.current.currentTime = 0;
    }
  };

  const startClickSound = () => {
    new Audio("/click.mp3").play().catch(e => console.debug("click sound:", e));
  };

  const startWinSound = () => {
    new Audio("/win.mp3").play().catch(e => console.debug("win sound:", e));
  };

  // ─── Referral ─────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}?ref=${connectedAddress}`;
  const copyToClipboard = () => {
    navigator.clipboard
      ?.writeText(referralLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
  };

  const { openConnectModal } = useConnectModal();
  const handleConnect = () => openConnectModal?.();

  // Generate LED lights for the cabinet border
  const ledCount = 40;
  const leds = Array.from({ length: ledCount }, (_, i) => i);

  const winBalance = userInfo.moneyEarned - userInfo.moneyClaimed;
  const referralBalance = userInfo.earnedByReferrals - userInfo.claimedByReferrals;

  return (
    <div className="casino-page">
      <MetaHeader />
      {/* Win celebration overlay */}
      {showWinCelebration && (
        <div className="win-celebration">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ["#ffd700", "#ff0000", "#00ff00", "#ff00ff", "#00ffff", "#ff6600"][
                  Math.floor(Math.random() * 6)
                ],
              }}
            />
          ))}
        </div>
      )}

      {/* Referral banner - shown when user arrives via referral link */}
      {isReferred && !referralBannerDismissed && (
        <div className="referral-banner">
          <span className="referral-banner-text">
            {t("index.referralBanner", {
              address: `${referralFromUrl.slice(0, 6)}...${referralFromUrl.slice(-4)}`,
            })}
          </span>
          <button className="referral-banner-close" onClick={() => setReferralBannerDismissed(true)}>
            &times;
          </button>
        </div>
      )}

      {/* Neon title */}
      <div className="neon-header">
        <h1 className="neon-title">LOTERO</h1>
        <p className="neon-subtitle">{t("index.subtitle")}</p>
        <Link href="/how-it-works" className="how-it-works-link">
          {t("index.howItWorks")}
        </Link>
      </div>

      {/* Main casino layout */}
      <div className="casino-layout">
        {/* Left panel - Balance */}
        <div className="casino-panel panel-left">
          <div className="panel-header">
            <div className="panel-led-strip">
              {[0, 1, 2, 3, 4].map(i => (
                <span key={i} className="panel-led" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <h2>{t("common.balance")}</h2>
          </div>
          <div className="panel-body">
            {connectedAddress ? (
              <div className="wallet-info">
                <span className="wallet-label">{t("common.player")}</span>
                <div className="wallet-row">
                  <code className="wallet-address">
                    {ensName || `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`}
                  </code>
                  <button className="wallet-disconnect" onClick={() => disconnect()}>
                    &times;
                  </button>
                </div>
              </div>
            ) : (
              <button className="casino-btn casino-btn-connect" onClick={handleConnect}>
                {t("common.connectWallet")}
              </button>
            )}
            <div className="balance-display">
              <span className="usdc-icon">$</span>
              <span className="balance-amount">
                {connectedAddress ? formatUnits(tokenUserBalance || 0n, 6) : "---"}
              </span>
              <span className="balance-label">USDC</span>
            </div>
            <button
              className="casino-btn casino-btn-secondary"
              onClick={() => {
                (document.getElementById("paytable_modal") as HTMLDialogElement)?.showModal();
              }}
            >
              {t("index.payTable")}
            </button>
          </div>
        </div>

        {/* Center - Slot Machine Cabinet */}
        <div className="slot-cabinet">
          {/* LED strip around cabinet */}
          <div className="led-strip led-strip-top">
            {leds.slice(0, 10).map(i => (
              <span key={i} className="led" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <div className="led-strip led-strip-bottom">
            {leds.slice(10, 20).map(i => (
              <span key={i} className="led" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <div className="led-strip led-strip-left">
            {leds.slice(20, 30).map(i => (
              <span key={i} className="led" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <div className="led-strip led-strip-right">
            {leds.slice(30, 40).map(i => (
              <span key={i} className="led" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>

          {/* Cabinet top - mini info */}
          <div className="cabinet-top">
            <div className="cabinet-display">
              <span className="display-label">{t("index.bet")}</span>
              <span className="display-value">1 USDC</span>
            </div>
            <div className="cabinet-display">
              <span className="display-label">{t("index.maxWin")}</span>
              <span className="display-value">30 USDC</span>
            </div>
          </div>

          {/* Reel window */}
          <div className="reel-window">
            {/* Win line indicators */}
            <div className="win-line-arrow left-arrow">&#9654;</div>
            <div className="win-line-arrow right-arrow">&#9664;</div>
            <div className="win-line" />

            <div className="slots">
              <div className={`reel ${!reelsStopped[0] ? "reel-spinning" : ""}`}>
                {reelsStopped[0] && (
                  <Image
                    src={`/logos/${reel[firstResult].toLowerCase()}.png`}
                    alt={reel[firstResult]}
                    width={79}
                    height={79}
                    className="reel-stopped-img"
                  />
                )}
              </div>
              <div className="reel-divider" />
              <div className={`reel ${!reelsStopped[1] ? "reel-spinning" : ""}`}>
                {reelsStopped[1] && (
                  <Image
                    src={`/logos/${reel[secondResult].toLowerCase()}.png`}
                    alt={reel[secondResult]}
                    width={79}
                    height={79}
                    className="reel-stopped-img"
                  />
                )}
              </div>
              <div className="reel-divider" />
              <div className={`reel ${!reelsStopped[2] ? "reel-spinning" : ""}`}>
                {reelsStopped[2] && (
                  <Image
                    src={`/logos/${reel[thirdResult].toLowerCase()}.png`}
                    alt={reel[thirdResult]}
                    width={79}
                    height={79}
                    className="reel-stopped-img"
                  />
                )}
              </div>
            </div>

            {/* Glass reflection overlay */}
            <div className="glass-overlay" />
          </div>

          {/* Result message - inline, no modal */}
          {lastResult && (
            <div className={`result-inline ${lastResult.won ? "result-win" : "result-lose"}`}>
              {lastResult.won ? `${t("index.youWon")} ${lastResult.prize} USDC!` : t("index.tryAgain")}
            </div>
          )}

          {/* Spin button area */}
          <div className="spin-area">
            <button
              className={`spin-btn ${isPlaying || isWaitingForResponse ? "spinning" : ""}`}
              onClick={handleSpin}
              disabled={
                isPlaying ||
                isWaitingForResponse ||
                (!!connectedAddress && (!tokenUserBalance || tokenUserBalance < BigInt(1100000)))
              }
            >
              <span className="spin-btn-inner">{t("index.spin")}</span>
            </button>
            <span className="spin-cost">{t("index.spinCost")}</span>
            <span className="spin-warning">{t("index.walletWarning")}</span>
          </div>
        </div>

        {/* Right panel - Rewards */}
        <div className="casino-panel panel-right">
          <div className="panel-header">
            <div className="panel-led-strip">
              {[0, 1, 2, 3, 4].map(i => (
                <span key={i} className="panel-led" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <h2>{t("common.rewards")}</h2>
          </div>
          <div className="panel-body">
            {connectedAddress ? (
              <>
                <div className="reward-row">
                  <span className="reward-label">{t("index.wins")}</span>
                  <span className="reward-amount">{formatUnits(BigInt(winBalance), 6)} USDC</span>
                </div>

                <div className="reward-row">
                  <span className="reward-label">{t("index.referrals")}</span>
                  <span className="reward-amount">{formatUnits(BigInt(referralBalance), 6)} USDC</span>
                </div>

                <div className="reward-divider" />

                <div className="reward-row reward-row-total">
                  <span className="reward-label">{t("index.total")}</span>
                  <span className="reward-amount">{formatUnits(BigInt(winBalance + referralBalance), 6)} USDC</span>
                </div>

                <button
                  className="casino-btn casino-btn-claim"
                  onClick={handleClaim}
                  disabled={winBalance + referralBalance <= 0 || isClaiming}
                >
                  {isClaiming ? t("index.claiming") : t("index.claimAll")}
                </button>
                <span className="fee-note">{t("index.serviceFee")}</span>

                <div className="reward-divider" />

                <a
                  href="#"
                  className="referral-link-btn"
                  onClick={e => {
                    e.preventDefault();
                    (document.getElementById("referral_modal") as HTMLDialogElement)?.showModal();
                  }}
                >
                  {t("index.inviteEarn")}
                </a>
              </>
            ) : (
              <p className="panel-placeholder">{t("index.connectToSeeRewards")}</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {/* Referral Modal */}
      <dialog id="referral_modal" className="modal">
        <div className="modal-box referral-modal">
          <h3 className="referral-modal-title">{t("index.referralTitle")}</h3>

          {/* How it works */}
          <div className="referral-how">
            <h4 className="referral-section-title">{t("index.referralHow")}</h4>
            <div className="referral-steps">
              <div className="referral-step">
                <span className="referral-step-num">1</span>
                <span className="referral-step-text">{t("index.referralStep1")}</span>
              </div>
              <div className="referral-step">
                <span className="referral-step-num">2</span>
                <span className="referral-step-text">{t("index.referralStep2")}</span>
              </div>
              <div className="referral-step">
                <span className="referral-step-num">3</span>
                <span className="referral-step-text">
                  {t("index.referralStep3Prefix")}
                  <strong>{t("index.referralStep3Bold")}</strong>
                  {t("index.referralStep3Suffix")}
                </span>
              </div>
            </div>
          </div>

          {/* Your stats */}
          {connectedAddress && (
            <div className="referral-stats">
              <h4 className="referral-section-title">{t("index.referralEarnings")}</h4>
              <div className="referral-stats-grid">
                <div className="referral-stat">
                  <span className="referral-stat-value">{formatUnits(BigInt(userInfo.earnedByReferrals), 6)}</span>
                  <span className="referral-stat-label">{t("index.usdcEarned")}</span>
                </div>
                <div className="referral-stat">
                  <span className="referral-stat-value">{formatUnits(BigInt(referralBalance), 6)}</span>
                  <span className="referral-stat-label">{t("index.usdcPending")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Your link */}
          <div className="referral-link-section">
            <h4 className="referral-section-title">{t("index.referralLinkTitle")}</h4>
            <div className="referral-link">
              <input type="text" value={referralLink} readOnly className="referral-input" />
              <button onClick={copyToClipboard} className="casino-btn casino-btn-copy">
                {copied ? t("index.copied") : t("index.copy")}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="referral-share">
            <h4 className="referral-section-title">{t("index.shareVia")}</h4>
            <div className="referral-share-buttons">
              <a
                className="share-btn share-btn-x"
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                  t("index.shareText") + "\n\n",
                )}&url=${encodeURIComponent(referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                X / Twitter
              </a>
              <a
                className="share-btn share-btn-tg"
                href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(
                  t("index.shareText"),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram
              </a>
              <a
                className="share-btn share-btn-wa"
                href={`https://wa.me/?text=${encodeURIComponent(t("index.shareText") + "\n" + referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">{t("common.close")}</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Pay Table Modal */}
      <dialog id="paytable_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg neon-text">{t("index.payTableTitle")}</h3>
          <div className="pay-table">
            <table>
              <thead>
                <tr>
                  <th>{t("index.coin")}</th>
                  <th>{t("index.match")}</th>
                  <th>{t("index.payout")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Image src="/logos/doge.png" alt="DOGE" width={50} height={50} />
                  </td>
                  <td>DOGE x 3</td>
                  <td className="payout-cell">5 USDC</td>
                </tr>
                <tr>
                  <td>
                    <Image src="/logos/bnb.png" alt="BNB" width={50} height={50} />
                  </td>
                  <td>BNB x 3</td>
                  <td className="payout-cell">14 USDC</td>
                </tr>
                <tr>
                  <td>
                    <Image src="/logos/eth.png" alt="ETH" width={50} height={50} />
                  </td>
                  <td>ETH x 3</td>
                  <td className="payout-cell">20 USDC</td>
                </tr>
                <tr className="jackpot-row">
                  <td>
                    <Image src="/logos/btc.png" alt="BTC" width={50} height={50} />
                  </td>
                  <td>BTC x 3</td>
                  <td className="payout-cell">30 USDC</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">{t("common.close")}</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Error Modal */}
      <dialog id="error_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("index.gameClosed")}</h3>
          <p className="py-4">{t("index.gameClosedMsg")}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">{t("common.close")}</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Spin Error Modal */}
      <dialog id="spin_error_modal" className="modal">
        <div className="modal-box result-modal modal-lose">
          <h3 className="result-title">{t("index.spinErrorTitle")}</h3>
          <p className="claim-modal-msg">{spinError}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">{t("common.close")}</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Claim Result Modal */}
      <dialog id="claim_modal" className="modal">
        <div className={`modal-box result-modal ${claimResult?.status === "success" ? "modal-win" : "modal-lose"}`}>
          <h3 className="result-title">
            {claimResult?.status === "success"
              ? t("index.claimSuccessTitle")
              : claimResult?.status === "nothing"
              ? t("index.nothingToClaimTitle")
              : t("index.claimErrorTitle")}
          </h3>
          {claimResult?.status === "success" && (
            <div className="win-prize-display">
              <span className="win-amount-label">{t("index.claimedAmount")}</span>
              <span className="win-amount">{claimResult.amount} USDC</span>
            </div>
          )}
          {claimResult?.status === "nothing" && <p className="claim-modal-msg">{t("index.nothingToClaim")}</p>}
          {claimResult?.status === "error" && <p className="claim-modal-msg">{t("index.claimError")}</p>}
          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">{t("common.close")}</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Disclaimer Modal */}
      {!disclaimerAccepted && (
        <div className="disclaimer-overlay">
          <div className="disclaimer-modal">
            <div className="disclaimer-icon">18+</div>
            <h3 className="disclaimer-title">{t("index.disclaimerTitle")}</h3>
            <div className="disclaimer-text">
              <p>{t("index.disclaimerIntro")}</p>
              <p>{t("index.disclaimerAck")}</p>
              <ul>
                <li>{t("index.disclaimerAge18")}</li>
                <li>{t("index.disclaimerExperimental")}</li>
                <li>{t("index.disclaimerRisk")}</li>
                <li>{t("index.disclaimerLaws")}</li>
              </ul>
            </div>
            <button className="casino-btn disclaimer-accept-btn" onClick={acceptDisclaimer}>
              {t("index.disclaimerAccept")}
            </button>
          </div>
        </div>
      )}

      <audio ref={casinoSoundRef} />
    </div>
  );
};

export default SlotMachine;
