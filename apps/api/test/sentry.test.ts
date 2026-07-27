import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("Sentry error capture (Unit 35)", () => {
  const originalDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    process.env.SENTRY_DSN = originalDsn;
    vi.resetModules();
  });

  it("is a no-op when SENTRY_DSN is unset (the real state of this environment)", async () => {
    delete process.env.SENTRY_DSN;
    vi.resetModules();
    const { captureError, isSentryEnabled } = await import("../src/core/sentry.js");
    expect(isSentryEnabled()).toBe(false);
    // Should not throw even though Sentry was never initialized.
    expect(() => captureError(new Error("test"), { requestId: "r1", tenantId: "t1" })).not.toThrow();
  });

  it("calls Sentry.captureException with tenant/request tags when SENTRY_DSN is configured", async () => {
    process.env.SENTRY_DSN = "https://fake@sentry.example/1";
    vi.resetModules();
    vi.doMock("@sentry/node", () => {
      const setTag = vi.fn();
      const captureException = vi.fn();
      return {
        init: vi.fn(),
        withScope: (cb: (scope: { setTag: typeof setTag }) => void) => cb({ setTag }),
        captureException,
        __mocks: { setTag, captureException },
      };
    });
    const sentryModule = (await import("@sentry/node")) as unknown as {
      __mocks: { setTag: ReturnType<typeof vi.fn>; captureException: ReturnType<typeof vi.fn> };
    };
    const { captureError } = await import("../src/core/sentry.js");

    const err = new Error("deliberately triggered test error");
    captureError(err, { requestId: "req-123", tenantId: "tenant-abc" });

    expect(sentryModule.__mocks.captureException).toHaveBeenCalledWith(err);
    expect(sentryModule.__mocks.setTag).toHaveBeenCalledWith("requestId", "req-123");
    expect(sentryModule.__mocks.setTag).toHaveBeenCalledWith("tenantId", "tenant-abc");

    vi.doUnmock("@sentry/node");
  });
});
