import {
  defaultQuotaTrackerConfig,
  quotaTrackerManifest,
  type QuotaRuntimeState,
} from "@ai-workflow-kit/components";
import { describe, expect, it } from "vitest";

import { createRuntimeActionDispatcher } from "./actionDispatcher";
import { createQuotaActionHandlers } from "./quotaHandler";

describe("quota refresh runtime handler", () => {
  it("derives manual quota state without reading a file", async () => {
    let fileReadCalled = false;
    const dispatcher = createRuntimeActionDispatcher(
      createQuotaActionHandlers({
        refreshQuotaFile: async () => {
          fileReadCalled = true;
          return { level: "unknown" };
        },
        now: () => new Date("2026-06-23T09:30:00.000Z"),
      }),
    );

    await expect(
      dispatcher.dispatch({
        manifest: quotaTrackerManifest,
        instanceId: "component-1",
        actionId: "refreshQuota",
        config: {
          ...defaultQuotaTrackerConfig,
          manualCurrent: 80,
          manualLimit: 100,
        },
      }),
    ).resolves.toEqual({
      current: 80,
      limit: 100,
      remaining: 20,
      percentUsed: 80,
      level: "warning",
      lastLoadedAt: "2026-06-23T09:30:00.000Z",
    });
    expect(fileReadCalled).toBe(false);
  });

  it("delegates file mode to the dedicated quota file command", async () => {
    const runtimeState: QuotaRuntimeState = {
      current: 42,
      limit: 100,
      remaining: 58,
      percentUsed: 42,
      level: "normal",
      lastLoadedAt: "2026-06-23T09:30:00.000Z",
    };
    const dispatcher = createRuntimeActionDispatcher(
      createQuotaActionHandlers({
        refreshQuotaFile: async (request) => {
          expect(request).toEqual({
            filePath: "/tmp/quota.json",
            jsonMapping: {
              currentPath: "usage.current",
              limitPath: "usage.limit",
            },
            warningThresholdPercent: 75,
            criticalThresholdPercent: 90,
          });
          return runtimeState;
        },
      }),
    );

    await expect(
      dispatcher.dispatch({
        manifest: quotaTrackerManifest,
        instanceId: "component-1",
        actionId: "refreshQuota",
        config: {
          ...defaultQuotaTrackerConfig,
          sourceMode: "file",
          filePath: "/tmp/quota.json",
          jsonMapping: {
            currentPath: "usage.current",
            limitPath: "usage.limit",
          },
        },
      }),
    ).resolves.toBe(runtimeState);
  });

  it("turns file refresh failures into unknown runtime state", async () => {
    const dispatcher = createRuntimeActionDispatcher(
      createQuotaActionHandlers({
        refreshQuotaFile: async () => {
          throw new Error("file not found");
        },
        now: () => new Date("2026-06-23T09:30:00.000Z"),
      }),
    );

    await expect(
      dispatcher.dispatch({
        manifest: quotaTrackerManifest,
        instanceId: "component-1",
        actionId: "refreshQuota",
        config: {
          ...defaultQuotaTrackerConfig,
          sourceMode: "file",
          filePath: "/tmp/missing.json",
        },
      }),
    ).resolves.toEqual({
      level: "unknown",
      lastLoadedAt: "2026-06-23T09:30:00.000Z",
      lastError: "file not found",
    });
  });
});
