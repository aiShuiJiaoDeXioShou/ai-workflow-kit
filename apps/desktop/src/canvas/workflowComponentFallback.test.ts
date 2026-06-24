import { describe, expect, it } from "vitest";

import { getWorkflowComponentRenderModel } from "./workflowComponentFallback";

describe("workflow component fallback render model", () => {
  it("keeps known component status unchanged", () => {
    expect(
      getWorkflowComponentRenderModel(
        {
          nodeKind: "component",
          componentType: "core.monitor.http-health",
          description: "",
          instanceId: "component-1",
          status: "success",
          title: "API Health",
        },
        () => true,
      ),
    ).toEqual({
      componentType: "core.monitor.http-health",
      instanceId: "component-1",
      isKnownComponent: true,
      status: "success",
      statusLabel: "成功",
      title: "API Health",
    });
  });

  it("forces missing component types into the warning fallback", () => {
    expect(
      getWorkflowComponentRenderModel(
        {
          nodeKind: "component",
          componentType: "local.deleted.component",
          description: "",
          instanceId: "component-2",
          status: "idle",
          title: "Deleted Component",
        },
        () => false,
      ),
    ).toEqual({
      componentType: "local.deleted.component",
      instanceId: "component-2",
      isKnownComponent: false,
      missingMessage: "组件注册项缺失",
      status: "warning",
      statusLabel: "缺失",
      title: "Deleted Component",
    });
  });
});
