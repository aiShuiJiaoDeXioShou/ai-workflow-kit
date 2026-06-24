import type { WorkflowActionDefinition, WorkflowActionKind } from "./index";

export const workflowActionKinds = [
  "monitor.http.check",
  "quota.file.refresh",
  "agent.adapter.start",
  "agent.adapter.stop",
] as const satisfies readonly WorkflowActionKind[];

export type WorkflowActionKindMetadata = {
  kind: WorkflowActionKind;
  title: string;
  description: string;
  requiresRuntime: boolean;
};

export const workflowActionKindMetadata: Record<
  WorkflowActionKind,
  WorkflowActionKindMetadata
> = {
  "monitor.http.check": {
    kind: "monitor.http.check",
    title: "HTTP 健康检查",
    description: "由 runtime 执行一次 HTTP 健康检查。",
    requiresRuntime: true,
  },
  "quota.file.refresh": {
    kind: "quota.file.refresh",
    title: "额度文件刷新",
    description: "由 runtime 从受控本地文件刷新额度数据。",
    requiresRuntime: true,
  },
  "agent.adapter.start": {
    kind: "agent.adapter.start",
    title: "启动 Agent adapter",
    description: "由 runtime 启动 allowlist 中的 Agent adapter。",
    requiresRuntime: true,
  },
  "agent.adapter.stop": {
    kind: "agent.adapter.stop",
    title: "停止 Agent adapter",
    description: "由 runtime 停止正在运行的 Agent adapter。",
    requiresRuntime: true,
  },
};

export function isWorkflowActionKind(value: string): value is WorkflowActionKind {
  return workflowActionKinds.includes(value as WorkflowActionKind);
}

export function getWorkflowActionKindMetadata(
  kind: WorkflowActionKind,
): WorkflowActionKindMetadata {
  return workflowActionKindMetadata[kind];
}

export function defineWorkflowAction<
  TAction extends WorkflowActionDefinition,
>(action: TAction): TAction {
  return action;
}
