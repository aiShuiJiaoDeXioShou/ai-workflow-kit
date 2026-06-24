import type { WorkflowComponentManifest } from "@ai-workflow-kit/component-sdk";

import { httpHealthMonitorActions } from "./actions";
import {
  defaultHttpHealthMonitorConfig,
  httpHealthMonitorConfigSchema,
} from "./schema";

export const httpHealthMonitorManifest = {
  type: "core.monitor.http-health",
  title: "HTTP 健康检查",
  description: "通过 runtime action 检测配置的 HTTP endpoint。",
  version: "0.1.0",
  category: "monitor",
  icon: "activity",
  defaultSize: { w: 300, h: 180 },
  minSize: { w: 240, h: 150 },
  configSchema: httpHealthMonitorConfigSchema,
  defaultConfig: defaultHttpHealthMonitorConfig,
  actions: httpHealthMonitorActions,
} satisfies WorkflowComponentManifest<typeof httpHealthMonitorConfigSchema>;
