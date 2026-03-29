import Image from "next/image";
import Link from "next/link";
import { MetaHeader } from "~~/components/MetaHeader";
import { useTranslation } from "~~/i18n";

const HowItWorks = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className="docs-page">
      <MetaHeader
        title="How It Works — Lotero"
        description="Learn how Lotero works: provably fair on-chain slot machine using Chainlink VRF on Base. No gas needed."
      />
      <div className="docs-card">
        <Link href="/" className="docs-back">
          {t("howItWorks.backToGame")}
        </Link>

        <h1 className="docs-title">{t("howItWorks.title")}</h1>
        <p className="docs-intro">{t("howItWorks.intro")}</p>

        {/* How to play */}
        <section className="docs-section">
          <h2>{t("howItWorks.howToPlay")}</h2>
          <div className="docs-steps">
            <div className="docs-step">
              <span className="docs-step-num">1</span>
              <div>
                <strong>{t("howItWorks.step1Title")}</strong>
                <p>{t("howItWorks.step1Desc")}</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">2</span>
              <div>
                <strong>{t("howItWorks.step2Title")}</strong>
                <p>{t("howItWorks.step2Desc")}</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">3</span>
              <div>
                <strong>{t("howItWorks.step3Title")}</strong>
                <p>{t("howItWorks.step3Desc")}</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">4</span>
              <div>
                <strong>{t("howItWorks.step4Title")}</strong>
                <p>{t("howItWorks.step4Desc")}</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">5</span>
              <div>
                <strong>{t("howItWorks.step5Title")}</strong>
                <p>{t("howItWorks.step5Desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pay table */}
        <section className="docs-section">
          <h2>{t("howItWorks.payTable")}</h2>
          <p>{t("howItWorks.payTableDesc")}</p>
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
          <h2>{t("howItWorks.provablyFair")}</h2>
          <p>{t("howItWorks.provablyFairIntro")}</p>
          <ul className="docs-list">
            <li>{t("howItWorks.vrfPoint1")}</li>
            <li>{t("howItWorks.vrfPoint2")}</li>
            <li>{t("howItWorks.vrfPoint3")}</li>
            <li>{t("howItWorks.vrfPoint4")}</li>
          </ul>
          <p>
            {t("howItWorks.contractAddress")}{" "}
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
          <h2>{t("howItWorks.noGas")}</h2>
          <p>{t("howItWorks.noGasIntro")}</p>
          <ul className="docs-list">
            <li>{t("howItWorks.noGasPoint1")}</li>
            <li>{t("howItWorks.noGasPoint2")}</li>
            <li>{t("howItWorks.noGasPoint3")}</li>
            <li>{t("howItWorks.noGasPoint4")}</li>
          </ul>
          <div className="docs-cost-breakdown">
            <div className="docs-cost-row">
              <span>{t("howItWorks.betAmount")}</span>
              <span>1.00 USDC</span>
            </div>
            <div className="docs-cost-row">
              <span>{t("howItWorks.serviceFee")}</span>
              <span>0.10 USDC</span>
            </div>
            <div className="docs-cost-row docs-cost-total">
              <span>{t("howItWorks.totalPerSpin")}</span>
              <span>1.10 USDC</span>
            </div>
          </div>
        </section>

        {/* Referrals */}
        <section className="docs-section">
          <h2>{t("howItWorks.referralProgram")}</h2>
          <p>{t("howItWorks.referralIntro")}</p>
          <ul className="docs-list">
            <li>{t("howItWorks.refPoint1")}</li>
            <li>{t("howItWorks.refPoint2")}</li>
            <li>{t("howItWorks.refPoint3")}</li>
            <li>{t("howItWorks.refPoint4")}</li>
          </ul>
        </section>

        {/* Technical */}
        <section className="docs-section">
          <h2>{t("howItWorks.technicalDetails")}</h2>
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
              <strong>Payment:</strong> x402 protocol (EIP-3009)
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
            {t("howItWorks.playNow")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
