/**
 * Global request governor for all Drive HTTP traffic that flows through `driveFetch`.
 *
 * Why this exists (Drive red-team rec #3): a single timer-constant edit or a fan-out
 * (parallel shard upload, thumbnail grid storm) could otherwise burst Labs past Google's
 * per-user quota and into abuse-detection / ban territory. The data-loss layers do not
 * cover API abuse — this closes that gap by bounding request rate at the choke point:
 *
 * 1. A module-level semaphore caps simultaneous in-flight Drive requests to a small constant.
 * 2. Retryable failures (429 / 5xx / network) back off with full jitter so retries never
 *    fire in lockstep (the synchronized-retry-wave signature abuse detectors look for).
 * 3. `Retry-After` (delta-seconds or HTTP-date) is honored as a floor on the wait.
 *
 * The happy path (2xx) is untouched: a request acquires a slot, runs once, releases.
 */

/**
 * Max simultaneous in-flight Drive requests (reads + writes) across every Labs app.
 * A small constant so a fan-out edit cannot burst. Override for tests / tuning.
 */
export const DRIVE_MAX_CONCURRENT_REQUESTS = 6;

/** Max automatic retries for a single retryable (429 / 5xx / network) Drive request. */
export const DRIVE_MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff (doubled each attempt, before jitter). */
export const DRIVE_RETRY_BACKOFF_BASE_MS = 500;

/** Exponential-backoff ceiling before jitter is applied. */
export const DRIVE_RETRY_BACKOFF_CAP_MS = 20_000;

/**
 * Upper bound we honor from a `Retry-After` header. Guards against a hostile or clock-skewed
 * value pinning a request for hours; a genuine Google `Retry-After` is seconds to low minutes.
 */
export const DRIVE_RETRY_AFTER_MAX_MS = 2 * 60_000;

// --- Bounded-concurrency semaphore ------------------------------------------

let activeCount = 0;
const waiters: Array<() => void> = [];

/** Current number of Drive requests holding a slot (in-flight or waiting out a retry). */
export function driveInFlightRequestCount(): number {
  return activeCount;
}

function acquireDriveSlot(): Promise<void> {
  if (activeCount < DRIVE_MAX_CONCURRENT_REQUESTS) {
    activeCount += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waiters.push(resolve);
  });
}

function releaseDriveSlot(): void {
  const next = waiters.shift();
  if (next) {
    // Hand the slot straight to the next waiter — activeCount stays at the cap.
    next();
    return;
  }
  activeCount = Math.max(0, activeCount - 1);
}

/**
 * Run `fn` while holding one of the {@link DRIVE_MAX_CONCURRENT_REQUESTS} slots. Extra callers
 * queue until a slot frees. The slot is held for the whole operation (including retry waits) so
 * a request backing off on `Retry-After` still counts against the in-flight budget.
 */
export async function runWithDriveConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  await acquireDriveSlot();
  try {
    return await fn();
  } finally {
    releaseDriveSlot();
  }
}

/** Test-only: drain the semaphore so a leaked slot from one test cannot bleed into the next. */
export function __resetDriveRequestGovernorForTests(): void {
  activeCount = 0;
  waiters.length = 0;
}

// --- Retry timing (pure, deterministic when given an rng) --------------------

/**
 * Parse a `Retry-After` header into milliseconds. Accepts delta-seconds (`"2"`) and an
 * HTTP-date (`"Wed, 21 Oct 2026 07:28:00 GMT"`). Returns null when absent / unparseable, and
 * clamps to {@link DRIVE_RETRY_AFTER_MAX_MS}. A past HTTP-date clamps up to 0 (retry now).
 */
export function parseRetryAfterMs(
  headerValue: string | null | undefined,
  nowMs: number,
): number | null {
  const trimmed = headerValue?.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return Math.min(Number(trimmed) * 1000, DRIVE_RETRY_AFTER_MAX_MS);
  }
  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) {
    return Math.min(Math.max(0, dateMs - nowMs), DRIVE_RETRY_AFTER_MAX_MS);
  }
  return null;
}

/**
 * Full-jitter exponential backoff: a uniform sample in `[0, min(cap, base * 2^(attempt-1)))`.
 * `attempt` is 1-based. Full jitter (rather than fixed or equal-jitter) maximally de-synchronizes
 * retries across tabs / devices so they do not arrive as a wave.
 */
export function computeDriveRetryBackoffMs(attempt: number, rng: () => number = Math.random): number {
  const exp = Math.min(
    DRIVE_RETRY_BACKOFF_CAP_MS,
    DRIVE_RETRY_BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1),
  );
  return Math.floor(rng() * exp);
}

/**
 * Wait before the next retry of a retryable HTTP response. Honors `Retry-After` as a floor
 * (`>=` the header value) while still adding jittered backoff so a fleet does not retry in
 * lockstep even when Google hands everyone the same `Retry-After`.
 */
export function computeDriveRetryWaitMs(
  retryAfterHeader: string | null | undefined,
  attempt: number,
  nowMs: number,
  rng: () => number = Math.random,
): number {
  const backoff = computeDriveRetryBackoffMs(attempt, rng);
  const retryAfter = parseRetryAfterMs(retryAfterHeader, nowMs);
  if (retryAfter != null) return Math.max(retryAfter, backoff);
  return backoff;
}
