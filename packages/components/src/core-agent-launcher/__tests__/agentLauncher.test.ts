import {
  assertValidComponentRegistry,
  validateComponentManifest,
  type WorkflowComponentModule,
} from "@ai-workflow-kit/component-sdk";
import { describe, expect, it } from "vitest";

import {
  agentLauncherComponent,
  agentLauncherConfigSchema,
  defaultAgentLauncherConfig,
  parseAgentLauncherRuntimeState,
  startRunAction,
  stopRunAction,
} from "../index";

describe("agent launcher component", () => {
  it("declares a valid manifest and default config", () => {
    expect(
      validateComponentManifest(agentLauncherComponent.manifest).valid,
    ).toBe(true);
    expect(
      agentLauncherConfigSchema.safeParse(defaultAgentLauncherConfig).success,
    ).toBe(true);
    const registryComponent =
      agentLauncherComponent as unknown as WorkflowComponentModule;

    expect(() =>
      assertValidComponentRegistry([registryComponent]),
    ).not.toThrow();
  });

  it("declares start and stop adapter actions", () => {
    expect(startRunAction.id).toBe("startRun");
    expect(startRunAction.kind).toBe("agent.adapter.start");
    expect(stopRunAction.id).toBe("stopRun");
    expect(stopRunAction.kind).toBe("agent.adapter.stop");
    expect(agentLauncherComponent.manifest.actions).toEqual([
      startRunAction,
      stopRunAction,
    ]);
  });

  it("keeps canvas and inspector views on the SDK module contract", () => {
    const component: WorkflowComponentModule<typeof agentLauncherConfigSchema> =
      agentLauncherComponent;

    expect(component.CanvasView).toBeTypeOf("function");
    expect(component.InspectorView).toBeTypeOf("function");
  });

  it("keeps args structured and JSON-serializable", () => {
    expect(
      agentLauncherConfigSchema.safeParse({
        ...defaultAgentLauncherConfig,
        args: {
          prompt: "hello",
          maxTurns: 2,
          dryRun: true,
        },
      }).success,
    ).toBe(true);

    expect(
      agentLauncherConfigSchema.safeParse({
        ...defaultAgentLauncherConfig,
        args: {
          nested: { unsafe: "shape" },
        },
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported launcher config values", () => {
    expect(
      agentLauncherConfigSchema.safeParse({
        ...defaultAgentLauncherConfig,
        adapterId: "",
      }).success,
    ).toBe(false);

    expect(
      agentLauncherConfigSchema.safeParse({
        ...defaultAgentLauncherConfig,
        cwdMode: "shell",
      }).success,
    ).toBe(false);

    expect(
      agentLauncherConfigSchema.safeParse({
        ...defaultAgentLauncherConfig,
        args: {
          "": "empty key",
        },
      }).success,
    ).toBe(false);
  });

  it("parses unknown runtime state defensively", () => {
    expect(parseAgentLauncherRuntimeState(undefined)).toEqual({
      status: "idle",
      recentStdout: [],
      recentStderr: [],
    });

    const parsed = parseAgentLauncherRuntimeState({
      runId: "run_123",
      status: "running",
      startedAt: "2026-06-23T09:30:00.000Z",
      endedAt: "",
      exitCode: 0,
      recentStdout: ["one", "", "two"],
      recentStderr: ["warn"],
    });

    expect(parsed).toEqual({
      runId: "run_123",
      status: "running",
      startedAt: "2026-06-23T09:30:00.000Z",
      endedAt: undefined,
      exitCode: 0,
      recentStdout: ["one", "two"],
      recentStderr: ["warn"],
    });
  });

  it("keeps only the latest non-empty recent log lines", () => {
    const parsed = parseAgentLauncherRuntimeState({
      status: "succeeded",
      exitCode: 0.5,
      recentStdout: ["one", "", "two", "three", "four", "five", "six"],
      recentStderr: ["warn-one", "warn-two"],
    });

    expect(parsed.exitCode).toBeUndefined();
    expect(parsed.recentStdout).toEqual([
      "two",
      "three",
      "four",
      "five",
      "six",
    ]);
    expect(parsed.recentStderr).toEqual(["warn-one", "warn-two"]);
  });
});
