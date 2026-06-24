import {
  getComponentByType,
  getComponentManifest,
} from "@ai-workflow-kit/components";
import {
  useNodeRender,
  WorkflowNodeRenderer,
  type WorkflowNodeProps,
} from "@flowgram.ai/free-layout-editor";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import type {
  GetComponentRuntimeState,
  InvokeComponentAction,
} from "../runtime/componentActionRuntime";
import { useComponentRuntime } from "../runtime/componentRuntimeContext";
import type { SelectedWorkflowComponent } from "./selectedWorkflowComponent";
import {
  parseFlowgramWorkflowNodeData,
  toSelectedWorkflowComponent,
} from "./flowgramComponentNode";
import { getWorkflowComponentRenderModel } from "./workflowComponentFallback";

type FlowgramWorkflowNodeProps = {
  getComponentRuntimeState?: GetComponentRuntimeState;
  node: WorkflowNodeProps["node"];
  onInvokeComponentAction?: InvokeComponentAction;
  onSelectedComponentChange?: (
    selectedComponent: SelectedWorkflowComponent | undefined,
  ) => void;
};

export function FlowgramWorkflowNode({
  getComponentRuntimeState,
  node,
  onInvokeComponentAction,
  onSelectedComponentChange,
}: FlowgramWorkflowNodeProps) {
  const runtimeContext = useComponentRuntime();
  const renderState = useNodeRender(node);
  const nodeData = parseFlowgramWorkflowNodeData(renderState.form?.values);
  const renderModel = nodeData?.nodeKind === "component"
    ? getWorkflowComponentRenderModel(nodeData)
    : undefined;
  const selectedComponent = nodeData
    ? toSelectedWorkflowComponent(node.id, nodeData)
    : undefined;
  const componentModule = nodeData?.componentType
    ? getComponentByType(nodeData.componentType)
    : undefined;
  const manifest = nodeData?.componentType
    ? getComponentManifest(nodeData.componentType)
    : undefined;
  const configResult =
    manifest && nodeData
      ? manifest.configSchema.safeParse(
          nodeData.configJson ?? manifest.defaultConfig,
        )
      : undefined;
  const instanceId = nodeData?.instanceId ?? "unassigned";
  const runtimeState =
    runtimeContext.getComponentRuntimeState(instanceId) ??
    getComponentRuntimeState?.(instanceId);
  const invokeComponentAction =
    runtimeContext.invokeComponentAction ?? onInvokeComponentAction;

  useEffect(() => {
    if (!renderState.selected) return;
    onSelectedComponentChange?.(selectedComponent);
  }, [onSelectedComponentChange, renderState.selected, selectedComponent]);

  return (
    <div
      onPointerDownCapture={() => {
        onSelectedComponentChange?.(selectedComponent);
      }}
    >
      <WorkflowNodeRenderer
        className="flowgram-workflow-node"
        node={node}
        portPrimaryColor="#111111"
        portSecondaryColor="#8d8d86"
        portBackgroundColor="#ffffff"
        portErrorColor="#dc2626"
      >
        {renderState.form?.render()}

        {nodeData?.nodeKind === "component" && componentModule ? (
          <div className="flowgram-workflow-node__component-preview">
            <componentModule.CanvasView
              componentType={nodeData.componentType ?? "unknown.component"}
              config={
                configResult?.success
                  ? configResult.data
                  : manifest?.defaultConfig
              }
              instanceId={nodeData.instanceId ?? "unassigned"}
              invokeAction={async (actionId, input) => {
                if (!manifest) return;

                await invokeComponentAction({
                  actionId,
                  componentType: nodeData.componentType ?? "unknown.component",
                  config:
                    configResult?.success
                      ? configResult.data
                      : manifest.defaultConfig,
                  input,
                  instanceId,
                  runtimeState,
                });
              }}
              runtimeState={runtimeState}
              size={nodeData.size ?? manifest?.defaultSize ?? { w: 320, h: 180 }}
              status={nodeData.status}
            />
          </div>
        ) : null}

        {renderModel && !renderModel.isKnownComponent ? (
          <div className="flowgram-workflow-node__missing" role="status">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>{renderModel.missingMessage}</span>
          </div>
        ) : null}
      </WorkflowNodeRenderer>
    </div>
  );
}
