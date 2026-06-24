import { describe, expect, it } from "vitest";

import { getSelectedWorkflowComponentKey } from "./selectedWorkflowComponent";

describe("selected workflow component model", () => {
  it("returns a stable key for the selected FlowGram node", () => {
    expect(
      getSelectedWorkflowComponentKey({
        nodeId: "workflow-node-1",
        instanceId: "component-1",
        componentType: "core.quota.tracker",
        title: "Quota",
        status: "success",
        size: { w: 320, h: 180 },
      }),
    ).toBe(
      "workflow-node-1:component-1:core.quota.tracker:success:320:180:null",
    );
  });

  it("uses a sentinel key when nothing is selected", () => {
    expect(getSelectedWorkflowComponentKey(undefined)).toBe("none");
  });
});
