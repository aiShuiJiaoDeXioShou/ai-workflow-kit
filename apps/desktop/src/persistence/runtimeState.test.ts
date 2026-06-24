import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

import {
  loadComponentRuntimeState,
  upsertComponentRuntimeState,
} from "./runtimeState";

describe("component runtime state persistence wrapper", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("upserts runtime state through the dedicated Tauri command", async () => {
    invokeMock.mockResolvedValue({
      componentInstanceId: "component-1",
      stateJson: { level: "normal" },
      updatedAt: "2026-06-23T09:30:00.000Z",
    });

    await expect(
      upsertComponentRuntimeState({
        componentInstanceId: "component-1",
        stateJson: { level: "normal" },
      }),
    ).resolves.toEqual({
      componentInstanceId: "component-1",
      stateJson: { level: "normal" },
      updatedAt: "2026-06-23T09:30:00.000Z",
    });

    expect(invokeMock).toHaveBeenCalledWith("upsert_component_runtime_state", {
      request: {
        componentInstanceId: "component-1",
        stateJson: { level: "normal" },
      },
    });
  });

  it("loads runtime state through the dedicated Tauri command", async () => {
    invokeMock.mockResolvedValue(null);

    await expect(
      loadComponentRuntimeState({ componentInstanceId: "component-1" }),
    ).resolves.toBeNull();

    expect(invokeMock).toHaveBeenCalledWith("load_component_runtime_state", {
      request: { componentInstanceId: "component-1" },
    });
  });
});
