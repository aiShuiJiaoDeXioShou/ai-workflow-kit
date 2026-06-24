import {
  getWorkflowActionKindMetadata,
  type WorkflowValidationError,
} from "@ai-workflow-kit/component-sdk";
import {
  getComponentByType,
  getComponentManifest,
} from "@ai-workflow-kit/components";
import { useClientContext } from "@flowgram.ai/free-layout-editor";
import {
  AlertTriangle,
  Box,
  Cable,
  ChevronsRight,
  Settings2,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  readFlowgramWorkflowNodeData,
  updateFlowgramWorkflowNodeData,
} from "../canvas/flowgramNodeForm";
import { toSelectedWorkflowComponent } from "../canvas/flowgramComponentNode";
import { getWorkflowComponentRenderModel } from "../canvas/workflowComponentFallback";
import type { SelectedWorkflowComponent } from "../canvas/selectedWorkflowComponent";
import { updateComponentInstanceConfig } from "../persistence/componentInstances";
import type {
  GetComponentRuntimeState,
  InvokeComponentAction,
} from "../runtime/componentActionRuntime";

type InspectorPanelProps = {
  getComponentRuntimeState?: GetComponentRuntimeState;
  onMinimize?: () => void;
  onInvokeComponentAction?: InvokeComponentAction;
  onSelectedComponentChange?: (
    selectedComponent: SelectedWorkflowComponent | undefined,
  ) => void;
  selectedComponent?: SelectedWorkflowComponent;
};

function formatMeasure(value: number): string {
  return Math.round(value).toString();
}

function formatConfigValidationErrors(
  issues: Array<{ path: (string | number)[]; message: string }>,
): WorkflowValidationError[] {
  return issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "config",
    message: issue.message,
  }));
}

function mergeObjectConfig<TConfig>(
  defaultConfig: TConfig,
  rawConfig: unknown,
): TConfig {
  if (
    defaultConfig &&
    typeof defaultConfig === "object" &&
    !Array.isArray(defaultConfig) &&
    rawConfig &&
    typeof rawConfig === "object" &&
    !Array.isArray(rawConfig)
  ) {
    return {
      ...defaultConfig,
      ...rawConfig,
    };
  }

  return (rawConfig ?? defaultConfig) as TConfig;
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : "配置保存失败";
}

export function InspectorPanel({
  getComponentRuntimeState,
  onMinimize,
  onInvokeComponentAction,
  onSelectedComponentChange,
  selectedComponent,
}: InspectorPanelProps) {
  const clientContext = useClientContext();
  const [configSaveError, setConfigSaveError] = useState<string | undefined>();

  useEffect(() => {
    setConfigSaveError(undefined);
  }, [selectedComponent?.nodeId]);

  const componentModule = selectedComponent
    ? getComponentByType(selectedComponent.componentType)
    : undefined;
  const manifest = selectedComponent
    ? getComponentManifest(selectedComponent.componentType)
    : undefined;
  const actions = manifest?.actions ?? [];
  const renderModel = selectedComponent
    ? getWorkflowComponentRenderModel(selectedComponent)
    : undefined;
  const inspectorConfig = useMemo(() => {
    if (!manifest || !selectedComponent) return undefined;

    const mergedConfig = mergeObjectConfig(
      manifest.defaultConfig,
      selectedComponent.configJson,
    );
    const result = manifest.configSchema.safeParse(mergedConfig);

    return result.success ? result.data : mergedConfig;
  }, [manifest, selectedComponent]);
  const validationErrors = useMemo(() => {
    if (!manifest || inspectorConfig === undefined) return [];

    const result = manifest.configSchema.safeParse(inspectorConfig);
    return result.success
      ? []
      : formatConfigValidationErrors(result.error.issues);
  }, [inspectorConfig, manifest]);

  function updateSelectedComponentConfig(nextConfig: unknown) {
    if (!manifest || !selectedComponent) return;

    const node = clientContext.document
      .getAllNodes()
      .find((candidate) => candidate.id === selectedComponent.nodeId);

    if (!node) {
      setConfigSaveError("选中的节点已不存在，无法更新配置");
      return;
    }

    const currentData = readFlowgramWorkflowNodeData(node);
    if (!currentData || currentData.nodeKind !== "component") {
      setConfigSaveError("选中的节点不是工作流组件，无法更新配置");
      return;
    }

    const validationResult = manifest.configSchema.safeParse(nextConfig);
    const nextData = {
      ...currentData,
      configJson: validationResult.success ? validationResult.data : nextConfig,
    };

    updateFlowgramWorkflowNodeData(node, nextData);
    onSelectedComponentChange?.(
      toSelectedWorkflowComponent(selectedComponent.nodeId, nextData),
    );

    if (!validationResult.success) {
      setConfigSaveError(undefined);
      return;
    }

    void updateComponentInstanceConfig({
      id: selectedComponent.instanceId,
      configJson: validationResult.data,
    })
      .then(() => {
        setConfigSaveError(undefined);
      })
      .catch((error: unknown) => {
        setConfigSaveError(formatUnknownError(error));
      });
  }

  async function invokeSelectedComponentAction(
    actionId: string,
    input?: unknown,
  ) {
    if (
      !manifest ||
      !onInvokeComponentAction ||
      !selectedComponent ||
      inspectorConfig === undefined
    ) {
      return;
    }

    await onInvokeComponentAction({
      actionId,
      componentType: selectedComponent.componentType,
      config: inspectorConfig,
      input,
      instanceId: selectedComponent.instanceId,
      runtimeState: getComponentRuntimeState?.(selectedComponent.instanceId),
    });
  }

  if (!selectedComponent) {
    return (
      <div className="inspector-panel">
        <div className="inspector-panel__topbar">
          <span className="workbench-kicker">属性</span>
          <button
            type="button"
            className="workbench-panel-button"
            onClick={onMinimize}
            aria-label="最小化属性检查器"
            title="最小化属性检查器"
          >
            <ChevronsRight size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="inspector-panel__empty">
          <Box size={18} aria-hidden="true" />
          <strong>未选择组件</strong>
        </div>
      </div>
    );
  }

  const activeRenderModel =
    renderModel ?? getWorkflowComponentRenderModel(selectedComponent);

  return (
    <div className="inspector-panel">
      <div className="inspector-panel__topbar">
        <span className="workbench-kicker">属性</span>
        <button
          type="button"
          className="workbench-panel-button"
          onClick={onMinimize}
          aria-label="最小化属性检查器"
          title="最小化属性检查器"
        >
          <ChevronsRight size={15} aria-hidden="true" />
        </button>
      </div>

      <header className="inspector-panel__header">
        <div className="inspector-panel__title-icon">
          <Settings2 size={17} aria-hidden="true" />
        </div>
        <div className="inspector-panel__title">
          <strong>{manifest?.title ?? activeRenderModel.title}</strong>
          <span>{activeRenderModel.componentType}</span>
        </div>
      </header>

      {!activeRenderModel.isKnownComponent ? (
        <div className="inspector-panel__warning" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>{activeRenderModel.missingMessage}</span>
        </div>
      ) : null}

      <section className="inspector-panel__section" aria-label="组件元信息">
        <dl className="inspector-panel__meta">
          <div className="inspector-panel__row">
            <dt>实例</dt>
            <dd>{selectedComponent.instanceId}</dd>
          </div>
          <div className="inspector-panel__row">
            <dt>节点</dt>
            <dd>{selectedComponent.nodeId}</dd>
          </div>
          <div className="inspector-panel__row">
            <dt>状态</dt>
            <dd>
              <span
                className="inspector-panel__status"
                data-status={activeRenderModel.status}
              >
                {activeRenderModel.statusLabel}
              </span>
            </dd>
          </div>
          <div className="inspector-panel__row">
            <dt>尺寸</dt>
            <dd>
              {formatMeasure(selectedComponent.size.w)} x{" "}
              {formatMeasure(selectedComponent.size.h)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="inspector-panel__section" aria-label="组件配置">
        <div className="inspector-panel__section-title">
          <SlidersHorizontal size={14} aria-hidden="true" />
          <span>配置</span>
        </div>
        {componentModule?.InspectorView && inspectorConfig !== undefined ? (
          <componentModule.InspectorView
            componentType={selectedComponent.componentType}
            config={inspectorConfig}
            instanceId={selectedComponent.instanceId}
            invokeAction={invokeSelectedComponentAction}
            updateConfig={updateSelectedComponentConfig}
            validationErrors={validationErrors}
          />
        ) : (
          <div className="inspector-panel__placeholder">
            属性视图不可用
          </div>
        )}
        {configSaveError ? (
          <div className="inspector-panel__warning" role="status">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{configSaveError}</span>
          </div>
        ) : null}
      </section>

      <section className="inspector-panel__section" aria-label="组件动作">
        <div className="inspector-panel__section-title">
          <Zap size={14} aria-hidden="true" />
          <span>动作</span>
        </div>

        {actions.length > 0 ? (
          <div className="inspector-panel__actions">
            {actions.map((action) => {
              const metadata = getWorkflowActionKindMetadata(action.kind);

              return (
                <button
                  key={action.id}
                  className="inspector-panel__action"
                  type="button"
                  onClick={() => {
                    void invokeSelectedComponentAction(action.id);
                  }}
                  aria-label={`${action.title}: ${metadata.title}`}
                >
                  <Cable size={14} aria-hidden="true" />
                  <span>{action.title}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="inspector-panel__placeholder">暂无动作</div>
        )}
      </section>
    </div>
  );
}
