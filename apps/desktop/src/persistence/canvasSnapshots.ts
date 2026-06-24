import { invoke } from "@tauri-apps/api/core";
import type { WorkflowJSON } from "@flowgram.ai/free-layout-editor";

import { initialFlowgramData } from "../canvas/flowgramInitialData";

export const rootCanvasId = "root";

export type CanvasRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type CanvasSnapshotRecord = {
  id: string;
  canvasId: string;
  documentJson: unknown;
  sessionJson: unknown;
  createdAt: string;
};

type SaveCanvasSnapshotRequest = {
  canvasId: string;
  documentJson: WorkflowJSON;
  sessionJson: unknown;
};

type LoadCanvasSnapshotRequest = {
  canvasId: string;
};

const devSnapshotKeyPrefix = "ai-workflow-kit:canvas-snapshot:";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function devSnapshotKey(canvasId: string): string {
  return `${devSnapshotKeyPrefix}${canvasId}`;
}

function readBrowserStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function parseWorkflowDocumentJson(value: unknown): WorkflowJSON {
  if (!value || typeof value !== "object") return initialFlowgramData;

  const document = value as Partial<WorkflowJSON>;
  if (!Array.isArray(document.nodes) || !Array.isArray(document.edges)) {
    return initialFlowgramData;
  }

  return {
    nodes: document.nodes,
    edges: document.edges,
  };
}

export async function loadDefaultCanvas(): Promise<CanvasRecord> {
  if (!isTauriRuntime()) {
    const timestamp = new Date().toISOString();

    // 浏览器预览没有 SQLite，返回同形记录让恢复流程和 Tauri 路径保持一致。
    return {
      id: rootCanvasId,
      title: "Root Canvas",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return invoke<CanvasRecord>("load_default_canvas");
}

export async function loadLatestCanvasSnapshot(
  request: LoadCanvasSnapshotRequest,
): Promise<CanvasSnapshotRecord | null> {
  if (!isTauriRuntime()) {
    const storage = readBrowserStorage();
    const serialized = storage?.getItem(devSnapshotKey(request.canvasId));
    if (!serialized) return null;

    return JSON.parse(serialized) as CanvasSnapshotRecord;
  }

  return invoke<CanvasSnapshotRecord | null>("load_latest_canvas_snapshot", {
    request,
  });
}

export async function saveCanvasSnapshot(
  request: SaveCanvasSnapshotRequest,
): Promise<CanvasSnapshotRecord> {
  if (!isTauriRuntime()) {
    const timestamp = new Date().toISOString();
    const snapshot: CanvasSnapshotRecord = {
      id: `dev-${crypto.randomUUID()}`,
      canvasId: request.canvasId,
      documentJson: request.documentJson,
      sessionJson: request.sessionJson,
      createdAt: timestamp,
    };

    readBrowserStorage()?.setItem(
      devSnapshotKey(request.canvasId),
      JSON.stringify(snapshot),
    );

    return snapshot;
  }

  return invoke<CanvasSnapshotRecord>("save_canvas_snapshot", {
    request,
  });
}
