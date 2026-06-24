import type { WorkflowComponentManifest } from "@ai-workflow-kit/component-sdk";

import { quotaTrackerActions } from "./actions";
import {
  defaultQuotaTrackerConfig,
  quotaTrackerConfigSchema,
} from "./schema";

export const quotaTrackerManifest = {
  type: "core.quota.tracker",
  title: "额度追踪",
  description: "展示手动配置或文件刷新得到的额度使用情况。",
  version: "0.1.0",
  category: "quota",
  icon: "gauge",
  defaultSize: { w: 300, h: 190 },
  minSize: { w: 240, h: 160 },
  configSchema: quotaTrackerConfigSchema,
  defaultConfig: defaultQuotaTrackerConfig,
  actions: quotaTrackerActions,
} satisfies WorkflowComponentManifest<typeof quotaTrackerConfigSchema>;
