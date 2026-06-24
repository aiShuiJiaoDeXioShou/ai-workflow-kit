import type { WorkflowComponentModule } from "@ai-workflow-kit/component-sdk";

import { CanvasView } from "./CanvasView";
import { InspectorView } from "./InspectorView";
import { agentLauncherManifest } from "./manifest";
import { agentLauncherConfigSchema } from "./schema";

export * from "./actions";
export * from "./manifest";
export * from "./runtimeState";
export * from "./schema";

export const agentLauncherComponent = {
  manifest: agentLauncherManifest,
  CanvasView,
  InspectorView,
} satisfies WorkflowComponentModule<typeof agentLauncherConfigSchema>;
