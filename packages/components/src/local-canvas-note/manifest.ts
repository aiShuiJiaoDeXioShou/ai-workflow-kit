import type { WorkflowComponentManifest } from "@ai-workflow-kit/component-sdk";

import { canvasNoteConfigSchema, defaultCanvasNoteConfig } from "./schema";

export const canvasNoteManifest = {
  type: "local.canvas.note",
  title: "画布便签",
  description: "在画布上直接保留本地工作流上下文和检查清单。",
  version: "0.1.0",
  category: "utility",
  icon: "sticky-note",
  defaultSize: { w: 280, h: 180 },
  minSize: { w: 220, h: 140 },
  configSchema: canvasNoteConfigSchema,
  defaultConfig: defaultCanvasNoteConfig,
} satisfies WorkflowComponentManifest<typeof canvasNoteConfigSchema>;
