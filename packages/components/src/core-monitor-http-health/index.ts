import type { WorkflowComponentModule } from "@ai-workflow-kit/component-sdk";

import { CanvasView } from "./CanvasView";
import { InspectorView } from "./InspectorView";
import { httpHealthMonitorManifest } from "./manifest";
import { httpHealthMonitorConfigSchema } from "./schema";

export * from "./actions";
export * from "./manifest";
export * from "./runtimeState";
export * from "./schema";

export const httpHealthMonitorComponent = {
  manifest: httpHealthMonitorManifest,
  CanvasView,
  InspectorView,
} satisfies WorkflowComponentModule<typeof httpHealthMonitorConfigSchema>;
