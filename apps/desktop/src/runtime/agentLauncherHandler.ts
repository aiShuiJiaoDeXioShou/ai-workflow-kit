import { invoke } from "@tauri-apps/api/core";
import {
  agentLauncherConfigSchema,
  parseAgentLauncherRuntimeState,
  type AgentLauncherRuntimeState,
} from "@ai-workflow-kit/components";

import type {
  RuntimeActionHandler,
  RuntimeActionHandlers,
} from "./actionDispatcher";

export type AgentRunRecord = {
  id: string;
  adapterId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "stopped";
  cwd: string;
  argsJson: unknown;
  startedAt: string;
  endedAt?: string | null;
  exitCode?: number | null;
};

export type StartAgentRunRequest = {
  adapterId: string;
  argsJson: unknown;
  cwd?: string;
};

export type StopAgentRunRequest = {
  runId: string;
};

export type StartAgentRun = (
  request: StartAgentRunRequest,
) => Promise<AgentRunRecord>;

export type StopAgentRun = (
  request: StopAgentRunRequest,
) => Promise<AgentRunRecord>;

export type AgentLauncherDependencies = {
  startAgentRun?: StartAgentRun;
  stopAgentRun?: StopAgentRun;
};

export function createAgentStartHandler(
  dependencies: AgentLauncherDependencies = {},
): RuntimeActionHandler {
  const startAgentRun = dependencies.startAgentRun ?? defaultStartAgentRun;

  return async ({ config }) => {
    const parsedConfig = agentLauncherConfigSchema.parse(config);
    const run = await startAgentRun({
      adapterId: parsedConfig.adapterId,
      argsJson: parsedConfig.args,
      cwd: parsedConfig.cwdMode === "workspace" ? undefined : parsedConfig.cwd,
    });

    return agentRuntimeStateFromRun(run);
  };
}

export function createAgentStopHandler(
  dependencies: AgentLauncherDependencies = {},
): RuntimeActionHandler {
  const stopAgentRun = dependencies.stopAgentRun ?? defaultStopAgentRun;

  return async ({ runtimeState }) => {
    const parsedState = parseAgentLauncherRuntimeState(runtimeState);
    if (!parsedState.runId) {
      return parsedState;
    }

    const run = await stopAgentRun({ runId: parsedState.runId });
    return agentRuntimeStateFromRun(run, parsedState);
  };
}

export function createAgentLauncherActionHandlers(
  dependencies: AgentLauncherDependencies = {},
): RuntimeActionHandlers {
  return {
    "agent.adapter.start": createAgentStartHandler(dependencies),
    "agent.adapter.stop": createAgentStopHandler(dependencies),
  };
}

function agentRuntimeStateFromRun(
  run: AgentRunRecord,
  previousState?: AgentLauncherRuntimeState,
): AgentLauncherRuntimeState {
  return {
    runId: run.id,
    status: run.status,
    startedAt: run.startedAt,
    endedAt: run.endedAt ?? undefined,
    exitCode: run.exitCode ?? undefined,
    recentStdout: previousState?.recentStdout ?? [],
    recentStderr: previousState?.recentStderr ?? [],
  };
}

function defaultStartAgentRun(request: StartAgentRunRequest) {
  return invoke<AgentRunRecord>("start_agent_run", { request });
}

function defaultStopAgentRun(request: StopAgentRunRequest) {
  return invoke<AgentRunRecord>("stop_agent_run", { request });
}
