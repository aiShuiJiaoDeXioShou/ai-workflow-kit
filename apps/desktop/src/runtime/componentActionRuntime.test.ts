import { describe, expect, it } from "vitest";

import {
  defaultQuotaTrackerConfig,
  defaultHttpHealthMonitorConfig,
} from "@ai-workflow-kit/components";

import {
  invokeComponentActionWithRuntime,
  type ComponentRuntimeStateMap,
} from "./componentActionRuntime";
import type { RunLogAction } from "./runLogState";

describe("component action runtime", () => {
  it("writes run log entries for successful component actions", async () => {
    let runtimeStates: ComponentRuntimeStateMap = {};
    const logActions: RunLogAction[] = [];

    await invokeComponentActionWithRuntime({
      dispatchRunLog: (action) => logActions.push(action),
      request: {
        actionId: "refreshQuota",
        componentType: "core.quota.tracker",
        config: {
          ...defaultQuotaTrackerConfig,
          manualCurrent: 25,
          manualLimit: 100,
        },
        instanceId: "component-1",
        source: "manual",
      },
      setRuntimeStates: (updater) => {
        runtimeStates = updater(runtimeStates);
      },
    });

    expect(runtimeStates["component-1"]).toMatchObject({
      current: 25,
      limit: 100,
      percentUsed: 25,
    });
    expect(logActions.map((action) => action.type)).toEqual([
      "component_action_started",
      "component_action_succeeded",
    ]);
  });

  it("turns failed HTTP outcomes into failed run log entries", async () => {
    let runtimeStates: ComponentRuntimeStateMap = {};
    const logActions: RunLogAction[] = [];

    await invokeComponentActionWithRuntime({
      dispatchRunLog: (action) => logActions.push(action),
      request: {
        actionId: "checkNow",
        componentType: "core.monitor.http-health",
        config: {
          ...defaultHttpHealthMonitorConfig,
          url: "http://127.0.0.1:1/unreachable",
        },
        instanceId: "component-1",
        source: "interval",
      },
      setRuntimeStates: (updater) => {
        runtimeStates = updater(runtimeStates);
      },
    });

    expect(runtimeStates["component-1"]).toMatchObject({
      status: "error",
    });
    expect(logActions.map((action) => action.type)).toEqual([
      "component_action_started",
      "component_action_failed",
    ]);
  });
});
