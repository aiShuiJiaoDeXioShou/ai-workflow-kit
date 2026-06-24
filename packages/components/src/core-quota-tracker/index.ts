import type { WorkflowComponentModule } from "@ai-workflow-kit/component-sdk";

import { CanvasView } from "./CanvasView";
import { InspectorView } from "./InspectorView";
import { quotaTrackerManifest } from "./manifest";
import { quotaTrackerConfigSchema } from "./schema";

export * from "./actions";
export * from "./manifest";
export * from "./runtimeState";
export * from "./schema";

export const quotaTrackerComponent = {
  manifest: quotaTrackerManifest,
  CanvasView,
  InspectorView,
} satisfies WorkflowComponentModule<typeof quotaTrackerConfigSchema>;
