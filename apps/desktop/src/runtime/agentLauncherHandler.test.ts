import {
  agentLauncherManifest,
  defaultAgentLauncherConfig,
} from "@ai-workflow-kit/components";
import { describe, expect, it } from "vitest";

import { createRuntimeActionDispatcher } from "./actionDispatcher";
import {
  createAgentLauncherActionHandlers,
  type AgentRunRecord,
} from "./agentLauncherHandler";

function createRunRecord(
  partial: Partial<AgentRunRecord> = {},
): AgentRunRecord {
  return {
    id: "run-1",
    adapterId: "local.echo",
    status: "running",
    cwd: "/workspace",
    argsJson: { message: "hello" },
    startedAt: "2026-06-23T09:30:00.000Z",
    ...partial,
  };
}

describe("agent launcher runtime handler", () => {
  it("starts an allowlisted adapter with structured args", async () => {
    const dispatcher = createRuntimeActionDispatcher(
      createAgentLauncherActionHandlers({
        startAgentRun: async (request) => {
          expect(request).toEqual({
            adapterId: "local.echo",
            argsJson: { message: "hello", repeat: 2 },
            cwd: undefined,
          });
          return createRunRecord({
            argsJson: request.argsJson,
          });
        },
      }),
    );

    await expect(
      dispatcher.dispatch({
        manifest: agentLauncherManifest,
        instanceId: "component-1",
        actionId: "startRun",
        config: {
          ...defaultAgentLauncherConfig,
          args: {
            message: "hello",
            repeat: 2,
          },
        },
      }),
    ).resolves.toEqual({
      runId: "run-1",
      status: "running",
      startedAt: "2026-06-23T09:30:00.000Z",
      endedAt: undefined,
      exitCode: undefined,
      recentStdout: [],
      recentStderr: [],
    });
  });

  it("passes configured cwd when cwd mode is not workspace", async () => {
    const dispatcher = createRuntimeActionDispatcher(
      createAgentLauncherActionHandlers({
        startAgentRun: async (request) => {
          expect(request.cwd).toBe("/tmp/project");
          return createRunRecord({
            cwd: request.cwd ?? "",
          });
        },
      }),
    );

    await dispatcher.dispatch({
      manifest: agentLauncherManifest,
      instanceId: "component-1",
      actionId: "startRun",
      config: {
        ...defaultAgentLauncherConfig,
        cwdMode: "fixed",
        cwd: "/tmp/project",
      },
    });
  });

  it("does not call the runner when launcher config is invalid", async () => {
    let called = false;
    const dispatcher = createRuntimeActionDispatcher(
      createAgentLauncherActionHandlers({
        startAgentRun: async () => {
          called = true;
          return createRunRecord();
        },
      }),
    );

    await expect(
      dispatcher.dispatch({
        manifest: agentLauncherManifest,
        instanceId: "component-1",
        actionId: "startRun",
        config: {
          ...defaultAgentLauncherConfig,
          args: {
            nested: { unsafe: true },
          },
        },
      }),
    ).rejects.toMatchObject({
      code: "invalid_config",
    });
    expect(called).toBe(false);
  });

  it("stops the active run by runtime state run id", async () => {
    const dispatcher = createRuntimeActionDispatcher(
      createAgentLauncherActionHandlers({
        stopAgentRun: async (request) => {
          expect(request).toEqual({ runId: "run-123" });
          return createRunRecord({
            id: "run-123",
            status: "stopped",
            endedAt: "2026-06-23T09:31:00.000Z",
            exitCode: null,
          });
        },
      }),
    );

    await expect(
      dispatcher.dispatch({
        manifest: agentLauncherManifest,
        instanceId: "component-1",
        actionId: "stopRun",
        config: defaultAgentLauncherConfig,
        runtimeState: {
          runId: "run-123",
          status: "running",
          recentStdout: ["ready"],
          recentStderr: ["warn"],
        },
      }),
    ).resolves.toEqual({
      runId: "run-123",
      status: "stopped",
      startedAt: "2026-06-23T09:30:00.000Z",
      endedAt: "2026-06-23T09:31:00.000Z",
      exitCode: undefined,
      recentStdout: ["ready"],
      recentStderr: ["warn"],
    });
  });

  it("keeps stop idempotent when no run id exists", async () => {
    let called = false;
    const dispatcher = createRuntimeActionDispatcher(
      createAgentLauncherActionHandlers({
        stopAgentRun: async () => {
          called = true;
          return createRunRecord();
        },
      }),
    );

    await expect(
      dispatcher.dispatch({
        manifest: agentLauncherManifest,
        instanceId: "component-1",
        actionId: "stopRun",
        config: defaultAgentLauncherConfig,
        runtimeState: {
          status: "idle",
          recentStdout: [],
          recentStderr: [],
        },
      }),
    ).resolves.toEqual({
      status: "idle",
      recentStdout: [],
      recentStderr: [],
    });
    expect(called).toBe(false);
  });
});
