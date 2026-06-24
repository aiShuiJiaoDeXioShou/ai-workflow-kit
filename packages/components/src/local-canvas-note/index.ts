import type { WorkflowComponentModule } from "@ai-workflow-kit/component-sdk";

import { CanvasView } from "./CanvasView";
import { InspectorView } from "./InspectorView";
import { canvasNoteManifest } from "./manifest";
import { canvasNoteConfigSchema } from "./schema";

export * from "./manifest";
export * from "./schema";

export const canvasNoteComponent = {
  manifest: canvasNoteManifest,
  CanvasView,
  InspectorView,
} satisfies WorkflowComponentModule<typeof canvasNoteConfigSchema>;
