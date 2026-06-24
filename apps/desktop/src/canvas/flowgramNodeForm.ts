import type { WorkflowNodeEntity } from "@flowgram.ai/free-layout-editor";
import { getNodeForm } from "@flowgram.ai/node";

import {
  parseFlowgramWorkflowNodeData,
  type FlowgramWorkflowNodeData,
} from "./flowgramComponentNode";

export function readFlowgramWorkflowNodeData(
  node: WorkflowNodeEntity,
): FlowgramWorkflowNodeData | undefined {
  const form = getNodeForm<FlowgramWorkflowNodeData>(node);

  return parseFlowgramWorkflowNodeData(form?.values ?? node.getExtInfo());
}

export function updateFlowgramWorkflowNodeData(
  node: WorkflowNodeEntity,
  nextData: FlowgramWorkflowNodeData,
) {
  const form = getNodeForm<FlowgramWorkflowNodeData>(node);

  if (form) {
    form.updateFormValues(nextData);
    return;
  }

  node.updateExtInfo(nextData, true);
}
