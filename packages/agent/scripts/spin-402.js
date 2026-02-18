#!/usr/bin/env node
/**
 * Test: POST /spinWith1USDC without payment.
 * Expects 402 Payment Required with PAYMENT-REQUIRED header.
 *
 * Usage: node scripts/spin-402.js [player] [url]
 *   player: Ethereum address (default: 0x0000000000000000000000000000000000000001)
 *   url: Agent URL (default: http://localhost:4021)
 */

const player =
  process.argv[2] || "0x0000000000000000000000000000000000000001";
const baseUrl = process.argv[3] || "http://localhost:4021";
const url = `${baseUrl}/spinWith1USDC`;

async function main() {
  console.log("POST", url);
  console.log("Body:", JSON.stringify({ player, referral: null }, null, 2));
  console.log("");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player, referral: null }),
  });

  console.log("Status:", res.status, res.statusText);
  console.log("");
  console.log("Headers:");
  for (const [k, v] of res.headers) {
    if (k.toLowerCase() === "payment-required") {
      const decoded = Buffer.from(v, "base64").toString("utf8");
      console.log(`  ${k}: (decoded) ${decoded}`);
    } else {
      console.log(`  ${k}: ${v.length > 80 ? v.slice(0, 80) + "..." : v}`);
    }
  }
  console.log("");
  const body = await res.text();
  console.log("Body:", body || "(empty)");

  if (res.status === 402) {
    console.log("");
    console.log("✓ Expected 402 Payment Required");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
