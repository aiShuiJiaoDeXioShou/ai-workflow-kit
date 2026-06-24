import { describe, expect, it } from "vitest";

import {
  clearCurrentWorkflowComponentDragPayload,
  hasWorkflowComponentDragPayload,
  readCurrentWorkflowComponentDragPayload,
  setCurrentWorkflowComponentDragPayload,
} from "./componentDragPayload";

const emptyDataTransfer = {
  types: [],
} as unknown as DataTransfer;

describe("workflow component drag payload", () => {
  it("tracks the active app-level drag payload independently from DataTransfer types", () => {
    const payload = {
      kind: "workflow-component" as const,
      componentType: "monitor.http-health",
      defaultSize: {
        w: 280,
        h: 180,
      },
    };

    setCurrentWorkflowComponentDragPayload(payload);

    expect(hasWorkflowComponentDragPayload(emptyDataTransfer)).toBe(true);
    expect(readCurrentWorkflowComponentDragPayload()).toEqual(payload);

    clearCurrentWorkflowComponentDragPayload();

    expect(hasWorkflowComponentDragPayload(emptyDataTransfer)).toBe(false);
    expect(readCurrentWorkflowComponentDragPayload()).toBeUndefined();
  });
});
