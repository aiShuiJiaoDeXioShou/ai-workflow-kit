import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assertValidComponentRegistry,
  isJsonSerializableConfig,
  validateComponentManifest,
  validateComponentRegistry,
  type WorkflowComponentModule,
} from "./index";

const configSchema = z.object({
  label: z.string(),
});

function createComponent(type = "core.monitor.http-health"): WorkflowComponentModule<
  typeof configSchema
> {
  return {
    manifest: {
      type,
      title: "HTTP Health",
      description: "检查 HTTP endpoint 是否健康。",
      version: "0.1.0",
      category: "monitor",
      icon: "activity",
      defaultSize: { w: 320, h: 180 },
      configSchema,
      defaultConfig: { label: "API" },
      actions: [
        {
          id: "checkNow",
          title: "立即检查",
          kind: "monitor.http.check",
        },
      ],
    },
    CanvasView: () => null,
  };
}

describe("component manifest validation", () => {
  it("accepts a valid manifest", () => {
    const result = validateComponentManifest(createComponent().manifest);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects invalid default config", () => {
    const component = createComponent();
    component.manifest.defaultConfig = { label: 123 } as unknown as {
      label: string;
    };

    const result = validateComponentManifest(component.manifest);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path.startsWith("defaultConfig"))).toBe(
      true,
    );
  });

  it("rejects default config that cannot be persisted as JSON", () => {
    const component = createComponent();
    component.manifest.configSchema = z.object({
      handler: z.any(),
    }) as unknown as typeof configSchema;
    component.manifest.defaultConfig = {
      handler: () => undefined,
    } as unknown as { label: string };

    const result = validateComponentManifest(component.manifest);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: "defaultConfig",
      message: "defaultConfig must be JSON-serializable",
    });
  });

  it("rejects duplicate action ids and unsupported action kinds", () => {
    const component = createComponent();
    component.manifest.actions = [
      {
        id: "run",
        title: "运行",
        kind: "monitor.http.check",
      },
      {
        id: "run",
        title: "重复运行",
        kind: "unknown.kind" as "monitor.http.check",
      },
    ];

    const result = validateComponentManifest(component.manifest);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: "actions.1.id",
      message: "duplicate action id: run",
    });
    expect(result.issues).toContainEqual({
      path: "actions.1.kind",
      message: "action kind is not supported",
    });
  });

  it("rejects action input schemas that are not Zod schemas", () => {
    const component = createComponent();
    component.manifest.actions = [
      {
        id: "checkNow",
        title: "立即检查",
        kind: "monitor.http.check",
        inputSchema: { type: "object" } as never,
      },
    ];

    const result = validateComponentManifest(component.manifest);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: "actions.0.inputSchema",
      message: "inputSchema must be a Zod schema",
    });
  });

  it("rejects duplicate registry types", () => {
    const result = validateComponentRegistry([
      createComponent(),
      createComponent(),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("duplicate"))).toBe(
      true,
    );
  });

  it("throws a registry error that points at the invalid component", () => {
    expect(() =>
      assertValidComponentRegistry([
        createComponent(),
        createComponent("bad"),
      ]),
    ).toThrow("registry.1.type");
  });

  it("detects non-serializable config values", () => {
    expect(isJsonSerializableConfig({ ok: true })).toBe(true);
    expect(isJsonSerializableConfig({ bad: () => undefined })).toBe(false);
    expect(isJsonSerializableConfig({ bad: [undefined] })).toBe(false);
    expect(isJsonSerializableConfig({ bad: Symbol("secret") })).toBe(false);
  });
});
