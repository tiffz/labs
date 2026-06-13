const MIN_REFRESH_INTERVAL_MS = 30_000;
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

async function checkBucket(
  kv: KVNamespace,
  key: string,
  nowMs: number,
  maxPerHour: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const existing = parseBucket(await kv.get(key));
  const hourStart = hourBucketStart(nowMs);
  let bucket: RateLimitBucket = existing ?? { lastAtMs: 0, hourStartMs: hourStart, hourCount: 0 };

  if (bucket.hourStartMs !== hourStart) {
    bucket = { lastAtMs: bucket.lastAtMs, hourStartMs: hourStart, hourCount: 0 };
  }

  if (nowMs - bucket.lastAtMs < MIN_REFRESH_INTERVAL_MS) {
    return { allowed: false, reason: 'Refresh too soon. Try again in a few seconds.' };
  }
  if (bucket.hourCount >= maxPerHour) {
    return { allowed: false, reason: 'Hourly refresh limit reached.' };
  }

  bucket.lastAtMs = nowMs;
  bucket.hourCount += 1;
  await kv.put(key, JSON.stringify(bucket), { expirationTtl: 7200 });
  return { allowed: true };
}

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

/** Exported for unit tests. */
export const REFRESH_RATE_LIMITS = {
  MIN_REFRESH_INTERVAL_MS,
  MAX_REFRESH_PER_HOUR,
  MAX_REFRESH_PER_IP_HOUR,
} as const;
