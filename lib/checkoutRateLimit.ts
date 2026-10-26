import "server-only";

import crypto from "crypto";

const CHECKOUT_RATE_LIMIT = 5;
const CHECKOUT_RATE_LIMIT_WINDOW_SECONDS = 60;
const CHECKOUT_RATE_LIMIT_WINDOW_MS = CHECKOUT_RATE_LIMIT_WINDOW_SECONDS * 1000;
const MEMORY_BUCKETS = new Map<string, { count: number; resetAt: number }>();

type RedisResponse<T> = {
  result: T;
};

export type CheckoutRateLimitResult = {
  allowed: boolean;
  unavailable: boolean;
};

/**
 * Consume one checkout attempt before parsing or processing the request.
 * Redis is required in production because server-local memory is not shared
 * between instances.
 */
export async function consumeCheckoutAttempt(
  identifier: string,
): Promise<CheckoutRateLimitResult> {
  const key = createRateLimitKey(identifier);

  if (hasRedisConfig()) {
    try {
      return {
        allowed: await consumeRedisAttempt(key),
        unavailable: false,
      };
    } catch (error) {
      if (isProduction()) {
        console.error("[CheckoutRateLimit] Distributed limiter unavailable.", error);
        return { allowed: false, unavailable: true };
      }
    }
  } else if (isProduction()) {
    console.error("[CheckoutRateLimit] Redis rate limiting is required in production.");
    return { allowed: false, unavailable: true };
  }

  return { allowed: consumeMemoryAttempt(key), unavailable: false };
}

export function createCheckoutRateLimitIdentifier(headersList: Headers) {
  const ip =
    headersList.get("cf-connecting-ip") ||
    headersList.get("true-client-ip") ||
    headersList.get("x-real-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return hashValue(ip);
}

function createRateLimitKey(identifier: string) {
  return `checkout:attempt:${identifier}`;
}

async function consumeRedisAttempt(key: string) {
  const response = await redisCommand<number>(["incr", key]);

  if (response.result === 1) {
    await redisCommand<number>(["expire", key, String(CHECKOUT_RATE_LIMIT_WINDOW_SECONDS)]);
  }

  return response.result <= CHECKOUT_RATE_LIMIT;
}

async function redisCommand<T>(parts: string[]) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error("Redis rate limit config is missing.");
  }

  const commandPath = parts.map((part) => encodeURIComponent(part)).join("/");
  const response = await fetch(`${redisUrl.replace(/\/$/, "")}/${commandPath}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${redisToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Redis rate limit command failed.");
  }

  return (await response.json()) as RedisResponse<T>;
}

function consumeMemoryAttempt(key: string) {
  const bucket = getMemoryBucket(key);

  bucket.count += 1;
  return bucket.count <= CHECKOUT_RATE_LIMIT;
}

function getMemoryBucket(key: string) {
  const now = Date.now();
  const bucket = MEMORY_BUCKETS.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const nextBucket = {
      count: 0,
      resetAt: now + CHECKOUT_RATE_LIMIT_WINDOW_MS,
    };
    MEMORY_BUCKETS.set(key, nextBucket);
    cleanupMemoryBuckets(now);
    return nextBucket;
  }

  return bucket;
}

function cleanupMemoryBuckets(now: number) {
  for (const [key, bucket] of MEMORY_BUCKETS) {
    if (bucket.resetAt <= now) {
      MEMORY_BUCKETS.delete(key);
    }
  }
}

function hasRedisConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
