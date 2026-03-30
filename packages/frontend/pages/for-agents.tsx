import { useState } from "react";
import Link from "next/link";
import { MetaHeader } from "~~/components/MetaHeader";
import { ModeToggle } from "~~/components/ModeToggle";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:4021";

const LLM_PROMPT = `# Lotero Agent – Integration Guide

Lotero is a provably fair on-chain slot machine on Base. You can execute spins and claims via REST API using x402 payments (USDC on Base). No API keys needed.

## Agent URL
${AGENT_URL}

## Install
npm install @x402/fetch @x402/evm viem

## Full Example (Node.js)
\`\`\`js
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const client = new x402Client();
registerExactEvmScheme(client, { signer });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// 1. Spin (costs 1.1 USDC: 1 bet + 0.1 fee)
const res = await fetchWithPayment("${AGENT_URL}/spinWith1USDC", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ player: signer.address, referral: null })
});
const { requestId } = await res.json();

// 2. Poll for result
let result;
do {
  await new Promise(r => setTimeout(r, 3000));
  const poll = await fetch(\`${AGENT_URL}/round?requestId=\${requestId}\`);
  result = await poll.json();
} while (!result.resolved);
console.log(result.round); // { number1, number2, number3, hasWon, prize }

// 3. Claim earnings (costs 0.1 USDC)
await fetchWithPayment("${AGENT_URL}/claim", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user: signer.address })
});
\`\`\`

## Endpoints

### POST /spinWith1USDC (1.1 USDC)
Request: { "player": "0x...", "referral": "0x..." | null }
Response: { "requestId": "123", "txHash": "0x...", "status": "pending" }

### POST /claim (0.1 USDC)
Request: { "user": "0x..." }
Response: { "user": "0x...", "amount": "5000000", "txHash": "0x...", "status": "claimed" }

### GET /round?requestId=... (Free)
Response: { "requestId": "123", "resolved": true, "round": { "number1": "4", "number2": "4", "number3": "4", "hasWon": true, "prize": "5000000" } }

### GET /player/:address/balances (Free)
Returns: moneyAdded, moneyEarned, moneyClaimed, earnedByReferrals, claimedByReferrals

### GET /contract/health (Free)
Returns: executor ETH/USDC balances, contract bankroll, VRF subscription status

## Payment Flow (x402)
1. Call paid endpoint → get 402 with payment requirements
2. x402 client signs USDC transferWithAuthorization (EIP-3009)
3. Retries with signed payment header
4. Facilitator settles, agent executes on-chain

## Technical
- Network: Base (eip155:8453)
- Token: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- Contract: SlotMachineV2 (0xC4b88e90a73fA9ec588E504255A43d4Ccb82edE9)
- Randomness: Chainlink VRF 2.5
- RTP: ~93%
- Source: https://github.com/csacanam/lotero-core
`;

const ForAgents = (): JSX.Element => {
  const [copied, setCopied] = useState(false);

  const handleCopyForLLM = () => {
    navigator.clipboard?.writeText(LLM_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="docs-page">
      <MetaHeader
        title="For Agents — Lotero"
        description="Integrate Lotero slot machine into your AI agent. REST API with x402 payments on Base."
      />
      <div className="docs-card">
        <ModeToggle active="agents" />

        <h1 className="docs-title">FOR AGENTS</h1>
        <p className="docs-intro">
          Integrate Lotero into your AI agent or application. Execute spins and claims via REST API with x402 payments.
          No API keys needed — just USDC on Base.
        </p>

        {/* Copy for LLM */}
        <div className="copy-llm-section">
          <span className="copy-llm-hint">
            Don&apos;t want to read? Copy everything and paste it into your favorite LLM.
          </span>
          <button className="copy-llm-btn" onClick={handleCopyForLLM}>
            {copied ? "Copied!" : "Copy for LLM"}
          </button>
        </div>

        {/* Quick start */}
        <section className="docs-section">
          <h2>Quick start</h2>
          <div className="agent-code-block">
            <div className="agent-code-label">Install</div>
            <pre className="agent-code">npm install @x402/fetch @x402/evm viem</pre>
          </div>
          <div className="agent-code-block">
            <div className="agent-code-label">Spin (Node.js)</div>
            <pre className="agent-code">{`import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const client = new x402Client();
registerExactEvmScheme(client, { signer });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Spin
const res = await fetchWithPayment("${AGENT_URL}/spinWith1USDC", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ player: signer.address, referral: null })
});
const { requestId } = await res.json();

// Poll for result
let result;
do {
  await new Promise(r => setTimeout(r, 3000));
  const poll = await fetch(\`${AGENT_URL}/round?requestId=\${requestId}\`);
  result = await poll.json();
} while (!result.resolved);

console.log(result.round); // { number1, number2, number3, hasWon, prize }`}</pre>
          </div>
        </section>

        {/* Endpoints */}
        <section className="docs-section">
          <h2>Endpoints</h2>

          <div className="agent-endpoint">
            <div className="agent-endpoint-header">
              <span className="agent-method post">POST</span>
              <span className="agent-path">/spinWith1USDC</span>
              <span className="agent-price">1.1 USDC</span>
            </div>
            <p>Execute one slot spin. 1 USDC bet + 0.1 USDC fee.</p>
            <div className="agent-code-block">
              <div className="agent-code-label">Request</div>
              <pre className="agent-code">{`{ "player": "0x...", "referral": "0x..." | null }`}</pre>
            </div>
            <div className="agent-code-block">
              <div className="agent-code-label">Response</div>
              <pre className="agent-code">{`{ "requestId": "123", "txHash": "0x...", "status": "pending" }`}</pre>
            </div>
          </div>

          <div className="agent-endpoint">
            <div className="agent-endpoint-header">
              <span className="agent-method post">POST</span>
              <span className="agent-path">/claim</span>
              <span className="agent-price">0.1 USDC</span>
            </div>
            <p>Claim player earnings (wins + referrals). Gasless.</p>
            <div className="agent-code-block">
              <div className="agent-code-label">Request</div>
              <pre className="agent-code">{`{ "user": "0x..." }`}</pre>
            </div>
            <div className="agent-code-block">
              <div className="agent-code-label">Response</div>
              <pre className="agent-code">{`{ "user": "0x...", "amount": "5000000", "txHash": "0x...", "status": "claimed" }`}</pre>
            </div>
          </div>

          <div className="agent-endpoint">
            <div className="agent-endpoint-header">
              <span className="agent-method get">GET</span>
              <span className="agent-path">/round?requestId=...</span>
              <span className="agent-price">Free</span>
            </div>
            <p>Get spin result. Poll until resolved is true.</p>
            <div className="agent-code-block">
              <div className="agent-code-label">Response</div>
              <pre className="agent-code">{`{
  "requestId": "123",
  "resolved": true,
  "round": {
    "number1": "4", "number2": "4", "number3": "4",
    "hasWon": true, "prize": "5000000"
  }
}`}</pre>
            </div>
          </div>

          <div className="agent-endpoint">
            <div className="agent-endpoint-header">
              <span className="agent-method get">GET</span>
              <span className="agent-path">/player/:address/balances</span>
              <span className="agent-price">Free</span>
            </div>
            <p>Get player stats: total bet, earned, claimed, referrals.</p>
          </div>

          <div className="agent-endpoint">
            <div className="agent-endpoint-header">
              <span className="agent-method get">GET</span>
              <span className="agent-path">/contract/health</span>
              <span className="agent-price">Free</span>
            </div>
            <p>Check executor balance, contract bankroll, and VRF subscription status.</p>
          </div>
        </section>

        {/* How x402 works */}
        <section className="docs-section">
          <h2>How x402 payment works</h2>
          <div className="docs-steps">
            <div className="docs-step">
              <span className="docs-step-num">1</span>
              <div>
                <strong>Call paid endpoint</strong>
                <p>Agent gets 402 response with payment requirements</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">2</span>
              <div>
                <strong>Sign USDC authorization</strong>
                <p>x402 client signs a transferWithAuthorization (EIP-3009) — no on-chain tx</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">3</span>
              <div>
                <strong>Retry with payment</strong>
                <p>x402 retries the request with the signed payment header</p>
              </div>
            </div>
            <div className="docs-step">
              <span className="docs-step-num">4</span>
              <div>
                <strong>Execution</strong>
                <p>Facilitator settles payment, agent executes playFor() on-chain</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technical details */}
        <section className="docs-section">
          <h2>Technical details</h2>
          <ul className="docs-list">
            <li>
              <strong>Agent URL:</strong>{" "}
              <a href={AGENT_URL} target="_blank" rel="noopener noreferrer">
                {AGENT_URL}
              </a>
            </li>
            <li>
              <strong>Network:</strong> Base (eip155:8453)
            </li>
            <li>
              <strong>Payment:</strong> USDC via x402 (EIP-3009)
            </li>
            <li>
              <strong>Randomness:</strong> Chainlink VRF 2.5
            </li>
            <li>
              <strong>RTP:</strong> ~93%
            </li>
            <li>
              <strong>Contract:</strong>{" "}
              <a
                href="https://basescan.org/address/0xC4b88e90a73fA9ec588E504255A43d4Ccb82edE9"
                target="_blank"
                rel="noopener noreferrer"
              >
                SlotMachineV2
              </a>
            </li>
            <li>
              <strong>Source:</strong>{" "}
              <a href="https://github.com/csacanam/lotero-core" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
          </ul>
        </section>

        <div className="docs-footer">
          <Link href="/" className="casino-btn casino-btn-connect">
            PLAY AS HUMAN
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForAgents;
