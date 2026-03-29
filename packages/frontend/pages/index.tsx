import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useAccount, useContractRead, useDisconnect, useEnsName } from "wagmi";
import externalContracts from "~~/contracts/externalContracts";
import scaffoldConfig from "~~/scaffold.config";

// x402 loaded dynamically to avoid blocking SSR/page compilation

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:4021";
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 60;

const SlotMachine = (): JSX.Element => {
  const reel = ["DOGE", "DOGE", "DOGE", "DOGE", "DOGE", "BNB", "BNB", "ETH", "ETH", "BTC"];

  const [firstResult, setFirstResult] = useState<number>(0);
  const [secondResult, setSecondResult] = useState<number>(0);
  const [thirdResult, setThirdResult] = useState<number>(0);

  const num_icons = 10;
  const icon_height = 79;
  const [isRolling, setIsRolling] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const rollIntervalRef = useRef<NodeJS.Timer | undefined>(undefined);
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

  const { address: connectedAddress, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address: connectedAddress, chainId: 1 });

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
  });

  const { data: userInfoTx, refetch: refetchUserInfo } = useContractRead({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "infoPerUser",
    args: [connectedAddress as string],
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
    if (!connector || !connectedAddress) throw new Error("Wallet not connected");
    const walletProvider = await connector.getProvider();

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
        const typesWithoutDomain = { ...params.types };
        delete typesWithoutDomain["EIP712Domain"];
        const typedData = {
          domain: params.domain,
          types: typesWithoutDomain,
          primaryType: params.primaryType,
          message: params.message,
        };
        const signature = await (walletProvider as any).request({
          method: "eth_signTypedData_v4",
          params: [
            connectedAddress,
            JSON.stringify(typedData, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
          ],
        });
        return signature as `0x${string}`;
      },
    };

    const client = new x402Client();
    registerExactEvmScheme(client, { signer });
    return wrapFetchWithPayment(fetch, client);
  }, [connector, connectedAddress]);

  // ─── Reset states ─────────────────────────────────────────────────────────
  const resetStates = () => {
    setIsPlaying(false);
    setIsRolling(false);
    setIsWaitingForResponse(false);
    stopSoundCasino();
    if (rollIntervalRef.current) {
      clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = undefined;
    }
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
      alert("You need at least 1.1 USDC to play (1 USDC bet + 0.1 USDC agent fee).");
      return;
    }

    try {
      setIsPlaying(true);
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
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Agent returned ${res.status}`);
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
      stopSlotMachine(result.n1, result.n2, result.n3);

      resetStates();
      refetchBalance();
      refetchUserInfo();

      const modal = document.getElementById("result_modal") as HTMLDialogElement | null;
      modal?.showModal();

      if (result.hasWon) {
        setShowWinCelebration(true);
        startWinSound();
        setTimeout(() => setShowWinCelebration(false), 4000);
      }
    } catch (error: any) {
      console.error("Spin error:", error);
      resetStates();
      if (error.name === "AbortError") return;
      if (error.message?.includes("rejected") || error.message?.includes("denied")) return;
      alert(error.message || "An error occurred while playing. Please try again.");
    }
  };

  // ─── Handle claim via agent ───────────────────────────────────────────────
  const handleClaim = async () => {
    if (!connectedAddress) {
      handleConnect();
      return;
    }

    try {
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
      alert("Claim successful!");
    } catch (error: any) {
      console.error("Claim error:", error);
      if (error.message?.includes("rejected") || error.message?.includes("denied")) return;
      if (error.message?.includes("Nothing to claim")) {
        alert("Nothing to claim. You have already claimed all your earnings.");
        return;
      }
      alert(error.message || "An error occurred while claiming. Please try again.");
    }
  };

  // ─── Slot machine animation ──────────────────────────────────────────────
  function rollReel(value: Element) {
    const el = value as HTMLElement;
    const pos = Math.floor(Math.random() * num_icons) * icon_height * -1;
    el.style.backgroundPositionY = `${pos}px`;
  }

  function rollAllReels() {
    document.querySelectorAll(".slots .reel").forEach(rollReel);
  }

  function startSlotMachine() {
    if (!isRolling) {
      setIsRolling(true);
      rollAllReels();
      const interval = setInterval(rollAllReels, 50);
      rollIntervalRef.current = interval;
    }
  }

  function stopSlotMachine(s1: number, s2: number, s3: number) {
    setIsRolling(false);
    const reels = document.querySelectorAll(".slots .reel");

    setTimeout(() => {
      (reels[0] as HTMLElement).style.backgroundPositionY = `${s1 * icon_height}px`;
      setTimeout(() => {
        (reels[1] as HTMLElement).style.backgroundPositionY = `${s2 * icon_height}px`;
        setTimeout(() => {
          (reels[2] as HTMLElement).style.backgroundPositionY = `${s3 * icon_height}px`;
        }, 300);
      }, 300);
    }, 300);

    if (rollIntervalRef.current) {
      clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = undefined;
    }
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
  const isWin = reel[firstResult] === reel[secondResult] && reel[secondResult] === reel[thirdResult];

  return (
    <div className="casino-page">
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
            You were invited by{" "}
            <code>
              {referralFromUrl.slice(0, 6)}...{referralFromUrl.slice(-4)}
            </code>{" "}
            &mdash; your friend earns 1% of your bets as a reward. Play and you can invite others too!
          </span>
          <button className="referral-banner-close" onClick={() => setReferralBannerDismissed(true)}>
            &times;
          </button>
        </div>
      )}

      {/* Neon title */}
      <div className="neon-header">
        <h1 className="neon-title">LOTERO</h1>
        <p className="neon-subtitle">PROVABLY FAIR SLOT MACHINE ON BASE</p>
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
            <h2>BALANCE</h2>
          </div>
          <div className="panel-body">
            {connectedAddress ? (
              <div className="wallet-info">
                <span className="wallet-label">Player</span>
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
                CONNECT WALLET
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
              PAY TABLE
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
              <span className="display-label">BET</span>
              <span className="display-value">1 USDC</span>
            </div>
            <div className="cabinet-display">
              <span className="display-label">MAX WIN</span>
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
              <div className="reel"></div>
              <div className="reel-divider" />
              <div className="reel"></div>
              <div className="reel-divider" />
              <div className="reel"></div>
            </div>

            {/* Glass reflection overlay */}
            <div className="glass-overlay" />
          </div>

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
              <span className="spin-btn-inner">
                {isPlaying ? "SPINNING..." : isWaitingForResponse ? "WAITING..." : "SPIN"}
              </span>
            </button>
            <span className="spin-cost">1 USDC bet + 0.1 USDC fee &middot; No gas needed</span>
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
            <h2>REWARDS</h2>
          </div>
          <div className="panel-body">
            {connectedAddress ? (
              <>
                <div className="reward-row">
                  <span className="reward-label">Wins</span>
                  <span className="reward-amount">{formatUnits(BigInt(winBalance), 6)} USDC</span>
                </div>

                <div className="reward-row">
                  <span className="reward-label">Referrals</span>
                  <span className="reward-amount">{formatUnits(BigInt(referralBalance), 6)} USDC</span>
                </div>

                <div className="reward-divider" />

                <div className="reward-row reward-row-total">
                  <span className="reward-label">Total</span>
                  <span className="reward-amount">{formatUnits(BigInt(winBalance + referralBalance), 6)} USDC</span>
                </div>

                <button
                  className="casino-btn casino-btn-claim"
                  onClick={handleClaim}
                  disabled={winBalance + referralBalance <= 0}
                >
                  CLAIM ALL
                </button>
                <span className="fee-note">0.1 USDC service fee</span>

                <div className="reward-divider" />

                <a
                  href="#"
                  className="referral-link-btn"
                  onClick={e => {
                    e.preventDefault();
                    (document.getElementById("referral_modal") as HTMLDialogElement)?.showModal();
                  }}
                >
                  INVITE FRIENDS &amp; EARN 1%
                </a>
              </>
            ) : (
              <p className="panel-placeholder">Connect wallet to see rewards</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {/* Result Modal */}
      <dialog id="result_modal" className="modal">
        <div className={`modal-box result-modal ${isWin ? "modal-win" : "modal-lose"}`}>
          <h3 className="result-title">{isWin ? "JACKPOT!" : "TRY AGAIN!"}</h3>
          <div className="result-reels">
            <div className="result-reel-icon">
              <Image src={`/logos/${reel[firstResult]}.png`} alt={reel[firstResult]} width={79} height={79} />
            </div>
            <div className="result-reel-icon">
              <Image src={`/logos/${reel[secondResult]}.png`} alt={reel[secondResult]} width={79} height={79} />
            </div>
            <div className="result-reel-icon">
              <Image src={`/logos/${reel[thirdResult]}.png`} alt={reel[thirdResult]} width={79} height={79} />
            </div>
          </div>
          {isWin && (
            <div className="win-prize-display">
              <span className="win-amount-label">YOU WON</span>
              <span className="win-amount">
                {reel[firstResult] === "BTC"
                  ? "30"
                  : reel[firstResult] === "ETH"
                  ? "20"
                  : reel[firstResult] === "BNB"
                  ? "14"
                  : "5"}{" "}
                USDC
              </span>
            </div>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">CLOSE</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Referral Modal */}
      <dialog id="referral_modal" className="modal">
        <div className="modal-box referral-modal">
          <h3 className="referral-modal-title">REFERRAL PROGRAM</h3>

          {/* How it works */}
          <div className="referral-how">
            <h4 className="referral-section-title">How it works</h4>
            <div className="referral-steps">
              <div className="referral-step">
                <span className="referral-step-num">1</span>
                <span className="referral-step-text">Share your unique link with friends</span>
              </div>
              <div className="referral-step">
                <span className="referral-step-num">2</span>
                <span className="referral-step-text">They play using your link (first time only)</span>
              </div>
              <div className="referral-step">
                <span className="referral-step-num">3</span>
                <span className="referral-step-text">
                  You earn <strong>1% of every bet</strong> they make
                </span>
              </div>
            </div>
          </div>

          {/* Your stats */}
          {connectedAddress && (
            <div className="referral-stats">
              <h4 className="referral-section-title">Your referral earnings</h4>
              <div className="referral-stats-grid">
                <div className="referral-stat">
                  <span className="referral-stat-value">{formatUnits(BigInt(userInfo.earnedByReferrals), 6)}</span>
                  <span className="referral-stat-label">USDC earned</span>
                </div>
                <div className="referral-stat">
                  <span className="referral-stat-value">{formatUnits(BigInt(referralBalance), 6)}</span>
                  <span className="referral-stat-label">USDC pending</span>
                </div>
              </div>
            </div>
          )}

          {/* Your link */}
          <div className="referral-link-section">
            <h4 className="referral-section-title">Your referral link</h4>
            <div className="referral-link">
              <input type="text" value={referralLink} readOnly className="referral-input" />
              <button onClick={copyToClipboard} className="casino-btn casino-btn-copy">
                {copied ? "COPIED!" : "COPY"}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="referral-share">
            <h4 className="referral-section-title">Share via</h4>
            <div className="referral-share-buttons">
              <a
                className="share-btn share-btn-x"
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                  "Play Lotero - a provably fair on-chain slot machine! Bet 1 USDC, win up to 30 USDC. No gas needed.\n\n",
                )}&url=${encodeURIComponent(referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                X / Twitter
              </a>
              <a
                className="share-btn share-btn-tg"
                href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(
                  "Play Lotero - a provably fair on-chain slot machine! Bet 1 USDC, win up to 30 USDC. No gas needed.",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram
              </a>
              <a
                className="share-btn share-btn-wa"
                href={`https://wa.me/?text=${encodeURIComponent(
                  "Play Lotero - a provably fair on-chain slot machine! Bet 1 USDC, win up to 30 USDC. No gas needed.\n" +
                    referralLink,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">CLOSE</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Pay Table Modal */}
      <dialog id="paytable_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg neon-text">LOTERO - PAY TABLE</h3>
          <div className="pay-table">
            <table>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Match</th>
                  <th>Payout</th>
                  <th>Odds</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Image src="/logos/doge.png" alt="DOGE" width={50} height={50} />
                  </td>
                  <td>DOGE x 3</td>
                  <td className="payout-cell">5 USDC</td>
                  <td>12.5%</td>
                </tr>
                <tr>
                  <td>
                    <Image src="/logos/bnb.png" alt="BNB" width={50} height={50} />
                  </td>
                  <td>BNB x 3</td>
                  <td className="payout-cell">14 USDC</td>
                  <td>0.8%</td>
                </tr>
                <tr>
                  <td>
                    <Image src="/logos/eth.png" alt="ETH" width={50} height={50} />
                  </td>
                  <td>ETH x 3</td>
                  <td className="payout-cell">20 USDC</td>
                  <td>0.8%</td>
                </tr>
                <tr className="jackpot-row">
                  <td>
                    <Image src="/logos/btc.png" alt="BTC" width={50} height={50} />
                  </td>
                  <td>BTC x 3</td>
                  <td className="payout-cell">30 USDC</td>
                  <td>0.1%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">CLOSE</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Error Modal */}
      <dialog id="error_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Game closed!</h3>
          <p className="py-4">
            The contract does not have enough funds to pay out in case you win. Please contact support.
          </p>
          <a className="casino-btn casino-btn-secondary" href="https://t.me/+4a-Lc7yiSJsxYjEx">
            Support
          </a>
          <div className="modal-action">
            <form method="dialog">
              <button className="casino-btn casino-btn-secondary">CLOSE</button>
            </form>
          </div>
        </div>
      </dialog>

      <audio ref={casinoSoundRef} />
    </div>
  );
};

export default SlotMachine;
