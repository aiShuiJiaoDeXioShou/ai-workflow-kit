import type { WorkflowComponentManifest } from "@ai-workflow-kit/component-sdk";

export const workflowComponentDragMime =
  "application/x-ai-workflow-kit-component";

export type WorkflowComponentDragPayload = {
  kind: "workflow-component";
  componentType: string;
  defaultSize: {
    w: number;
    h: number;
  };
};

export const workflowComponentDropRequestEvent =
  "ai-workflow-kit:workflow-component-drop-request";

export type WorkflowComponentDropRequestDetail = {
  payload: WorkflowComponentDragPayload;
  clientX: number;
  clientY: number;
};

let currentWorkflowComponentDragPayload:
  | WorkflowComponentDragPayload
  | undefined;

export function createWorkflowComponentDragPayload(
  manifest: WorkflowComponentManifest,
): WorkflowComponentDragPayload {
  return {
    kind: "workflow-component",
    componentType: manifest.type,
    defaultSize: manifest.defaultSize,
  };
}

export function setCurrentWorkflowComponentDragPayload(
  payload: WorkflowComponentDragPayload,
) {
  currentWorkflowComponentDragPayload = payload;
}

export function clearCurrentWorkflowComponentDragPayload() {
  currentWorkflowComponentDragPayload = undefined;
}

export function readWorkflowComponentDragPayload(
  dataTransfer: DataTransfer,
): WorkflowComponentDragPayload | undefined {
  const rawPayload = dataTransfer.getData(workflowComponentDragMime);
  if (!rawPayload) return undefined;

  try {
    const payload = JSON.parse(rawPayload) as WorkflowComponentDragPayload;

    if (
      payload.kind !== "workflow-component" ||
      !payload.componentType ||
      !Number.isFinite(payload.defaultSize?.w) ||
      !Number.isFinite(payload.defaultSize?.h)
    ) {
      return undefined;
    }

    return payload;
  } catch {
    return undefined;
  }
}

export function hasWorkflowComponentDragPayload(
  dataTransfer: DataTransfer,
): boolean {
  return (
    Boolean(currentWorkflowComponentDragPayload) ||
    Array.from(dataTransfer.types).includes(workflowComponentDragMime)
  );
}

export function readCurrentWorkflowComponentDragPayload():
  | WorkflowComponentDragPayload
  | undefined {
  return currentWorkflowComponentDragPayload;
}

export function dispatchWorkflowComponentDropRequest(
  detail: WorkflowComponentDropRequestDetail,
) {
  window.dispatchEvent(
    new CustomEvent(workflowComponentDropRequestEvent, { detail }),
  );
}
