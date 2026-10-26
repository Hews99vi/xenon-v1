import { beforeEach, describe, expect, it, vi } from "vitest";

describe("checkout rate limiting", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("counts every attempt and allows only five per window", async () => {
    const { consumeCheckoutAttempt } = await import("@/lib/checkoutRateLimit");
    const identifier = `test-${crypto.randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 6 }, () => consumeCheckoutAttempt(identifier)),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toHaveLength(1);
  });

  it("blocks production checkout when distributed limiting is not configured", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    vi.resetModules();
    const { consumeCheckoutAttempt } = await import("@/lib/checkoutRateLimit");

    await expect(consumeCheckoutAttempt("production-test")).resolves.toEqual({
      allowed: false,
      unavailable: true,
    });
  });
});
