/**
 * 10s (was 30s): the limiter now charges only successful refreshes, and clients
 * single-flight, so the min interval only needs to catch a hot retry loop —
 * 30s made a reconnect click within half a minute of sign-in fail into a popup.
 */
const MIN_REFRESH_INTERVAL_MS = 10_000;
const MAX_REFRESH_PER_HOUR = 20;
const MAX_REFRESH_PER_IP_HOUR = 200;

type RateLimitBucket = {
  lastAtMs: number;
  hourStartMs: number;
  hourCount: number;
};

function hourBucketStart(nowMs: number): number {
  return Math.floor(nowMs / 3_600_000) * 3_600_000;
}

function parseBucket(raw: string | null): RateLimitBucket | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RateLimitBucket;
    if (
      typeof parsed.lastAtMs !== 'number' ||
      typeof parsed.hourStartMs !== 'number' ||
      typeof parsed.hourCount !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeBucket(existing: RateLimitBucket | null, nowMs: number): RateLimitBucket {
  const hourStart = hourBucketStart(nowMs);
  const bucket: RateLimitBucket = existing ?? { lastAtMs: 0, hourStartMs: hourStart, hourCount: 0 };
  if (bucket.hourStartMs !== hourStart) {
    return { lastAtMs: bucket.lastAtMs, hourStartMs: hourStart, hourCount: 0 };
  }
  return bucket;
}

/** Read-only check — does NOT charge the bucket (see {@link recordRefreshSuccess}). */
async function checkBucket(
  kv: KVNamespace,
  key: string,
  nowMs: number,
  maxPerHour: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const bucket = normalizeBucket(parseBucket(await kv.get(key)), nowMs);
  if (nowMs - bucket.lastAtMs < MIN_REFRESH_INTERVAL_MS) {
    return { allowed: false, reason: 'Refresh too soon. Try again in a few seconds.' };
  }
  if (bucket.hourCount >= maxPerHour) {
    return { allowed: false, reason: 'Hourly refresh limit reached.' };
  }
  return { allowed: true };
}

async function chargeBucket(kv: KVNamespace, key: string, nowMs: number): Promise<void> {
  const bucket = normalizeBucket(parseBucket(await kv.get(key)), nowMs);
  bucket.lastAtMs = nowMs;
  bucket.hourCount += 1;
  await kv.put(key, JSON.stringify(bucket), { expirationTtl: 7200 });
}

/**
 * Read-only admission check. Charging happens in {@link recordRefreshSuccess}
 * only after Google actually returned a token — a failed refresh (transient
 * Google error, expired session) no longer eats the caller's quota, so an
 * immediate retry can succeed instead of compounding into a 429.
 */
export async function checkRefreshRateLimit(
  kv: KVNamespace,
  sessionId: string,
  clientIp: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const nowMs = Date.now();
  const sessionCheck = await checkBucket(kv, `ratelimit:session:${sessionId}`, nowMs, MAX_REFRESH_PER_HOUR);
  if (!sessionCheck.allowed) return sessionCheck;
  const ipCheck = await checkBucket(kv, `ratelimit:ip:${clientIp}`, nowMs, MAX_REFRESH_PER_IP_HOUR);
  return ipCheck;
}

/** Charge both buckets after a successful token refresh. */
export async function recordRefreshSuccess(
  kv: KVNamespace,
  sessionId: string,
  clientIp: string,
): Promise<void> {
  const nowMs = Date.now();
  await chargeBucket(kv, `ratelimit:session:${sessionId}`, nowMs);
  await chargeBucket(kv, `ratelimit:ip:${clientIp}`, nowMs);
}

/** Exported for unit tests. */
export const REFRESH_RATE_LIMITS = {
  MIN_REFRESH_INTERVAL_MS,
  MAX_REFRESH_PER_HOUR,
  MAX_REFRESH_PER_IP_HOUR,
} as const;
