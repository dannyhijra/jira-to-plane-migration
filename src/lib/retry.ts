import { logger } from "./logger";

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (err: unknown) => boolean;
}

const DEFAULTS: Required<Omit<RetryOptions, "retryOn">> = {
  attempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
};

function defaultRetryOn(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Retry on transient HTTP statuses and network errors
  return /\b(429|500|502|503|504)\b/.test(msg) || /ECONNRESET|ETIMEDOUT|ENOTFOUND/.test(msg);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts, baseDelayMs, maxDelayMs } = { ...DEFAULTS, ...opts };
  const retryOn = opts.retryOn ?? defaultRetryOn;

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !retryOn(err)) throw err;
      const delay = Math.min(baseDelayMs * 2 ** i, maxDelayMs);
      logger.warn(`Retry ${i + 1}/${attempts} in ${delay}ms after error:`, err);
      await sleep(delay);
    }
  }
  throw lastErr;
}
