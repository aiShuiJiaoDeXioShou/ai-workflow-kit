import { componentManifests } from "@ai-workflow-kit/components";
import {
  Activity,
  Bot,
  Box,
  CircleHelp,
  Gauge,
  GripVertical,
  PackagePlus,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { PointerEvent } from "react";

import type { SelectedWorkflowComponent } from "../canvas/selectedWorkflowComponent";
import {
  clearCurrentWorkflowComponentDragPayload,
  createWorkflowComponentDragPayload,
  dispatchWorkflowComponentDropRequest,
  setCurrentWorkflowComponentDragPayload,
} from "./componentDragPayload";

const iconById: Record<string, LucideIcon> = {
  activity: Activity,
  agent: Bot,
  bot: Bot,
  box: Box,
  gauge: Gauge,
  monitor: Activity,
  package: PackagePlus,
  "sticky-note": StickyNote,
  terminal: Terminal,
};

type ComponentPaletteProps = {
  onSelectedComponentChange?: (
    selectedComponent: SelectedWorkflowComponent | undefined,
  ) => void;
  registryError?: string;
};

function getIcon(iconId: string): LucideIcon {
  return iconById[iconId] ?? CircleHelp;
}

function shortType(componentType: string) {
  return componentType.split(".").slice(-2).join(".");
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    agent: "Agent",
    custom: "自定义",
    monitor: "监控",
    quota: "额度",
    utility: "工具",
  };

  return labels[category] ?? category;
}

function handlePointerDragStart(
  event: PointerEvent<HTMLElement>,
  manifest: (typeof componentManifests)[number],
) {
  if (event.button !== 0) return;

  // 使用应用内 pointer 拖放，避开 Tauri/WebView 对 DataTransfer drop 的兼容差异。
  const payload = createWorkflowComponentDragPayload(manifest);

  setCurrentWorkflowComponentDragPayload(payload);

  event.preventDefault();

  const abortController = new AbortController();
  const finishDrag = () => {
    abortController.abort();
  };
  const cancelDrag = () => {
    finishDrag();
    clearCurrentWorkflowComponentDragPayload();
  };
  const handlePointerUp = (pointerEvent: globalThis.PointerEvent) => {
    finishDrag();

    const dropTarget = document.elementFromPoint(
      pointerEvent.clientX,
      pointerEvent.clientY,
    );
    if (dropTarget?.closest(".root-flowgram-canvas")) {
      dispatchWorkflowComponentDropRequest({
        clientX: pointerEvent.clientX,
        clientY: pointerEvent.clientY,
        payload,
      });
      return;
    }

    clearCurrentWorkflowComponentDragPayload();
  };
  const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
    if (keyboardEvent.key === "Escape") {
      cancelDrag();
    }
  };

  window.addEventListener("pointerup", handlePointerUp, {
    capture: true,
    signal: abortController.signal,
  });
  window.addEventListener("pointercancel", cancelDrag, {
    capture: true,
    signal: abortController.signal,
  });
  window.addEventListener("blur", cancelDrag, { signal: abortController.signal });
  window.addEventListener("keydown", handleKeyDown, {
    signal: abortController.signal,
  });
}

export function ComponentPalette({
  registryError,
}: ComponentPaletteProps) {
  const isDisabled = Boolean(registryError);

  return (
    <div className="component-palette" aria-disabled={isDisabled}>
      {registryError ? (
        <div className="component-palette__empty" role="status">
          <PackagePlus aria-hidden="true" size={18} />
          <span>组件注册表异常</span>
        </div>
      ) : null}

      {!registryError && componentManifests.length === 0 ? (
        <div className="component-palette__empty" role="status">
          <PackagePlus aria-hidden="true" size={18} />
          <span>暂无组件</span>
        </div>
      ) : null}

      {!registryError && componentManifests.length > 0 ? (
        <ul className="component-palette__list" aria-label="可用组件">
          {componentManifests.map((manifest) => {
            const Icon = getIcon(manifest.icon);

            return (
              <li
                className="component-palette__item"
                key={manifest.type}
                onPointerDown={(event) =>
                  handlePointerDragStart(event, manifest)
                }
              >
                <GripVertical
                  aria-hidden="true"
                  className="component-palette__drag"
                  size={16}
                />
                <Icon
                  aria-hidden="true"
                  className="component-palette__icon"
                  size={17}
                />
                <div className="component-palette__meta">
                  <strong>{manifest.title}</strong>
                  <span>{shortType(manifest.type)}</span>
                </div>
                <span className="component-palette__category">
                  {categoryLabel(manifest.category)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
