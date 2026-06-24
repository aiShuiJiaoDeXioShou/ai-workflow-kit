import { describe, expect, it } from "vitest";

import { __testing } from "./WorkflowRuntimeCoordinator";

const config = {
  expectedStatus: 200,
  intervalSeconds: 5,
  label: "HTTP 健康检查",
  method: "GET",
  showLatency: true,
  timeoutMs: 1_000,
  url: "https://example.com/health",
} as const;

describe("workflow runtime coordinator", () => {
  it("runs immediately when an HTTP health component has no previous run", () => {
    expect(
      __testing.shouldRunHttpHealthCheck({
        config,
        now: 1_000,
        record: {
          inFlight: false,
        },
      }),
    ).toBe(true);
  });

  it("skips checks that are already running or not yet due", () => {
    expect(
      __testing.shouldRunHttpHealthCheck({
        config,
        now: 4_000,
        record: {
          inFlight: true,
          lastRunAt: 0,
        },
      }),
    ).toBe(false);
    expect(
      __testing.shouldRunHttpHealthCheck({
        config,
        now: 4_000,
        record: {
          inFlight: false,
          lastRunAt: 1_000,
        },
      }),
    ).toBe(false);
  });

  it("runs again after the configured interval", () => {
    expect(
      __testing.shouldRunHttpHealthCheck({
        config,
        now: 6_000,
        record: {
          inFlight: false,
          lastRunAt: 1_000,
        },
      }),
    ).toBe(true);
  });

  it("uses the fields that affect HTTP checks for the config key", () => {
    const firstKey = __testing.stableConfigKey(config);
    const secondKey = __testing.stableConfigKey({
      ...config,
      url: "https://example.com/ready",
    });

    expect(firstKey).not.toBe(secondKey);
  });
});
