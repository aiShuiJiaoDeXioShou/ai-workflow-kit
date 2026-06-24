export type SelectedWorkflowComponent = {
  nodeId: string;
  instanceId: string;
  componentType: string;
  configJson?: unknown;
  title: string;
  status: "idle" | "running" | "success" | "warning" | "error";
  size: {
    w: number;
    h: number;
  };
};

export function getSelectedWorkflowComponentKey(
  selectedComponent: SelectedWorkflowComponent | undefined,
): string {
  if (!selectedComponent) return "none";

  return [
    selectedComponent.nodeId,
    selectedComponent.instanceId,
    selectedComponent.componentType,
    selectedComponent.status,
    selectedComponent.size.w,
    selectedComponent.size.h,
    JSON.stringify(selectedComponent.configJson ?? null),
  ].join(":");
}
