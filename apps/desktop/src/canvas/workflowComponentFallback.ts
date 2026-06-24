import { hasComponentType } from "@ai-workflow-kit/components";

import type { FlowgramWorkflowNodeData } from "./flowgramComponentNode";
import type { SelectedWorkflowComponent } from "./selectedWorkflowComponent";

type ComponentTypeLookup = (componentType: string) => boolean;

export type WorkflowComponentRenderModel = {
  title: string;
  componentType: string;
  instanceId: string;
  status: FlowgramWorkflowNodeData["status"];
  statusLabel: string;
  isKnownComponent: boolean;
  missingMessage?: string;
};

const defaultHasComponent: ComponentTypeLookup = hasComponentType;
const statusLabels: Record<FlowgramWorkflowNodeData["status"], string> = {
  idle: "空闲",
  running: "运行中",
  success: "成功",
  warning: "警告",
  error: "错误",
};

function normalizeRenderInput(
  data: FlowgramWorkflowNodeData | SelectedWorkflowComponent,
): FlowgramWorkflowNodeData {
  if ("nodeKind" in data) return data;

  return {
    nodeKind: "component",
    title: data.title,
    description: "",
    status: data.status,
    componentType: data.componentType,
    instanceId: data.instanceId,
    size: data.size,
  };
}

export function getWorkflowComponentRenderModel(
  input: FlowgramWorkflowNodeData | SelectedWorkflowComponent,
  hasComponent: ComponentTypeLookup = defaultHasComponent,
): WorkflowComponentRenderModel {
  const data = normalizeRenderInput(input);
  const componentType = data.componentType ?? "unknown.component";
  const instanceId = data.instanceId ?? "unassigned";
  const isKnownComponent = hasComponent(componentType);

  if (isKnownComponent) {
    return {
      title: data.title,
      componentType,
      instanceId,
      status: data.status,
      statusLabel: statusLabels[data.status],
      isKnownComponent: true,
    };
  }

  return {
    title: data.title,
    componentType,
    instanceId,
    status: "warning",
    statusLabel: "缺失",
    isKnownComponent: false,
    missingMessage: "组件注册项缺失",
  };
}
