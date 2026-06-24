import { invoke } from "@tauri-apps/api/core";

export type ComponentInstanceRecord = {
  id: string;
  canvasId: string;
  componentType: string;
  configJson: unknown;
  createdAt: string;
  updatedAt: string;
};

type CreateComponentInstanceRequest = {
  canvasId: string;
  componentType: string;
  configJson: unknown;
};

type UpdateComponentInstanceConfigRequest = {
  id: string;
  configJson: unknown;
};

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function createComponentInstance(
  request: CreateComponentInstanceRequest,
) {
  if (!isTauriRuntime()) {
    const timestamp = new Date().toISOString();

    // Vite 预览没有 Tauri command bridge，只返回临时记录用于前端交互验证。
    return Promise.resolve({
      id: `dev-${crypto.randomUUID()}`,
      canvasId: request.canvasId,
      componentType: request.componentType,
      configJson: request.configJson,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies ComponentInstanceRecord);
  }

  return invoke<ComponentInstanceRecord>("create_component_instance", {
    request,
  });
}

export function updateComponentInstanceConfig(
  request: UpdateComponentInstanceConfigRequest,
) {
  if (!isTauriRuntime()) {
    const timestamp = new Date().toISOString();

    // 浏览器预览阶段没有本地数据库，仍返回同形记录，方便验证 Inspector 编辑链路。
    return Promise.resolve({
      id: request.id,
      canvasId: "root",
      componentType: "unknown.component",
      configJson: request.configJson,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies ComponentInstanceRecord);
  }

  return invoke<ComponentInstanceRecord>("update_component_instance_config", {
    request,
  });
}
