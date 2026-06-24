import {
  assertValidComponentRegistry,
  validateComponentManifest,
  type WorkflowComponentModule,
} from "@ai-workflow-kit/component-sdk";
import { describe, expect, it } from "vitest";

import {
  canvasNoteComponent,
  canvasNoteConfigSchema,
  canvasNoteManifest,
  defaultCanvasNoteConfig,
} from "../index";

describe("canvas note generated component", () => {
  it("declares a valid manifest and default config", () => {
    expect(validateComponentManifest(canvasNoteManifest).valid).toBe(true);
    expect(canvasNoteConfigSchema.safeParse(defaultCanvasNoteConfig).success).toBe(
      true,
    );
    const registryComponent =
      canvasNoteComponent as unknown as WorkflowComponentModule;

    expect(() =>
      assertValidComponentRegistry([registryComponent]),
    ).not.toThrow();
  });

  it("keeps canvas and inspector views on the SDK module contract", () => {
    const component: WorkflowComponentModule<typeof canvasNoteConfigSchema> =
      canvasNoteComponent;

    expect(component.CanvasView).toBeTypeOf("function");
    expect(component.InspectorView).toBeTypeOf("function");
  });

  it("rejects invalid note config", () => {
    expect(
      canvasNoteConfigSchema.safeParse({
        ...defaultCanvasNoteConfig,
        title: "",
      }).success,
    ).toBe(false);
    expect(
      canvasNoteConfigSchema.safeParse({
        ...defaultCanvasNoteConfig,
        body: "",
      }).success,
    ).toBe(false);
    expect(
      canvasNoteConfigSchema.safeParse({
        ...defaultCanvasNoteConfig,
        accent: "purple",
      }).success,
    ).toBe(false);
  });

  it("does not declare runtime actions", () => {
    const registryComponent =
      canvasNoteComponent as unknown as WorkflowComponentModule;

    expect(registryComponent.manifest.actions).toBeUndefined();
  });
});
