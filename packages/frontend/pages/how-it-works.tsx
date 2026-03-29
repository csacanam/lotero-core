import Image from "next/image";
import Link from "next/link";

const HowItWorks = (): JSX.Element => {
  return (
    <div className="docs-page">
      <div className="docs-card">
        <Link href="/" className="docs-back">
          &larr; Back to game
        </Link>

        <h1 className="docs-title">HOW IT WORKS</h1>
        <p className="docs-intro">
          Lotero is a provably fair, on-chain slot machine built on Base. Every spin is verified by Chainlink VRF
          (Verifiable Random Function), making it impossible for anyone to manipulate the results.
        </p>

        {/* How to play */}
        <section className="docs-section">
          <h2>How to play</h2>
          <div className="docs-steps">
            <div className="docs-step">
              <span className="docs-step-num">1</span>
              <div>
                <strong>Connect your wallet</strong>
                <p>Connect any wallet that supports Base network (MetaMask, Coinbase, etc.)</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">2</span>
              <div>
                <strong>Have USDC on Base</strong>
                <p>You need at least 1.1 USDC in your wallet on Base network to play</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">3</span>
              <div>
                <strong>Hit SPIN</strong>
                <p>Sign the payment authorization in your wallet. No gas needed &mdash; the agent handles everything</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">4</span>
              <div>
                <strong>Wait for result</strong>
                <p>Chainlink VRF generates the random numbers on-chain. Results appear in a few seconds</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">5</span>
              <div>
                <strong>Claim your wins</strong>
                <p>If you win, your earnings accumulate and you can claim them anytime</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pay table */}
        <section className="docs-section">
          <h2>Pay table</h2>
          <p>Match 3 of the same symbol to win. Each spin costs 1 USDC (+ 0.1 USDC service fee).</p>
          <div className="docs-paytable">
            <div className="docs-payout-row">
              <Image src="/logos/doge.png" alt="DOGE" width={40} height={40} />
              <span className="docs-payout-name">DOGE x 3</span>
              <span className="docs-payout-amount">5 USDC</span>
            </div>
            <div className="docs-payout-row">
              <Image src="/logos/bnb.png" alt="BNB" width={40} height={40} />
              <span className="docs-payout-name">BNB x 3</span>
              <span className="docs-payout-amount">14 USDC</span>
            </div>
            <div className="docs-payout-row">
              <Image src="/logos/eth.png" alt="ETH" width={40} height={40} />
              <span className="docs-payout-name">ETH x 3</span>
              <span className="docs-payout-amount">20 USDC</span>
            </div>
            <div className="docs-payout-row docs-payout-jackpot">
              <Image src="/logos/btc.png" alt="BTC" width={40} height={40} />
              <span className="docs-payout-name">BTC x 3</span>
              <span className="docs-payout-amount">30 USDC</span>
            </div>
          </div>
        </section>

        {/* Provably fair */}
        <section className="docs-section">
          <h2>Provably fair</h2>
          <p>
            Every spin uses <strong>Chainlink VRF 2.5</strong> to generate verifiable random numbers on-chain. This
            means:
          </p>
          <ul className="docs-list">
            <li>No one can predict or manipulate the outcome &mdash; not even the developers</li>
            <li>Every result can be verified on the blockchain</li>
            <li>The smart contract is open-source and auditable</li>
            <li>The RTP (Return to Player) is ~93%, hardcoded in the contract</li>
          </ul>
          <p>
            The contract address on Base is{" "}
            <a
              href="https://basescan.org/address/0xC4b88e90a73fA9ec588E504255A43d4Ccb82edE9"
              target="_blank"
              rel="noopener noreferrer"
            >
              0xC4b8...edE9
            </a>
          </p>
        </section>

        {/* Gasless */}
        <section className="docs-section">
          <h2>No gas needed</h2>
          <p>
            Lotero uses the <strong>x402 payment protocol</strong> so you never need ETH for gas. When you hit SPIN:
          </p>
          <ul className="docs-list">
            <li>You sign a USDC transfer authorization (not a transaction)</li>
            <li>The Lotero agent receives your payment and executes the spin on your behalf</li>
            <li>You only need USDC in your wallet &mdash; no ETH required</li>
          </ul>
          <div className="docs-cost-breakdown">
            <div className="docs-cost-row">
              <span>Bet amount</span>
              <span>1.00 USDC</span>
            </div>
            <div className="docs-cost-row">
              <span>Service fee</span>
              <span>0.10 USDC</span>
            </div>
            <div className="docs-cost-row docs-cost-total">
              <span>Total per spin</span>
              <span>1.10 USDC</span>
            </div>
          </div>
        </section>

        {/* Referrals */}
        <section className="docs-section">
          <h2>Referral program</h2>
          <p>
            Invite friends and earn <strong>1% of every bet</strong> they make (first-time players only).
          </p>
          <ul className="docs-list">
            <li>Get your unique referral link from the game page</li>
            <li>Share it with friends via X, Telegram, or WhatsApp</li>
            <li>When they play for the first time using your link, you earn 1% of their bets forever</li>
            <li>Claim your referral earnings anytime from the Rewards panel</li>
          </ul>
        </section>

        {/* Technical */}
        <section className="docs-section">
          <h2>Technical details</h2>
          <ul className="docs-list">
            <li>
              <strong>Network:</strong> Base (Ethereum L2)
            </li>
            <li>
              <strong>Token:</strong> USDC
            </li>
            <li>
              <strong>Randomness:</strong> Chainlink VRF 2.5
            </li>
            <li>
              <strong>Payment:</strong> x402 protocol (gasless via EIP-3009 transferWithAuthorization)
            </li>
            <li>
              <strong>Contract:</strong>{" "}
              <a
                href="https://basescan.org/address/0xC4b88e90a73fA9ec588E504255A43d4Ccb82edE9"
                target="_blank"
                rel="noopener noreferrer"
              >
                SlotMachineV2 on BaseScan
              </a>
            </li>
            <li>
              <strong>Source code:</strong>{" "}
              <a href="https://github.com/csacanam/lotero-core" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
          </ul>
        </section>

        <div className="docs-footer">
          <Link href="/" className="casino-btn casino-btn-connect">
            PLAY NOW
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
