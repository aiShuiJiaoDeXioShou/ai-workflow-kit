import { describe, expect, it } from "vitest";
import {
  defineWorkflowAction,
  getWorkflowActionKindMetadata,
  isWorkflowActionKind,
  workflowActionKinds,
} from "./index";

describe("declarative action definitions", () => {
  it("lists the V1 action kinds", () => {
    expect(workflowActionKinds).toEqual([
      "monitor.http.check",
      "quota.file.refresh",
      "agent.adapter.start",
      "agent.adapter.stop",
    ]);
  });

  it("guards known action kinds", () => {
    expect(isWorkflowActionKind("monitor.http.check")).toBe(true);
    expect(isWorkflowActionKind("unknown.kind")).toBe(false);
  });

  it("returns action kind metadata", () => {
    expect(getWorkflowActionKindMetadata("agent.adapter.start")).toMatchObject({
      requiresRuntime: true,
    });
  });

  it("preserves action literals through defineWorkflowAction", () => {
    const action = defineWorkflowAction({
      id: "checkNow",
      title: "立即检查",
      kind: "monitor.http.check",
    });

    expect(action.kind).toBe("monitor.http.check");
  });
});
