import {
  assertValidComponentRegistry,
  validateComponentManifest,
  type WorkflowComponentModule,
} from "@ai-workflow-kit/component-sdk";
import { describe, expect, it } from "vitest";

import {
  defaultQuotaTrackerConfig,
  deriveManualQuotaRuntimeState,
  parseQuotaRuntimeState,
  quotaTrackerComponent,
  quotaTrackerConfigSchema,
  refreshQuotaAction,
  resolveQuotaLevel,
} from "../index";

describe("quota tracker component", () => {
  it("declares a valid manifest and default config", () => {
    expect(validateComponentManifest(quotaTrackerComponent.manifest).valid).toBe(
      true,
    );
    expect(
      quotaTrackerConfigSchema.safeParse(defaultQuotaTrackerConfig).success,
    ).toBe(true);
    const registryComponent =
      quotaTrackerComponent as unknown as WorkflowComponentModule;

    expect(() =>
      assertValidComponentRegistry([registryComponent]),
    ).not.toThrow();
  });

  it("declares the refreshQuota file action", () => {
    expect(refreshQuotaAction.id).toBe("refreshQuota");
    expect(refreshQuotaAction.kind).toBe("quota.file.refresh");
    expect(quotaTrackerComponent.manifest.actions).toEqual([
      refreshQuotaAction,
    ]);
  });

  it("keeps canvas and inspector views on the SDK module contract", () => {
    const component: WorkflowComponentModule<typeof quotaTrackerConfigSchema> =
      quotaTrackerComponent;

    expect(component.CanvasView).toBeTypeOf("function");
    expect(component.InspectorView).toBeTypeOf("function");
  });

  it("validates threshold order and file mode path", () => {
    expect(
      quotaTrackerConfigSchema.safeParse({
        ...defaultQuotaTrackerConfig,
        warningThresholdPercent: 90,
        criticalThresholdPercent: 80,
      }).success,
    ).toBe(false);

    expect(
      quotaTrackerConfigSchema.safeParse({
        ...defaultQuotaTrackerConfig,
        sourceMode: "file",
        filePath: "",
      }).success,
    ).toBe(false);

    expect(
      quotaTrackerConfigSchema.safeParse({
        ...defaultQuotaTrackerConfig,
        jsonMapping: {
          currentPath: "",
          limitPath: "usage.limit",
        },
      }).success,
    ).toBe(false);
  });

  it("derives manual runtime state from config", () => {
    expect(
      deriveManualQuotaRuntimeState({
        ...defaultQuotaTrackerConfig,
        manualCurrent: 80,
        manualLimit: 100,
      }),
    ).toEqual({
      current: 80,
      limit: 100,
      remaining: 20,
      percentUsed: 80,
      level: "warning",
    });
  });

  it("resolves quota levels against configured thresholds", () => {
    const thresholds = {
      warningThresholdPercent: 75,
      criticalThresholdPercent: 90,
    };

    expect(resolveQuotaLevel(undefined, thresholds)).toBe("unknown");
    expect(resolveQuotaLevel(40, thresholds)).toBe("normal");
    expect(resolveQuotaLevel(80, thresholds)).toBe("warning");
    expect(resolveQuotaLevel(95, thresholds)).toBe("critical");
  });

  it("parses unknown runtime state defensively", () => {
    expect(parseQuotaRuntimeState(undefined)).toEqual({
      level: "unknown",
    });

    const parsed = parseQuotaRuntimeState({
      current: 120,
      limit: 100,
      remaining: -20,
      percentUsed: 120,
      level: "critical",
      lastLoadedAt: "2026-06-23T09:30:00.000Z",
      lastError: "",
    });

    expect(parsed).toEqual({
      current: 120,
      limit: 100,
      remaining: -20,
      percentUsed: 120,
      level: "critical",
      lastLoadedAt: "2026-06-23T09:30:00.000Z",
      lastError: undefined,
    });
  });

  it("derives missing quota runtime fields from current and limit", () => {
    expect(
      parseQuotaRuntimeState({
        current: 25,
        limit: 100,
        level: "normal",
      }),
    ).toEqual({
      current: 25,
      limit: 100,
      remaining: 75,
      percentUsed: 25,
      level: "normal",
      lastLoadedAt: undefined,
      lastError: undefined,
    });
  });
});
