import {
  assertValidComponentRegistry,
  validateComponentManifest,
  type WorkflowComponentModule,
} from "@ai-workflow-kit/component-sdk";
import { describe, expect, it } from "vitest";

import {
  checkNowAction,
  defaultHttpHealthMonitorConfig,
  httpHealthMonitorComponent,
  httpHealthMonitorConfigSchema,
  parseHttpHealthRuntimeState,
} from "../index";

describe("http health monitor component", () => {
  it("declares a valid manifest and default config", () => {
    expect(
      validateComponentManifest(httpHealthMonitorComponent.manifest).valid,
    ).toBe(true);
    expect(
      httpHealthMonitorConfigSchema.safeParse(defaultHttpHealthMonitorConfig)
        .success,
    ).toBe(true);
    const registryComponent =
      httpHealthMonitorComponent as unknown as WorkflowComponentModule;

    expect(() =>
      assertValidComponentRegistry([registryComponent]),
    ).not.toThrow();
  });

  it("declares the checkNow monitor action", () => {
    expect(checkNowAction.id).toBe("checkNow");
    expect(checkNowAction.kind).toBe("monitor.http.check");
    expect(httpHealthMonitorComponent.manifest.actions).toEqual([
      checkNowAction,
    ]);
  });

  it("keeps canvas and inspector views on the SDK module contract", () => {
    const component: WorkflowComponentModule<
      typeof httpHealthMonitorConfigSchema
    > = httpHealthMonitorComponent;

    expect(component.CanvasView).toBeTypeOf("function");
    expect(component.InspectorView).toBeTypeOf("function");
  });

  it("rejects unsafe or unsupported HTTP monitor config", () => {
    expect(
      httpHealthMonitorConfigSchema.safeParse({
        ...defaultHttpHealthMonitorConfig,
        url: "not-a-url",
      }).success,
    ).toBe(false);
    expect(
      httpHealthMonitorConfigSchema.safeParse({
        ...defaultHttpHealthMonitorConfig,
        method: "PATCH",
      }).success,
    ).toBe(false);
    expect(
      httpHealthMonitorConfigSchema.safeParse({
        ...defaultHttpHealthMonitorConfig,
        expectedStatus: 99,
      }).success,
    ).toBe(false);
    expect(
      httpHealthMonitorConfigSchema.safeParse({
        ...defaultHttpHealthMonitorConfig,
        intervalSeconds: 1,
      }).success,
    ).toBe(false);
    expect(
      httpHealthMonitorConfigSchema.safeParse({
        ...defaultHttpHealthMonitorConfig,
        timeoutMs: 50,
      }).success,
    ).toBe(false);
  });

  it("parses unknown runtime state defensively", () => {
    expect(parseHttpHealthRuntimeState(undefined)).toEqual({
      status: "idle",
      history: [],
    });

    const parsed = parseHttpHealthRuntimeState({
      status: "up",
      latencyMs: 42.4,
      lastCheckedAt: "2026-06-23T09:30:00.000Z",
      lastError: "",
      history: [
        { status: "up", latencyMs: 30, statusCode: 200 },
        { status: "checking" },
        { status: "down", latencyMs: -1, statusCode: 503 },
        { status: "error", error: "timeout" },
      ],
    });

    expect(parsed).toEqual({
      status: "up",
      latencyMs: 42.4,
      lastCheckedAt: "2026-06-23T09:30:00.000Z",
      lastError: undefined,
      history: [
        { status: "up", latencyMs: 30, statusCode: 200 },
        { status: "down", latencyMs: undefined, statusCode: 503 },
        { status: "error", error: "timeout" },
      ],
    });
  });

  it("keeps HTTP result history compact and ordered", () => {
    const parsed = parseHttpHealthRuntimeState({
      status: "down",
      history: Array.from({ length: 8 }, (_, index) => ({
        status: index % 2 === 0 ? "up" : "down",
        checkedAt: `2026-06-23T09:3${index}:00.000Z`,
      })),
    });

    expect(parsed.history).toHaveLength(6);
    expect(parsed.history[0]?.checkedAt).toBe("2026-06-23T09:32:00.000Z");
    expect(parsed.history[5]?.checkedAt).toBe("2026-06-23T09:37:00.000Z");
  });
});
