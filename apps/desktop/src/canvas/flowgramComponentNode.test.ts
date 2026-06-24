import { httpHealthMonitorManifest } from "@ai-workflow-kit/components";
import { describe, expect, it } from "vitest";

import {
  createFlowgramComponentNodeData,
  createFlowgramSystemNodeData,
  toSelectedWorkflowComponent,
} from "./flowgramComponentNode";

describe("FlowGram workflow component node data", () => {
  it("maps a component manifest and instance into lightweight node data", () => {
    const data = createFlowgramComponentNodeData({
      instanceId: "component-1",
      manifest: httpHealthMonitorManifest,
    });

    expect(data).toMatchObject({
      nodeKind: "component",
      instanceId: "component-1",
      componentType: httpHealthMonitorManifest.type,
      title: httpHealthMonitorManifest.title,
      description: httpHealthMonitorManifest.description,
      category: httpHealthMonitorManifest.category,
      status: "idle",
      configJson: httpHealthMonitorManifest.defaultConfig,
      size: httpHealthMonitorManifest.defaultSize,
    });
  });

  it("derives the inspector selection model only for component nodes", () => {
    const componentData = createFlowgramComponentNodeData({
      instanceId: "component-1",
      manifest: httpHealthMonitorManifest,
    });

    expect(toSelectedWorkflowComponent("node-1", componentData)).toEqual({
      nodeId: "node-1",
      instanceId: "component-1",
      componentType: httpHealthMonitorManifest.type,
      configJson: httpHealthMonitorManifest.defaultConfig,
      title: httpHealthMonitorManifest.title,
      status: "idle",
      size: httpHealthMonitorManifest.defaultSize,
    });
    expect(
      toSelectedWorkflowComponent("start", createFlowgramSystemNodeData("start")),
    ).toBeUndefined();
  });
});
