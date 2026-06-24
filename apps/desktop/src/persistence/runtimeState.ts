import { invoke } from "@tauri-apps/api/core";

export type ComponentRuntimeStateRecord = {
  componentInstanceId: string;
  stateJson: unknown;
  updatedAt: string;
};

type UpsertComponentRuntimeStateRequest = {
  componentInstanceId: string;
  stateJson: unknown;
};

type LoadComponentRuntimeStateRequest = {
  componentInstanceId: string;
};

export function upsertComponentRuntimeState(
  request: UpsertComponentRuntimeStateRequest,
) {
  return invoke<ComponentRuntimeStateRecord>("upsert_component_runtime_state", {
    request,
  });
}

export function loadComponentRuntimeState(
  request: LoadComponentRuntimeStateRequest,
) {
  return invoke<ComponentRuntimeStateRecord | null>(
    "load_component_runtime_state",
    {
      request,
    },
  );
}
