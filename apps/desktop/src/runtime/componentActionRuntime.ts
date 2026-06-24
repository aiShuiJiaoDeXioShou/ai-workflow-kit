import {
  getComponentManifest,
  parseAgentLauncherRuntimeState,
  parseHttpHealthRuntimeState,
  parseQuotaRuntimeState,
} from "@ai-workflow-kit/components";

import { upsertComponentRuntimeState } from "../persistence/runtimeState";
import { createRuntimeActionDispatcher } from "./actionDispatcher";
import { createAgentLauncherActionHandlers } from "./agentLauncherHandler";
import { createHttpHealthActionHandlers } from "./httpHealthHandler";
import { createQuotaActionHandlers } from "./quotaHandler";
import type { ComponentActionSource, RunLogAction } from "./runLogState";

export type ComponentRuntimeStateMap = Record<string, unknown>;

export type InvokeComponentActionRequest = {
  instanceId: string;
  componentType: string;
  config: unknown;
  actionId: string;
  source?: ComponentActionSource;
  runtimeState?: unknown;
  input?: unknown;
};

export type InvokeComponentAction = (
  request: InvokeComponentActionRequest,
) => Promise<void>;

export type GetComponentRuntimeState = (instanceId: string) => unknown;

export type RuntimeStateSetter = (
  updater: (
    previousStates: ComponentRuntimeStateMap,
  ) => ComponentRuntimeStateMap,
) => void;

export type RunLogDispatch = (action: RunLogAction) => void;

const runtimeActionDispatcher = createRuntimeActionDispatcher({
  ...createHttpHealthActionHandlers(),
  ...createQuotaActionHandlers(),
  ...createAgentLauncherActionHandlers(),
});

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function createPendingRuntimeState(
  componentType: string,
  previousState: unknown,
): unknown {
  if (componentType === "core.monitor.http-health") {
    const parsedState = parseHttpHealthRuntimeState(previousState);

    return {
      ...parsedState,
      status: "checking",
      lastError: undefined,
    };
  }

  return previousState;
}

function createFailedRuntimeState(
  componentType: string,
  previousState: unknown,
  error: unknown,
): unknown {
  if (componentType === "core.monitor.http-health") {
    const parsedState = parseHttpHealthRuntimeState(previousState);
    const checkedAt = new Date().toISOString();
    const message =
      error instanceof Error ? error.message : "组件动作执行失败";

    return {
      ...parsedState,
      status: "error",
      lastCheckedAt: checkedAt,
      lastError: message,
      history: [
        ...parsedState.history,
        {
          status: "error",
          checkedAt,
          error: message,
        },
      ].slice(-6),
    };
  }

  return previousState;
}

function persistRuntimeState(instanceId: string, state: unknown) {
  if (!isTauriRuntime()) return;

  void upsertComponentRuntimeState({
    componentInstanceId: instanceId,
    stateJson: state,
  }).catch(() => {
    // 运行态持久化失败不能吞掉前端即时反馈；下一轮持久化或刷新时再恢复。
  });
}

export async function invokeComponentActionWithRuntime({
  dispatchRunLog,
  request,
  setRuntimeStates,
}: {
  dispatchRunLog?: RunLogDispatch;
  request: InvokeComponentActionRequest;
  setRuntimeStates: RuntimeStateSetter;
}): Promise<void> {
  const manifest = getComponentManifest(request.componentType);
  if (!manifest) {
    return;
  }

  const previousState = request.runtimeState;
  const source = request.source ?? "manual";
  const runId = createComponentActionRunId(request);
  const startedAt = new Date().toISOString();
  const pendingState = createPendingRuntimeState(
    request.componentType,
    previousState,
  );

  dispatchRunLog?.({
    type: "component_action_started",
    payload: {
      actionId: request.actionId,
      componentType: request.componentType,
      instanceId: request.instanceId,
      line: formatComponentActionStartedLine(request),
      runId,
      source,
      timestamp: startedAt,
    },
  });

  if (pendingState !== previousState) {
    setRuntimeStates((states) => ({
      ...states,
      [request.instanceId]: pendingState,
    }));
  }

  try {
    const nextState = await runtimeActionDispatcher.dispatch({
      manifest,
      instanceId: request.instanceId,
      actionId: request.actionId,
      config: request.config,
      runtimeState: pendingState,
      input: request.input,
    });

    setRuntimeStates((states) => ({
      ...states,
      [request.instanceId]: nextState,
    }));
    persistRuntimeState(request.instanceId, nextState);
    dispatchRunLog?.({
      type: isRuntimeOutcomeFailed(request.componentType, nextState)
        ? "component_action_failed"
        : "component_action_succeeded",
      payload: {
        line: formatComponentActionFinishedLine(request, nextState),
        runId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const failedState = createFailedRuntimeState(
      request.componentType,
      pendingState,
      error,
    );

    setRuntimeStates((states) => ({
      ...states,
      [request.instanceId]: failedState,
    }));
    persistRuntimeState(request.instanceId, failedState);
    dispatchRunLog?.({
      type: "component_action_failed",
      payload: {
        line: formatComponentActionErrorLine(request, error),
        runId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

function createComponentActionRunId(request: InvokeComponentActionRequest) {
  return [
    "component",
    request.instanceId,
    request.actionId,
    Date.now(),
    Math.round(Math.random() * 1_000_000),
  ].join(":");
}

function formatComponentActionStartedLine(
  request: InvokeComponentActionRequest,
): string {
  if (request.componentType === "core.monitor.http-health") {
    const url = readConfigString(request.config, "url") ?? "unknown URL";
    return `开始 HTTP 检测：${url}`;
  }

  if (request.componentType === "core.quota.tracker") {
    return "开始刷新额度";
  }

  if (request.componentType === "core.agent.launcher") {
    const adapterId =
      readConfigString(request.config, "adapterId") ?? "unknown adapter";
    return request.actionId === "stopRun"
      ? `停止 Agent：${adapterId}`
      : `启动 Agent：${adapterId}`;
  }

  return `执行组件动作：${request.actionId}`;
}

function formatComponentActionFinishedLine(
  request: InvokeComponentActionRequest,
  runtimeState: unknown,
): string {
  if (request.componentType === "core.monitor.http-health") {
    const state = parseHttpHealthRuntimeState(runtimeState);
    const latestResult = state.history.at(-1);
    const statusCode = latestResult?.statusCode ?? "--";
    const latency = typeof state.latencyMs === "number"
      ? `，${Math.round(state.latencyMs)} ms`
      : "";

    if (state.status === "up") {
      return `HTTP 检测正常：${statusCode}${latency}`;
    }

    return `HTTP 检测异常：${state.lastError ?? state.status}`;
  }

  if (request.componentType === "core.quota.tracker") {
    const state = parseQuotaRuntimeState(runtimeState);
    if (state.lastError) return `额度刷新失败：${state.lastError}`;
    return `额度刷新完成：${state.percentUsed ?? "--"}%`;
  }

  if (request.componentType === "core.agent.launcher") {
    const state = parseAgentLauncherRuntimeState(runtimeState);
    return `Agent 状态：${state.status}${state.runId ? ` (${state.runId})` : ""}`;
  }

  return `组件动作完成：${request.actionId}`;
}

function formatComponentActionErrorLine(
  request: InvokeComponentActionRequest,
  error: unknown,
): string {
  const message = error instanceof Error ? error.message : "组件动作执行失败";
  return `${formatComponentActionStartedLine(request)}失败：${message}`;
}

function isRuntimeOutcomeFailed(componentType: string, runtimeState: unknown) {
  if (componentType === "core.monitor.http-health") {
    const state = parseHttpHealthRuntimeState(runtimeState);
    return state.status === "down" || state.status === "error";
  }

  if (componentType === "core.quota.tracker") {
    return Boolean(parseQuotaRuntimeState(runtimeState).lastError);
  }

  if (componentType === "core.agent.launcher") {
    return parseAgentLauncherRuntimeState(runtimeState).status === "failed";
  }

  return false;
}

function readConfigString(config: unknown, key: string): string | undefined {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return undefined;
  }

  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
