import { FreeLayoutEditorProvider } from "@flowgram.ai/free-layout-editor";
import type { WorkflowJSON } from "@flowgram.ai/free-layout-editor";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@flowgram.ai/free-layout-editor/index.css";

import { initialFlowgramData } from "../canvas/flowgramInitialData";
import { RootCanvas } from "../canvas/RootCanvas";
import type { SelectedWorkflowComponent } from "../canvas/selectedWorkflowComponent";
import { useFlowgramEditorProps } from "../canvas/useFlowgramEditorProps";
import { InspectorPanel } from "../inspector/InspectorPanel";
import { ComponentPalette } from "../palette/ComponentPalette";
import {
  loadDefaultCanvas,
  loadLatestCanvasSnapshot,
  parseWorkflowDocumentJson,
  rootCanvasId,
  saveCanvasSnapshot,
} from "../persistence/canvasSnapshots";
import {
  invokeComponentActionWithRuntime,
  type ComponentRuntimeStateMap,
  type InvokeComponentAction,
} from "../runtime/componentActionRuntime";
import { ComponentRuntimeProvider } from "../runtime/componentRuntimeContext";
import { RunLogDrawer } from "../runtime/RunLogDrawer";
import { useRunLogEvents } from "../runtime/useRunLogEvents";
import { WorkflowRuntimeCoordinator } from "../runtime/WorkflowRuntimeCoordinator";
import "../styles/workbench.css";

const canvasAutosaveDelayMs = 250;

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function formatUnknownError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function RootWorkbench() {
  const [selectedComponent, setSelectedComponent] = useState<
    SelectedWorkflowComponent | undefined
  >();
  const [initialCanvasDocument, setInitialCanvasDocument] =
    useState<WorkflowJSON>(initialFlowgramData);
  const [isCanvasRestored, setIsCanvasRestored] = useState(false);
  const [canvasPersistenceError, setCanvasPersistenceError] = useState<
    string | undefined
  >();
  const [isPaletteMinimized, setIsPaletteMinimized] = useState(false);
  const [isInspectorMinimized, setIsInspectorMinimized] = useState(false);
  const [isRunLogMinimized, setIsRunLogMinimized] = useState(false);
  const [componentRuntimeStates, setComponentRuntimeStates] =
    useState<ComponentRuntimeStateMap>({});
  const saveTimerRef = useRef<number | undefined>(undefined);
  const latestDocumentRef = useRef<WorkflowJSON>(initialFlowgramData);
  const latestSavedDocumentKeyRef = useRef(JSON.stringify(initialFlowgramData));
  const runLog = useRunLogEvents();

  useEffect(() => {
    let cancelled = false;

    async function restoreCanvas() {
      try {
        await loadDefaultCanvas();
        const snapshot = await loadLatestCanvasSnapshot({
          canvasId: rootCanvasId,
        });
        const documentJson = parseWorkflowDocumentJson(
          snapshot?.documentJson,
        );

        if (cancelled) return;

        latestDocumentRef.current = documentJson;
        latestSavedDocumentKeyRef.current = JSON.stringify(documentJson);
        setInitialCanvasDocument(documentJson);
        setCanvasPersistenceError(undefined);
      } catch (error) {
        if (cancelled) return;

        setInitialCanvasDocument(initialFlowgramData);
        setCanvasPersistenceError(
          formatUnknownError(error, "画布恢复失败"),
        );
      } finally {
        if (!cancelled) setIsCanvasRestored(true);
      }
    }

    void restoreCanvas();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistCanvasDocument = useCallback(async (documentJson: WorkflowJSON) => {
    const documentKey = JSON.stringify(documentJson);
    if (documentKey === latestSavedDocumentKeyRef.current) return;

    await saveCanvasSnapshot({
      canvasId: rootCanvasId,
      documentJson,
      sessionJson: {},
    });
    latestSavedDocumentKeyRef.current = documentKey;
    setCanvasPersistenceError(undefined);
  }, []);

  const flushCanvasAutosave = useCallback(async () => {
    if (saveTimerRef.current !== undefined) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }

    await persistCanvasDocument(latestDocumentRef.current);
  }, [persistCanvasDocument]);

  const scheduleCanvasAutosave = useCallback(
    (documentJson: WorkflowJSON) => {
      latestDocumentRef.current = documentJson;

      if (saveTimerRef.current !== undefined) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = undefined;
        void persistCanvasDocument(documentJson).catch((error) => {
          setCanvasPersistenceError(formatUnknownError(error, "画布保存失败"));
        });
      }, canvasAutosaveDelayMs);
    },
    [persistCanvasDocument],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current !== undefined) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const handlePageHide = () => {
      void flushCanvasAutosave().catch((error) => {
        setCanvasPersistenceError(formatUnknownError(error, "画布保存失败"));
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      handlePageHide();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushCanvasAutosave]);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        event.preventDefault();

        try {
          await flushCanvasAutosave();
        } catch (error) {
          setCanvasPersistenceError(
            formatUnknownError(error, "画布保存失败"),
          );
          return;
        }

        try {
          if (!disposed) await getCurrentWindow().destroy();
        } catch (error) {
          setCanvasPersistenceError(
            formatUnknownError(error, "窗口关闭失败"),
          );
        }
      })
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten();
          return;
        }

        unlisten = nextUnlisten;
      })
      .catch((error: unknown) => {
        setCanvasPersistenceError(
          formatUnknownError(error, "关闭保存监听注册失败"),
        );
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [flushCanvasAutosave]);

  const getComponentRuntimeState = useCallback(
    (instanceId: string) => componentRuntimeStates[instanceId],
    [componentRuntimeStates],
  );
  const invokeComponentAction = useCallback<InvokeComponentAction>(
    async (request) => {
      await invokeComponentActionWithRuntime({
        dispatchRunLog: runLog.dispatch,
        request: {
          ...request,
          runtimeState:
            request.runtimeState ?? componentRuntimeStates[request.instanceId],
        },
        setRuntimeStates: setComponentRuntimeStates,
      });
    },
    [componentRuntimeStates, runLog.dispatch],
  );
  const componentRuntimeContextValue = useMemo(
    () => ({
      getComponentRuntimeState,
      invokeComponentAction,
    }),
    [getComponentRuntimeState, invokeComponentAction],
  );
  const flowgramEditorProps = useFlowgramEditorProps({
    getComponentRuntimeState,
    initialData: initialCanvasDocument,
    onCanvasDocumentChange: scheduleCanvasAutosave,
    onCanvasLoaded: (documentJson) => {
      latestDocumentRef.current = documentJson;
      latestSavedDocumentKeyRef.current = JSON.stringify(documentJson);
    },
    onInvokeComponentAction: invokeComponentAction,
    onSelectedComponentChange: setSelectedComponent,
  });

  if (!isCanvasRestored) {
    return (
      <main className="workbench-shell workbench-shell--loading">
        <div className="workbench-loading" role="status">
          正在恢复画布...
        </div>
      </main>
    );
  }

  return (
    <ComponentRuntimeProvider value={componentRuntimeContextValue}>
      <FreeLayoutEditorProvider
        key={JSON.stringify(initialCanvasDocument)}
        {...flowgramEditorProps}
      >
        <main
          className="workbench-shell"
          aria-label="AI Workflow Kit 工作台"
          data-inspector-minimized={isInspectorMinimized}
          data-log-minimized={isRunLogMinimized}
          data-palette-minimized={isPaletteMinimized}
        >
        <WorkflowRuntimeCoordinator
          getComponentRuntimeState={getComponentRuntimeState}
          invokeComponentAction={invokeComponentAction}
        />
        <section className="workbench-rail" aria-label="组件面板">
          {isPaletteMinimized ? (
            <button
              type="button"
              className="workbench-panel-toggle workbench-panel-toggle--vertical"
              onClick={() => setIsPaletteMinimized(false)}
              aria-label="展开组件面板"
              title="展开组件面板"
            >
              <ChevronsRight size={16} aria-hidden="true" />
              <span>组件</span>
            </button>
          ) : (
            <>
              <div className="workbench-rail__header">
                <div>
                  <span className="workbench-kicker">组件</span>
                  <h1>AI Workflow Kit</h1>
                </div>
                <button
                  type="button"
                  className="workbench-panel-button"
                  onClick={() => setIsPaletteMinimized(true)}
                  aria-label="最小化组件面板"
                  title="最小化组件面板"
                >
                  <ChevronsLeft size={15} aria-hidden="true" />
                </button>
              </div>
              <ComponentPalette
                onSelectedComponentChange={setSelectedComponent}
              />
            </>
          )}
        </section>

        <section className="workbench-canvas" aria-label="流程画布">
          <RootCanvas
            getComponentRuntimeState={getComponentRuntimeState}
            onInvokeComponentAction={invokeComponentAction}
            onSelectedComponentChange={setSelectedComponent}
          />
          {canvasPersistenceError ? (
            <div className="root-canvas-drop-error" role="status">
              {canvasPersistenceError}
            </div>
          ) : null}
        </section>

        <aside className="workbench-inspector" aria-label="属性检查器">
          {isInspectorMinimized ? (
            <button
              type="button"
              className="workbench-panel-toggle workbench-panel-toggle--vertical"
              onClick={() => setIsInspectorMinimized(false)}
              aria-label="展开属性检查器"
              title="展开属性检查器"
            >
              <ChevronsLeft size={16} aria-hidden="true" />
              <span>属性</span>
            </button>
          ) : (
            <InspectorPanel
              getComponentRuntimeState={getComponentRuntimeState}
              selectedComponent={selectedComponent}
              onInvokeComponentAction={invokeComponentAction}
              onSelectedComponentChange={setSelectedComponent}
              onMinimize={() => setIsInspectorMinimized(true)}
            />
          )}
        </aside>

        <section className="workbench-log-drawer" aria-label="运行日志">
          {isRunLogMinimized ? (
            <div className="run-log-drawer run-log-drawer--minimized">
              <div className="run-log-drawer__title">
                <span className="workbench-kicker">运行日志</span>
              </div>
              <button
                type="button"
                className="workbench-panel-button"
                onClick={() => setIsRunLogMinimized(false)}
                aria-label="展开运行日志"
                title="展开运行日志"
              >
                <ChevronsUp size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <RunLogDrawer
              clear={runLog.clear}
              onMinimize={() => setIsRunLogMinimized(true)}
              state={runLog.state}
            />
          )}
        </section>
        </main>
      </FreeLayoutEditorProvider>
    </ComponentRuntimeProvider>
  );
}
