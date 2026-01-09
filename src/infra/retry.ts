export type RetryOptions = {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export const defaultRetryOptions: RetryOptions = {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export function computeBackoffDelayMs(
  attemptIndexZeroBased: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attemptIndexZeroBased);
  const jitter = exp * (0.2 * Math.random());
  return Math.round(exp + jitter);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isLikelyNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (!(err instanceof Error)) return false;
  return /failed to fetch|networkerror|load failed|fetch/i.test(err.message);
}
