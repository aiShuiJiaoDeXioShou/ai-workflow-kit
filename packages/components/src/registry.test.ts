import type {
  ComponentViewProps,
  WorkflowComponentModule,
} from "@ai-workflow-kit/component-sdk";
import { assertValidComponentRegistry } from "@ai-workflow-kit/component-sdk";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { agentLauncherComponent } from "./core-agent-launcher";
import { httpHealthMonitorComponent } from "./core-monitor-http-health";
import { quotaTrackerComponent } from "./core-quota-tracker";
import { canvasNoteComponent } from "./local-canvas-note";
import {
  builtInComponentTypes,
  componentManifests,
  componentRegistry,
  createTrustedComponentRegistry,
  getComponentByType,
  getComponentManifest,
  hasComponentType,
} from "./registry";

const testConfigSchema = z.object({
  label: z.string(),
});

function TestCanvasView(
  _props: ComponentViewProps<z.infer<typeof testConfigSchema>>,
) {
  return null;
}

function createTestComponent(
  type: string,
): WorkflowComponentModule<typeof testConfigSchema> {
  return {
    manifest: {
      type,
      title: "Registry test component",
      description: "用于验证 trusted registry 的测试组件。",
      version: "0.1.0",
      category: "utility",
      icon: "box",
      defaultSize: { w: 240, h: 140 },
      configSchema: testConfigSchema,
      defaultConfig: { label: "ready" },
    },
    CanvasView: TestCanvasView,
  };
}

describe("trusted component registry", () => {
  it("registers the first trusted components", () => {
    expect(componentRegistry).toEqual([
      httpHealthMonitorComponent,
      quotaTrackerComponent,
      agentLauncherComponent,
      canvasNoteComponent,
    ]);
    expect(componentManifests).toEqual([
      httpHealthMonitorComponent.manifest,
      quotaTrackerComponent.manifest,
      agentLauncherComponent.manifest,
      canvasNoteComponent.manifest,
    ]);
    expect(getComponentByType(builtInComponentTypes.httpHealthMonitor)).toBe(
      httpHealthMonitorComponent,
    );
    expect(getComponentManifest(builtInComponentTypes.httpHealthMonitor)).toBe(
      httpHealthMonitorComponent.manifest,
    );
    expect(getComponentByType(builtInComponentTypes.quotaTracker)).toBe(
      quotaTrackerComponent,
    );
    expect(getComponentManifest(builtInComponentTypes.quotaTracker)).toBe(
      quotaTrackerComponent.manifest,
    );
    expect(getComponentByType(builtInComponentTypes.agentLauncher)).toBe(
      agentLauncherComponent,
    );
    expect(getComponentManifest(builtInComponentTypes.agentLauncher)).toBe(
      agentLauncherComponent.manifest,
    );
    expect(hasComponentType(builtInComponentTypes.httpHealthMonitor)).toBe(
      true,
    );
    expect(hasComponentType(builtInComponentTypes.quotaTracker)).toBe(true);
    expect(hasComponentType(builtInComponentTypes.agentLauncher)).toBe(true);
    expect(getComponentByType(builtInComponentTypes.canvasNote)).toBe(
      canvasNoteComponent,
    );
    expect(getComponentManifest(builtInComponentTypes.canvasNote)).toBe(
      canvasNoteComponent.manifest,
    );
    expect(hasComponentType(builtInComponentTypes.canvasNote)).toBe(true);
  });

  it("passes SDK registry validation", () => {
    expect(() =>
      assertValidComponentRegistry([...componentRegistry]),
    ).not.toThrow();
  });

  it("creates a stable lookup table by component type", () => {
    const httpHealthComponent = createTestComponent(
      builtInComponentTypes.httpHealthMonitor,
    );
    const registry = createTrustedComponentRegistry([httpHealthComponent]);

    expect(registry.components).toHaveLength(1);
    expect(registry.manifests).toEqual([httpHealthComponent.manifest]);
    expect(registry.getByType(builtInComponentTypes.httpHealthMonitor)).toBe(
      httpHealthComponent,
    );
    expect(registry.has(builtInComponentTypes.httpHealthMonitor)).toBe(true);
    expect(registry.getByType("local.missing.component")).toBeUndefined();
    expect(registry.getManifest("local.missing.component")).toBeUndefined();
    expect(registry.has("local.missing.component")).toBe(false);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.components)).toBe(true);
    expect(Object.isFrozen(registry.manifests)).toBe(true);
  });

  it("fails fast when duplicate component types are registered", () => {
    const firstComponent = createTestComponent(
      builtInComponentTypes.quotaTracker,
    );
    const duplicateComponent = createTestComponent(
      builtInComponentTypes.quotaTracker,
    );

    expect(() =>
      createTrustedComponentRegistry([firstComponent, duplicateComponent]),
    ).toThrow(/duplicate component type/);
  });

  it("fails fast when a component manifest is invalid", () => {
    const invalidComponent = {
      ...createTestComponent("core.invalid.component"),
      manifest: {
        ...createTestComponent("core.invalid.component").manifest,
        defaultConfig: { label: 42 },
      },
    } as unknown as WorkflowComponentModule;

    expect(() => createTrustedComponentRegistry([invalidComponent])).toThrow(
      /defaultConfig.label/,
    );
  });
});
