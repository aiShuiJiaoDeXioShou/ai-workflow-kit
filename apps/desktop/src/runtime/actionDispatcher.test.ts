import { describe, expect, it } from "vitest";

import {
  checkNowAction,
  defaultHttpHealthMonitorConfig,
  httpHealthMonitorManifest,
} from "@ai-workflow-kit/components";

import { createRuntimeActionDispatcher } from "./actionDispatcher";

describe("runtime action dispatcher", () => {
  it("routes a declared action by kind after config validation", async () => {
    const dispatcher = createRuntimeActionDispatcher({
      "monitor.http.check": ({ action, config, instanceId }) => ({
        actionId: action.id,
        config,
        instanceId,
      }),
    });

    await expect(
      dispatcher.dispatch({
        manifest: httpHealthMonitorManifest,
        instanceId: "component-1",
        actionId: "checkNow",
        config: defaultHttpHealthMonitorConfig,
      }),
    ).resolves.toEqual({
      actionId: "checkNow",
      config: defaultHttpHealthMonitorConfig,
      instanceId: "component-1",
    });
  });

  it("rejects actions that are not declared by the manifest", async () => {
    const dispatcher = createRuntimeActionDispatcher({
      "monitor.http.check": () => undefined,
    });

    await expect(
      dispatcher.dispatch({
        manifest: httpHealthMonitorManifest,
        instanceId: "component-1",
        actionId: "missingAction",
        config: defaultHttpHealthMonitorConfig,
      }),
    ).rejects.toMatchObject({
      code: "missing_action",
    });
  });

  it("rejects invalid component config before calling a handler", async () => {
    let called = false;
    const dispatcher = createRuntimeActionDispatcher({
      "monitor.http.check": () => {
        called = true;
      },
    });

    await expect(
      dispatcher.dispatch({
        manifest: httpHealthMonitorManifest,
        instanceId: "component-1",
        actionId: "checkNow",
        config: {
          ...defaultHttpHealthMonitorConfig,
          expectedStatus: 42,
        },
      }),
    ).rejects.toMatchObject({
      code: "invalid_config",
    });
    expect(called).toBe(false);
  });

  it("rejects actions without a registered handler", async () => {
    const dispatcher = createRuntimeActionDispatcher({});

    await expect(
      dispatcher.dispatch({
        manifest: httpHealthMonitorManifest,
        instanceId: "component-1",
        actionId: "checkNow",
        config: defaultHttpHealthMonitorConfig,
      }),
    ).rejects.toMatchObject({
      code: "missing_handler",
    });
  });

  it("rejects unexpected input when an action has no input schema", async () => {
    const dispatcher = createRuntimeActionDispatcher({
      "monitor.http.check": () => undefined,
    });

    await expect(
      dispatcher.dispatch({
        manifest: httpHealthMonitorManifest,
        instanceId: "component-1",
        actionId: "checkNow",
        config: defaultHttpHealthMonitorConfig,
        input: { unexpected: true },
      }),
    ).rejects.toMatchObject({
      code: "invalid_input",
    });
  });

  it("validates action input when a Zod input schema is declared", async () => {
    const dispatcher = createRuntimeActionDispatcher({
      "monitor.http.check": ({ input }) => input,
    });
    const actionWithInput = {
      ...checkNowAction,
      inputSchema: httpHealthMonitorManifest.configSchema.pick({
        url: true,
      }),
    };
    const manifestWithInput = {
      ...httpHealthMonitorManifest,
      actions: [actionWithInput],
    };

    await expect(
      dispatcher.dispatch({
        manifest: manifestWithInput,
        instanceId: "component-1",
        actionId: "checkNow",
        config: defaultHttpHealthMonitorConfig,
        input: { url: "https://example.com/health" },
      }),
    ).resolves.toEqual({ url: "https://example.com/health" });

    await expect(
      dispatcher.dispatch({
        manifest: manifestWithInput,
        instanceId: "component-1",
        actionId: "checkNow",
        config: defaultHttpHealthMonitorConfig,
        input: { url: "not-a-url" },
      }),
    ).rejects.toMatchObject({
      code: "invalid_input",
    });
  });
});
