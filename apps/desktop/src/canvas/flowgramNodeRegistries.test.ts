import { describe, expect, it } from "vitest";

import {
  FLOWGRAM_WORKFLOW_END_NODE_TYPE,
  FLOWGRAM_WORKFLOW_START_NODE_TYPE,
} from "./flowgramComponentNode";
import { flowgramNodeRegistries } from "./flowgramNodeRegistries";

function findNodeRegistry(type: string) {
  return flowgramNodeRegistries.find((registry) => registry.type === type);
}

describe("FlowGram node registries", () => {
  it("keeps legacy start and end node registries deletable", () => {
    const startRegistry = findNodeRegistry(FLOWGRAM_WORKFLOW_START_NODE_TYPE);
    const endRegistry = findNodeRegistry(FLOWGRAM_WORKFLOW_END_NODE_TYPE);

    expect(startRegistry?.meta?.deleteDisable).not.toBe(true);
    expect(endRegistry?.meta?.deleteDisable).not.toBe(true);
    expect(startRegistry?.meta?.copyDisable).not.toBe(true);
    expect(endRegistry?.meta?.copyDisable).not.toBe(true);
    expect(startRegistry?.meta?.isStart).not.toBe(true);
  });
});
