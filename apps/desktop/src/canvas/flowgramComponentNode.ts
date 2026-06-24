import type {
  WorkflowComponentManifest,
  WorkflowRuntimeStatus,
  WorkflowSize,
} from "@ai-workflow-kit/component-sdk";

import type { SelectedWorkflowComponent } from "./selectedWorkflowComponent";

export const FLOWGRAM_WORKFLOW_COMPONENT_NODE_TYPE = "workflowComponent";
export const FLOWGRAM_WORKFLOW_START_NODE_TYPE = "workflowStart";
export const FLOWGRAM_WORKFLOW_END_NODE_TYPE = "workflowEnd";

export type FlowgramWorkflowNodeKind = "component" | "start" | "end";

export type FlowgramWorkflowNodeData = {
  nodeKind: FlowgramWorkflowNodeKind;
  title: string;
  description: string;
  status: WorkflowRuntimeStatus;
  category?: string;
  componentType?: string;
  instanceId?: string;
  configJson?: unknown;
  size?: WorkflowSize;
};

export function parseFlowgramWorkflowNodeData(
  value: unknown,
): FlowgramWorkflowNodeData | undefined {
  if (!value || typeof value !== "object") return undefined;

  const data = value as Partial<FlowgramWorkflowNodeData>;
  if (!data.nodeKind || !data.title || !data.status) return undefined;

  return data as FlowgramWorkflowNodeData;
}

export function createFlowgramComponentNodeData({
  configJson,
  instanceId,
  manifest,
}: {
  configJson?: unknown;
  instanceId: string;
  manifest: WorkflowComponentManifest;
}): FlowgramWorkflowNodeData {
  return {
    nodeKind: "component",
    instanceId,
    componentType: manifest.type,
    title: manifest.title,
    description: manifest.description,
    category: manifest.category,
    status: "idle",
    configJson: configJson ?? manifest.defaultConfig,
    size: manifest.defaultSize,
  };
}

export function createFlowgramSystemNodeData(
  kind: Extract<FlowgramWorkflowNodeKind, "start" | "end">,
): FlowgramWorkflowNodeData {
  return {
    nodeKind: kind,
    title: kind === "start" ? "开始" : "结束",
    description:
      kind === "start"
        ? "工作流入口"
        : "工作流完成点",
    status: "idle",
    category: "system",
    size: { w: 240, h: 120 },
  };
}

export function toSelectedWorkflowComponent(
  nodeId: string,
  data: FlowgramWorkflowNodeData,
): SelectedWorkflowComponent | undefined {
  if (
    data.nodeKind !== "component" ||
    !data.componentType ||
    !data.instanceId
  ) {
    return undefined;
  }

  return {
    nodeId,
    instanceId: data.instanceId,
    componentType: data.componentType,
    configJson: data.configJson,
    title: data.title,
    status: data.status,
    size: data.size ?? { w: 320, h: 180 },
  };
}
