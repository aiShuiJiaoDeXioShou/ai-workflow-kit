import {
  defaultHttpHealthMonitorConfig,
  httpHealthMonitorManifest,
  type HttpHealthRuntimeState,
} from "@ai-workflow-kit/components";
import { describe, expect, it } from "vitest";

import { createRuntimeActionDispatcher } from "./actionDispatcher";
import { createHttpHealthActionHandlers } from "./httpHealthHandler";

function createDispatcher(fetcher: typeof fetch, monotonicValues: number[]) {
  let monotonicIndex = 0;

  return createRuntimeActionDispatcher(
    createHttpHealthActionHandlers({
      fetcher,
      monotonicNow: () => monotonicValues[monotonicIndex++] ?? 0,
      now: () => new Date("2026-06-23T09:30:00.000Z"),
    }),
  );
}

describe("http health runtime handler", () => {
  it("returns an up state when the endpoint matches the expected status", async () => {
    const dispatcher = createDispatcher(
      async () => new Response(null, { status: 200 }),
      [100, 148],
    );

    await expect(
      dispatcher.dispatch({
        manifest: httpHealthMonitorManifest,
        instanceId: "component-1",
        actionId: "checkNow",
        config: defaultHttpHealthMonitorConfig,
      }),
    ).resolves.toEqual({
      status: "up",
      latencyMs: 48,
      lastCheckedAt: "2026-06-23T09:30:00.000Z",
      lastError: undefined,
      history: [
        {
          status: "up",
          latencyMs: 48,
          statusCode: 200,
          checkedAt: "2026-06-23T09:30:00.000Z",
          error: undefined,
        },
      ],
    });
  });

  it("returns down when the response status is unexpected", async () => {
    const dispatcher = createDispatcher(
      async () => new Response(null, { status: 503 }),
      [0, 12],
    );

    await expect(
      dispatcher.dispatch({
        manifest: httpHealthMonitorManifest,
        instanceId: "component-1",
        actionId: "checkNow",
        config: defaultHttpHealthMonitorConfig,
      }),
    ).resolves.toMatchObject({
      status: "down",
      lastError: "期望 200，实际 503",
      history: [
        {
          status: "down",
          statusCode: 503,
          error: "期望 200，实际 503",
        },
      ],
    });
  });

  it("returns error when fetch fails", async () => {
    const dispatcher = createDispatcher(async () => {
      throw new Error("network unavailable");
    }, [0]);

    await expect(
      dispatcher.dispatch({
        manifest: httpHealthMonitorManifest,
        instanceId: "component-1",
        actionId: "checkNow",
        config: defaultHttpHealthMonitorConfig,
      }),
    ).resolves.toMatchObject({
      status: "error",
      lastError: "network unavailable",
      history: [
        {
          status: "error",
          error: "network unavailable",
        },
      ],
    });
  });

  it("keeps recent result history compact", async () => {
    const previousState: HttpHealthRuntimeState = {
      status: "up",
      history: [
        { status: "up", checkedAt: "1" },
        { status: "up", checkedAt: "2" },
        { status: "down", checkedAt: "3" },
        { status: "up", checkedAt: "4" },
        { status: "error", checkedAt: "5" },
        { status: "up", checkedAt: "6" },
      ],
    };
    const dispatcher = createDispatcher(
      async () => new Response(null, { status: 200 }),
      [0, 7],
    );

    const result = (await dispatcher.dispatch({
      manifest: httpHealthMonitorManifest,
      instanceId: "component-1",
      actionId: "checkNow",
      config: defaultHttpHealthMonitorConfig,
      runtimeState: previousState,
    })) as HttpHealthRuntimeState;

    expect(result.history.map((item) => item.checkedAt)).toEqual([
      "2",
      "3",
      "4",
      "5",
      "6",
      "2026-06-23T09:30:00.000Z",
    ]);
  });
});
