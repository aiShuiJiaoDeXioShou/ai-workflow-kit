import type {
  FreeLayoutProps,
  WorkflowJSON,
  WorkflowNodeRegistry,
} from "@flowgram.ai/free-layout-editor";
import { createFreeSnapPlugin } from "@flowgram.ai/free-snap-plugin";
import { createMinimapPlugin } from "@flowgram.ai/minimap-plugin";
import { useMemo } from "react";

import type {
  GetComponentRuntimeState,
  InvokeComponentAction,
} from "../runtime/componentActionRuntime";
import type { SelectedWorkflowComponent } from "./selectedWorkflowComponent";
import { FlowgramWorkflowNode } from "./FlowgramWorkflowNode";
import { initialFlowgramData } from "./flowgramInitialData";
import {
  flowgramNodeRegistries,
  getFlowgramNodeDefaultRegistry,
} from "./flowgramNodeRegistries";

type UseFlowgramEditorPropsOptions = {
  getComponentRuntimeState?: GetComponentRuntimeState;
  initialData?: WorkflowJSON;
  onCanvasDocumentChange?: (documentJson: WorkflowJSON) => void;
  onCanvasLoaded?: (documentJson: WorkflowJSON) => void;
  onInvokeComponentAction?: InvokeComponentAction;
  onSelectedComponentChange?: (
    selectedComponent: SelectedWorkflowComponent | undefined,
  ) => void;
};

export function useFlowgramEditorProps({
  getComponentRuntimeState,
  initialData,
  onCanvasDocumentChange,
  onCanvasLoaded,
  onInvokeComponentAction,
  onSelectedComponentChange,
}: UseFlowgramEditorPropsOptions): FreeLayoutProps {
  return useMemo<FreeLayoutProps>(
    () => ({
      background: true,
      readonly: false,
      initialData: initialData ?? initialFlowgramData,
      nodeRegistries: flowgramNodeRegistries,
      getNodeDefaultRegistry: (type): WorkflowNodeRegistry =>
        getFlowgramNodeDefaultRegistry(String(type)),
      materials: {
        renderDefaultNode: ({ node }) => (
          <FlowgramWorkflowNode
            getComponentRuntimeState={getComponentRuntimeState}
            node={node}
            onInvokeComponentAction={onInvokeComponentAction}
            onSelectedComponentChange={onSelectedComponentChange}
          />
        ),
      },
      nodeEngine: {
        enable: true,
      },
      history: {
        enable: true,
        enableChangeNode: true,
      },
      onContentChange(ctx) {
        onCanvasDocumentChange?.(ctx.document.toJSON());
      },
      lineColor: {
        hidden: "transparent",
        default: "#8d8d86",
        drawing: "#111111",
        hovered: "#111111",
        selected: "#111111",
        error: "#dc2626",
        flowing: "#111111",
      },
      onAllLayersRendered(ctx) {
        if (ctx.document.getAllNodes().length > 0) {
          ctx.document.fitView(false);
        }
      },
      onLoad(ctx) {
        onCanvasLoaded?.(ctx.document.toJSON());
      },
      plugins: () => [
        createMinimapPlugin({
          disableLayer: true,
          canvasStyle: {
            canvasWidth: 182,
            canvasHeight: 102,
            canvasPadding: 50,
            canvasBackground: "#f7f7f5",
            canvasBorderRadius: 8,
            viewportBackground: "#d8d8d2",
            viewportBorderRadius: 4,
            viewportBorderColor: "#111111",
            viewportBorderWidth: 1,
            viewportBorderDashLength: 2,
            nodeColor: "#ffffff",
            nodeBorderRadius: 2,
            nodeBorderWidth: 0.145,
            nodeBorderColor: "rgba(17, 17, 17, 0.16)",
            overlayColor: "rgba(255, 255, 255, 0)",
          },
        }),
        createFreeSnapPlugin({
          edgeColor: "#111111",
          alignColor: "#111111",
          edgeLineWidth: 1,
          alignLineWidth: 1,
          alignCrossWidth: 8,
        }),
      ],
    }),
    [
      getComponentRuntimeState,
      initialData,
      onCanvasDocumentChange,
      onCanvasLoaded,
      onInvokeComponentAction,
      onSelectedComponentChange,
    ],
  );
}
