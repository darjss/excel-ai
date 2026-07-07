const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 5;

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
}

export interface RateLimitStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const parseLimit = (raw: string | undefined): number => {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_LIMIT;
};

const parseBucket = (raw: string | null, limit: number, now: number): Bucket => {
  if (raw === null) return { tokens: limit, updatedAt: now };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      const tokens = typeof record.tokens === "number" ? record.tokens : limit;
      const updatedAt = typeof record.updatedAt === "number" ? record.updatedAt : now;
      return { tokens, updatedAt };
    }
  } catch {
    return { tokens: limit, updatedAt: now };
  }
  return { tokens: limit, updatedAt: now };
};

const refill = (bucket: Bucket, limit: number, now: number): number => {
  const elapsed = Math.max(0, now - bucket.updatedAt);
  const restored = (elapsed / HOUR_MS) * limit;
  return Math.min(limit, bucket.tokens + restored);
};

const consumeToken = async (
  cache: RateLimitStore,
  scope: string,
  ip: string,
  limitVar: string | undefined,
): Promise<RateLimitDecision> => {
  const limit = parseLimit(limitVar);
  const now = Date.now();
  const key = `ratelimit:${scope}:${ip}`;
  const stored = parseBucket(await cache.get(key), limit, now);
  const available = refill(stored, limit, now);

  if (available < 1) {
    return { allowed: false, limit, remaining: 0 };
  }

  const next: Bucket = { tokens: available - 1, updatedAt: now };
  await cache.put(key, JSON.stringify(next), { expirationTtl: 3600 });
  return { allowed: true, limit, remaining: Math.floor(next.tokens) };
};

export const consumeExtractionToken = (
  cache: RateLimitStore,
  ip: string,
  limitVar: string | undefined,
): Promise<RateLimitDecision> => consumeToken(cache, "extraction", ip, limitVar);

export const consumeWhiteGloveToken = (
  cache: RateLimitStore,
  ip: string,
  limitVar: string | undefined,
): Promise<RateLimitDecision> => consumeToken(cache, "white-glove", ip, limitVar);
