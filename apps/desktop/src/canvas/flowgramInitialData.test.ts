import { describe, expect, it } from "vitest";

import { initialFlowgramData } from "./flowgramInitialData";

describe("FlowGram initial data", () => {
  it("starts with an empty canvas instead of default system nodes", () => {
    expect(initialFlowgramData.nodes).toEqual([]);
    expect(initialFlowgramData.edges).toEqual([]);
  });
});
