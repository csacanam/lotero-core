#!/usr/bin/env node
/**
 * POST /claim WITH payment (0.5 USDC via x402).
 * Claims earnings for a user. Requires wallet with USDC on Base.
 *
 * Usage: node scripts/claim-paid.js [user] [url]
 *   user: address whose earnings to claim (default: payer address)
 *   url: agent base URL (default: http://localhost:4021)
 *   If only one arg and it starts with http, it's treated as url.
 * Env: PAYER_PRIVATE_KEY (wallet that pays 0.5 USDC)
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

let PAYER_PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY;
if (PAYER_PRIVATE_KEY) {
  PAYER_PRIVATE_KEY = PAYER_PRIVATE_KEY.trim().replace(/^["']|["']$/g, "");
  if (!PAYER_PRIVATE_KEY.startsWith("0x")) {
    PAYER_PRIVATE_KEY = "0x" + PAYER_PRIVATE_KEY;
  }
}
const arg2 = process.argv[2];
const arg3 = process.argv[3];
const baseUrl =
  (arg2?.startsWith("http") ? arg2 : arg3) || "http://localhost:4021";
const url = `${baseUrl}/claim`;

async function main() {
  if (!PAYER_PRIVATE_KEY) {
    console.error(
      "Missing PAYER_PRIVATE_KEY in .env (wallet that pays 0.5 USDC)"
    );
    process.exit(1);
  }

  const keyHex = PAYER_PRIVATE_KEY.startsWith("0x")
    ? PAYER_PRIVATE_KEY.slice(2)
    : PAYER_PRIVATE_KEY;
  if (keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    console.error(
      "PAYER_PRIVATE_KEY must be 64 hex chars (with or without 0x prefix). Check .env has no extra quotes, spaces, or newlines."
    );
    process.exit(1);
  }
  const privateKey = `0x${keyHex}`;

  const signer = privateKeyToAccount(privateKey);
  const user = arg2 && !arg2.startsWith("http") ? arg2 : signer.address;
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log("POST", url, "(with x402 payment)");
  console.log("Payer:", signer.address);
  console.log("User to claim for:", user);
  console.log("");

  const res = await fetchWithPayment(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user }),
  });

  let body;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  console.log("Status:", res.status, res.statusText);
  console.log("Response:", JSON.stringify(body, null, 2));

  if (res.status === 402) {
    console.log("");
    console.log("--- 402 Diagnostics ---");
    const paymentRequired =
      res.headers.get("payment-required") || res.headers.get("PAYMENT-REQUIRED");
    if (paymentRequired) {
      try {
        const decoded = JSON.parse(
          Buffer.from(paymentRequired, "base64").toString()
        );
        console.log("Payment requirements:", JSON.stringify(decoded, null, 2));
      } catch {
        console.log(
          "PAYMENT-REQUIRED header:",
          paymentRequired.slice(0, 80) + "..."
        );
      }
    } else {
      console.log(
        "(No PAYMENT-REQUIRED header – payment may have been sent but rejected)"
      );
    }
    if (body?.error || body?.details) {
      console.log("Error from server:", body.error || body.details);
    }
    console.log("");
    console.log(
      "Common 402 causes: PAYER wallet needs USDC on Base; PAY_TO valid; CDP keys set; KYT/OFAC."
    );
    process.exit(1);
  }

  if (res.ok) {
    console.log("");
    console.log("✓ Claim executed");
    if (body.amount) {
      console.log("Amount claimed:", body.amount);
    }
    if (body.txHash) {
      console.log("txHash:", body.txHash);
    }
    try {
      const paymentResponse = new x402HTTPClient(
        client
      ).getPaymentSettleResponse((name) => res.headers.get(name));
      if (paymentResponse) {
        console.log(
          "Payment settled:",
          JSON.stringify(paymentResponse, null, 2)
        );
      }
    } catch {
      // PAYMENT-RESPONSE header may not always be present
    }
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
