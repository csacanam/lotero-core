/**
 * Failover JSON-RPC provider for Base.
 *
 * Reads BASE_RPC as a comma-separated list. Tries URLs in order; if one
 * returns a capacity/rate-limit error, it is blocked for 1 hour and the next
 * URL is used. The public Base RPC (https://mainnet.base.org) is always
 * appended as a last-resort fallback and is never blocked.
 *
 * Designed for ethers v5. Drop-in replacement for `new ethers.providers.JsonRpcProvider(...)`.
 *
 * Examples:
 *   BASE_RPC=https://base-mainnet.g.alchemy.com/v2/KEY1,https://base-mainnet.g.alchemy.com/v2/KEY2
 *   BASE_RPC=https://mainnet.base.org
 */

import { ethers } from "ethers";

const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour
const PUBLIC_BASE_URL = "https://mainnet.base.org";

function maskUrl(url) {
  return url.replace(/\/v2\/[^/]+/, "/v2/***");
}

function parseUrls() {
  const raw = process.env.BASE_RPC || PUBLIC_BASE_URL;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list.includes(PUBLIC_BASE_URL)) list.push(PUBLIC_BASE_URL);
  return list;
}

const FALLBACK_LOG_INTERVAL_MS = 60 * 1000; // throttle "serving via fallback" logs

class FailoverBaseProvider extends ethers.providers.JsonRpcProvider {
  constructor() {
    const urls = parseUrls();
    super(urls[0]);
    this._urls = urls;
    this._blockedUntil = new Map();
    this._lastFallbackLogAt = 0;
    console.log(`[base-rpc] providers (in order): ${urls.map(maskUrl).join(", ")}`);
  }

  _isBlocked(url) {
    const until = this._blockedUntil.get(url) || 0;
    return until > Date.now();
  }

  _markBlocked(url) {
    if (url === PUBLIC_BASE_URL) return; // never block the public fallback
    this._blockedUntil.set(url, Date.now() + BLOCK_DURATION_MS);
    console.warn(`[base-rpc] blocked ${maskUrl(url)} for 1h (capacity/rate-limit)`);
  }

  async _tryUrl(url, method, params) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() }),
    });
    const text = await res.text();
    if (/monthly capacity limit|rate limit|too many requests/i.test(text)) {
      return { ok: false, capacity: true, err: new Error(`capacity/rate limit on ${maskUrl(url)}`) };
    }
    if (!res.ok) {
      return { ok: false, capacity: false, err: new Error(`HTTP ${res.status} from ${maskUrl(url)}: ${text.slice(0, 200)}`) };
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, capacity: false, err: new Error(`invalid JSON from ${maskUrl(url)}`) };
    }
    if (parsed.error) {
      return { ok: false, capacity: false, err: new Error(parsed.error.message || "RPC error") };
    }
    return { ok: true, result: parsed.result };
  }

  async _attemptAll(method, params, ignoreBlocks) {
    let lastErr;
    for (const url of this._urls) {
      if (!ignoreBlocks && this._isBlocked(url)) continue;
      try {
        const r = await this._tryUrl(url, method, params);
        if (r.ok) return { ok: true, result: r.result, url };
        if (r.capacity) this._markBlocked(url);
        lastErr = r.err;
      } catch (err) {
        lastErr = err;
      }
    }
    return { ok: false, err: lastErr };
  }

  async send(method, params) {
    // Try up to 4 times with exponential backoff for transient rate limits
    // (public RPCs throttle bursts of concurrent calls, but recover within seconds)
    const delays = [0, 250, 750, 2000];
    let lastErr;
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) {
        const jitter = Math.floor(delays[i] * (0.5 + Math.random()));
        await new Promise((r) => setTimeout(r, jitter));
      }
      const r = await this._attemptAll(method, params, i >= 1);
      if (r.ok) {
        // Surface when we're running on a fallback (e.g. primary RPC exhausted
        // its capacity). Throttled so a dead primary doesn't flood the logs.
        if (r.url !== this._urls[0]) {
          const now = Date.now();
          if (now - this._lastFallbackLogAt > FALLBACK_LOG_INTERVAL_MS) {
            this._lastFallbackLogAt = now;
            console.warn(`[base-rpc] serving via fallback ${maskUrl(r.url)} (primary unavailable)`);
          }
        }
        return r.result;
      }
      lastErr = r.err;
    }
    console.error(`[base-rpc] ${method} failed after ${delays.length} attempts: ${lastErr?.message || lastErr}`);
    throw lastErr || new Error("All Base RPC URLs exhausted");
  }
}

export function getBaseProvider() {
  return new FailoverBaseProvider();
}

export { FailoverBaseProvider };
