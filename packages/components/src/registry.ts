import {
  assertValidComponentRegistry,
  type WorkflowComponentManifest,
  type WorkflowComponentModule,
} from "@ai-workflow-kit/component-sdk";

import { agentLauncherComponent } from "./core-agent-launcher";
import { httpHealthMonitorComponent } from "./core-monitor-http-health";
import { quotaTrackerComponent } from "./core-quota-tracker";
import { canvasNoteComponent } from "./local-canvas-note";

export const builtInComponentTypes = {
  httpHealthMonitor: "core.monitor.http-health",
  quotaTracker: "core.quota.tracker",
  agentLauncher: "core.agent.launcher",
  canvasNote: "local.canvas.note",
} as const;

export type BuiltInComponentType =
  (typeof builtInComponentTypes)[keyof typeof builtInComponentTypes];

type TrustedWorkflowComponentModule = WorkflowComponentModule<any>;
type TrustedWorkflowComponentManifest = WorkflowComponentManifest<any>;

export type TrustedComponentRegistry = {
  components: readonly TrustedWorkflowComponentModule[];
  manifests: readonly TrustedWorkflowComponentManifest[];
  getByType: (
    componentType: string,
  ) => TrustedWorkflowComponentModule | undefined;
  getManifest: (
    componentType: string,
  ) => TrustedWorkflowComponentManifest | undefined;
  has: (componentType: string) => boolean;
};

const trustedComponentModules = [
  httpHealthMonitorComponent,
  quotaTrackerComponent,
  agentLauncherComponent,
  canvasNoteComponent,
] satisfies readonly TrustedWorkflowComponentModule[];

export function createTrustedComponentRegistry(
  components: readonly TrustedWorkflowComponentModule[],
): TrustedComponentRegistry {
  assertValidComponentRegistry([...components]);

  const stableComponents = Object.freeze([...components]);
  const componentsByType = new Map(
    stableComponents.map((component) => [component.manifest.type, component]),
  );
  const manifests = Object.freeze(
    stableComponents.map((component) => component.manifest),
  );

  return Object.freeze({
    components: stableComponents,
    manifests,
    getByType(componentType: string) {
      return componentsByType.get(componentType);
    },
    getManifest(componentType: string) {
      return componentsByType.get(componentType)?.manifest;
    },
    has(componentType: string) {
      return componentsByType.has(componentType);
    },
  });
}

export const trustedComponentRegistry = createTrustedComponentRegistry(
  trustedComponentModules,
);

export const componentRegistry = trustedComponentRegistry.components;
export const componentManifests = trustedComponentRegistry.manifests;
export const getComponentByType = trustedComponentRegistry.getByType;
export const getComponentManifest = trustedComponentRegistry.getManifest;
export const hasComponentType = trustedComponentRegistry.has;
