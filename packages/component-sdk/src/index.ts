import type { ComponentType } from "react";
import type { z } from "zod";

export * from "./actions";
export * from "./validation";

export type WorkflowComponentCategory =
  | "monitor"
  | "quota"
  | "agent"
  | "utility"
  | "custom";

export type WorkflowRuntimeStatus =
  | "idle"
  | "running"
  | "success"
  | "warning"
  | "error";

export type WorkflowActionKind =
  | "monitor.http.check"
  | "quota.file.refresh"
  | "agent.adapter.start"
  | "agent.adapter.stop";

export type WorkflowSize = {
  w: number;
  h: number;
};

export type WorkflowValidationError = {
  path: string;
  message: string;
};

export type WorkflowActionDefinition<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  id: string;
  title: string;
  kind: WorkflowActionKind;
  inputSchema?: TInputSchema;
  confirm?: boolean;
};

export type WorkflowComponentManifest<
  TConfigSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  type: string;
  title: string;
  description: string;
  version: string;
  category: WorkflowComponentCategory;
  icon: string;
  defaultSize: WorkflowSize;
  minSize?: WorkflowSize;
  configSchema: TConfigSchema;
  defaultConfig: z.infer<TConfigSchema>;
  actions?: WorkflowActionDefinition[];
};

export type ComponentViewProps<TConfig> = {
  instanceId: string;
  componentType: string;
  config: TConfig;
  runtimeState: unknown;
  status: WorkflowRuntimeStatus;
  size: WorkflowSize;
  invokeAction: (actionId: string, input?: unknown) => Promise<void>;
};

export type ComponentInspectorProps<TConfig> = {
  instanceId: string;
  componentType: string;
  config: TConfig;
  validationErrors: WorkflowValidationError[];
  updateConfig: (nextConfig: TConfig) => void;
  invokeAction: (actionId: string, input?: unknown) => Promise<void>;
};

export type WorkflowComponentModule<
  TConfigSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  manifest: WorkflowComponentManifest<TConfigSchema>;
  CanvasView: ComponentType<ComponentViewProps<z.infer<TConfigSchema>>>;
  InspectorView?: ComponentType<ComponentInspectorProps<z.infer<TConfigSchema>>>;
};

export type WorkflowComponentRegistry = WorkflowComponentModule[];
