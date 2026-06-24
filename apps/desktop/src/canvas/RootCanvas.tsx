import { getComponentManifest } from "@ai-workflow-kit/components";
import {
  EditorRenderer,
  useService,
  WorkflowDragService,
} from "@flowgram.ai/free-layout-editor";
import { useCallback, useEffect, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";

import { rootCanvasId } from "../persistence/canvasSnapshots";
import { createComponentInstance } from "../persistence/componentInstances";
import {
  clearCurrentWorkflowComponentDragPayload,
  hasWorkflowComponentDragPayload,
  readCurrentWorkflowComponentDragPayload,
  readWorkflowComponentDragPayload,
  workflowComponentDropRequestEvent,
  type WorkflowComponentDragPayload,
  type WorkflowComponentDropRequestDetail,
} from "../palette/componentDragPayload";
import { FlowgramCanvasTools } from "./FlowgramCanvasTools";
import { FlowgramMinimap } from "./FlowgramMinimap";
import {
  FLOWGRAM_WORKFLOW_COMPONENT_NODE_TYPE,
  createFlowgramComponentNodeData,
  toSelectedWorkflowComponent,
} from "./flowgramComponentNode";
import type {
  GetComponentRuntimeState,
  InvokeComponentAction,
} from "../runtime/componentActionRuntime";
import type { SelectedWorkflowComponent } from "./selectedWorkflowComponent";

type DropClientPosition = {
  clientX: number;
  clientY: number;
};

type RootCanvasProps = {
  getComponentRuntimeState?: GetComponentRuntimeState;
  onInvokeComponentAction?: InvokeComponentAction;
  onSelectedComponentChange?: (
    selectedComponent: SelectedWorkflowComponent | undefined,
  ) => void;
};

export function RootCanvas({ onSelectedComponentChange }: RootCanvasProps) {
  const dragService = useService<WorkflowDragService>(WorkflowDragService);
  const [dropError, setDropError] = useState<string | undefined>();

  const dropComponentAtClientPosition = useCallback(
    async (
      payload: WorkflowComponentDragPayload | undefined,
      position: DropClientPosition,
    ) => {
      if (!payload) return;

      setDropError(undefined);

      try {
        const manifest = getComponentManifest(payload.componentType);
        if (!manifest) {
          setDropError("未知组件类型");
          return;
        }

        const config = manifest.configSchema.parse(manifest.defaultConfig);
        const instance = await createComponentInstance({
          canvasId: rootCanvasId,
          componentType: manifest.type,
          configJson: config,
        });
        const data = createFlowgramComponentNodeData({
          configJson: config,
          instanceId: instance.id,
          manifest,
        });
        const node = await dragService.dropCard(
          FLOWGRAM_WORKFLOW_COMPONENT_NODE_TYPE,
          position as MouseEvent,
          { data },
        );

        if (!node) {
          setDropError("拖拽创建失败");
          return;
        }

        onSelectedComponentChange?.(
          toSelectedWorkflowComponent(node.id, data),
        );
      } catch (error) {
        setDropError(error instanceof Error ? error.message : "拖拽创建失败");
      } finally {
        clearCurrentWorkflowComponentDragPayload();
      }
    },
    [dragService, onSelectedComponentChange],
  );

  useEffect(() => {
    const handleDropRequest = (event: Event) => {
      const detail = (event as CustomEvent<WorkflowComponentDropRequestDetail>)
        .detail;
      if (!detail?.payload) return;

      void dropComponentAtClientPosition(detail.payload, {
        clientX: detail.clientX,
        clientY: detail.clientY,
      });
    };

    window.addEventListener(
      workflowComponentDropRequestEvent,
      handleDropRequest,
    );

    return () => {
      window.removeEventListener(
        workflowComponentDropRequestEvent,
        handleDropRequest,
      );
    };
  }, [dropComponentAtClientPosition]);

  const handleDragOver = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (!hasWorkflowComponentDragPayload(event.dataTransfer)) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    async (event: ReactDragEvent<HTMLElement>) => {
      const payload =
        readWorkflowComponentDragPayload(event.dataTransfer) ??
        readCurrentWorkflowComponentDragPayload();
      if (!payload) return;

      event.preventDefault();
      event.stopPropagation();
      await dropComponentAtClientPosition(payload, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    [dropComponentAtClientPosition],
  );

  return (
    <div
      className="root-flowgram-canvas"
      onDragEnterCapture={handleDragOver}
      onDragOverCapture={handleDragOver}
      onDropCapture={(event) => {
        void handleDrop(event);
      }}
    >
      <EditorRenderer
        aria-label="AI Workflow Kit FlowGram 画布"
        className="root-flowgram-canvas__editor"
      />
      <FlowgramCanvasTools />
      <FlowgramMinimap />
      {dropError ? (
        <div className="root-canvas-drop-error" role="status">
          {dropError}
        </div>
      ) : null}
    </div>
  );
}
