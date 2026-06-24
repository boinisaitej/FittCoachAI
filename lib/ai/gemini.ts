import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseMessage, AIMessageChunk } from "@langchain/core/messages";
import type { IterableReadableStream } from "@langchain/core/utils/stream";
import { env } from "@/lib/env";

export type GeminiModel = "flash" | "pro";

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/* -------------------------------------------------------------------------
 * Key pool with cool-off rotation
 *
 * Supports any number of Gemini API keys via two env vars:
 *   GOOGLE_API_KEY   = "key1"
 *   GOOGLE_API_KEYS  = "key2,key3,key4"
 *
 * On a quota error (429 / RESOURCE_EXHAUSTED / "rate limit" / "exhausted"),
 * the current key is parked for 60 s and we retry with the next one. A round
 * robin counter spreads load across healthy keys.
 * ----------------------------------------------------------------------- */

const COOL_OFF_MS = 60_000;

function parseKeys(): string[] {
  const out = new Set<string>();
  const csv = process.env.GOOGLE_API_KEYS;
  if (csv) {
    for (const raw of csv.split(",")) {
      const k = raw.trim();
      if (k) out.add(k);
    }
  }
  const single = process.env.GOOGLE_API_KEY;
  if (single && single.trim()) out.add(single.trim());
  return Array.from(out);
}

function isQuotaError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("rate-limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("exhausted") ||
    msg.includes("too many requests")
  );
}

function maskKey(k: string): string {
  if (k.length <= 8) return "****";
  return k.slice(0, 4) + "…" + k.slice(-4);
}

class KeyPool {
  private cooldown = new Map<string, number>();
  private idx = 0;
  constructor(public readonly keys: string[]) {}

  size() {
    return this.keys.length;
  }

  /** Returns a healthy key, advancing the round-robin pointer. */
  pick(): string | null {
    const n = this.keys.length;
    if (n === 0) return null;
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      const key = this.keys[(this.idx + i) % n];
      const until = this.cooldown.get(key) ?? 0;
      if (until <= now) {
        this.idx = (this.idx + i + 1) % n;
        return key;
      }
    }
    return null; // every key is currently cooling
  }

  /** Park a key for COOL_OFF_MS after a quota error. */
  markExhausted(key: string) {
    this.cooldown.set(key, Date.now() + COOL_OFF_MS);
    console.warn(`[gemini] Key ${maskKey(key)} hit quota — cooling for ${COOL_OFF_MS / 1000}s.`);
  }

  /** Diagnostic: how many keys are healthy right now? */
  healthy(): number {
    const now = Date.now();
    return this.keys.filter((k) => (this.cooldown.get(k) ?? 0) <= now).length;
  }
}

/* -------------------------------------------------------------------------
 * RotatingGemini — same .invoke / .stream signature as ChatGoogleGenerativeAI
 * so existing callers don't need to change.
 * ----------------------------------------------------------------------- */

export class RotatingGemini {
  private clients = new Map<string, ChatGoogleGenerativeAI>();

  constructor(private pool: KeyPool, private modelName: string) {}

  private clientFor(key: string): ChatGoogleGenerativeAI {
    let llm = this.clients.get(key);
    if (!llm) {
      // Trim flash output to 1024 tokens — short answers (why / motivation /
      // recipe / chat reply) return in ~700-1500 ms instead of ~3 s.
      // The pro model is only used for the long week-plan JSON.
      const isPro = /pro/i.test(this.modelName);
      llm = new ChatGoogleGenerativeAI({
        apiKey: key,
        model: this.modelName,
        temperature: 0.7,
        maxOutputTokens: isPro ? 2048 : 1024,
      });
      this.clients.set(key, llm);
    }
    return llm;
  }

  async invoke(messages: BaseMessage[]): Promise<AIMessageChunk> {
    return await this.withRotation((llm) => llm.invoke(messages));
  }

  async stream(messages: BaseMessage[]): Promise<IterableReadableStream<AIMessageChunk>> {
    return await this.withRotation((llm) => llm.stream(messages));
  }

  private async withRotation<T>(op: (llm: ChatGoogleGenerativeAI) => Promise<T>): Promise<T> {
    const n = this.pool.size();
    if (n === 0) {
      throw new AiUnavailableError(
        "No Google API key configured. Set GOOGLE_API_KEY and/or GOOGLE_API_KEYS in .env.local."
      );
    }
    let lastError: unknown;
    for (let attempt = 0; attempt < n; attempt++) {
      const key = this.pool.pick();
      if (!key) break;
      try {
        return await op(this.clientFor(key));
      } catch (err) {
        if (isQuotaError(err)) {
          this.pool.markExhausted(key);
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    const msg = lastError instanceof Error ? lastError.message : "all keys cooling";
    throw new AiUnavailableError(
      `All ${n} Gemini key${n === 1 ? "" : "s"} exhausted. Add more to GOOGLE_API_KEYS or wait ${COOL_OFF_MS / 1000}s. Last error: ${msg}`
    );
  }
}

/* -------------------------------------------------------------------------
 * Public factory + parsing helpers (preserved API)
 * ----------------------------------------------------------------------- */

const _pool = new KeyPool(parseKeys());
const _cache: Partial<Record<GeminiModel, RotatingGemini>> = {};

export function getGemini(model: GeminiModel = "flash"): RotatingGemini {
  if (_cache[model]) return _cache[model]!;
  if (_pool.size() === 0) {
    throw new AiUnavailableError(
      "No Google API key configured. Set GOOGLE_API_KEY and/or GOOGLE_API_KEYS in .env.local — see docs/SETUP.md."
    );
  }
  const modelName = model === "pro" ? env.GEMINI_PRO_MODEL : env.GEMINI_MODEL;
  _cache[model] = new RotatingGemini(_pool, modelName);
  return _cache[model]!;
}

/** Diagnostic helper used by /api/health/ai (and useful in tests). */
export function geminiPoolStatus(): { total: number; healthy: number; keys: { mask: string; coolingFor: number }[] } {
  const now = Date.now();
  return {
    total: _pool.size(),
    healthy: _pool.healthy(),
    keys: _pool.keys.map((k) => ({
      mask: maskKey(k),
      coolingFor: Math.max(0, ((((_pool as unknown as { cooldown: Map<string, number> }).cooldown.get(k) ?? 0) - now) / 1000) | 0),
    })),
  };
}

/** Parse JSON loosely from a Gemini response that may have prose around it. */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const firstArr = cleaned.indexOf("[");
    const start =
      first === -1 ? firstArr : firstArr === -1 ? first : Math.min(first, firstArr);
    const last = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start === -1 || last === -1) {
      throw new Error("AI did not return parseable JSON: " + text.slice(0, 200));
    }
    return JSON.parse(cleaned.slice(start, last + 1)) as T;
  }
}

/** Back-compat: some legacy code still imports `safeAi` from here. */
export async function safeAi<T>(
  fn: () => Promise<T>,
  fallback: T,
  label = "ai-call"
): Promise<{ ok: boolean; data: T; error?: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ai:${label}] ${msg}`);
    return { ok: false, data: fallback, error: msg };
  }
}
