import { useClientContext, usePlaygroundTools } from "@flowgram.ai/free-layout-editor";
import {
  GitBranch,
  Maximize2,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";

export function FlowgramCanvasTools() {
  const { history } = useClientContext();
  const tools = usePlaygroundTools();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const disposable = history.undoRedoService.onChange(() => {
      setCanUndo(history.canUndo());
      setCanRedo(history.canRedo());
    });

    return () => disposable.dispose();
  }, [history]);

  return (
    <div className="flowgram-canvas-tools" aria-label="画布工具">
      <button type="button" onClick={() => tools.zoomout()} aria-label="缩小">
        <ZoomOut size={15} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => tools.zoomin()} aria-label="放大">
        <ZoomIn size={15} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => tools.fitView()} aria-label="适配视图">
        <Maximize2 size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => {
          void tools.autoLayout();
        }}
        aria-label="自动布局"
      >
        <GitBranch size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => history.undo()}
        disabled={!canUndo}
        aria-label="撤销"
      >
        <Undo2 size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => history.redo()}
        disabled={!canRedo}
        aria-label="重做"
      >
        <Redo2 size={15} aria-hidden="true" />
      </button>
      <span>{Math.floor(tools.zoom * 100)}%</span>
    </div>
  );
}
