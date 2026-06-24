import type { WorkflowComponentManifest } from "@ai-workflow-kit/component-sdk";

import { agentLauncherActions } from "./actions";
import {
  agentLauncherConfigSchema,
  defaultAgentLauncherConfig,
} from "./schema";

export const agentLauncherManifest = {
  type: "core.agent.launcher",
  title: "Agent 启动器",
  description:
    "通过 runtime action 启动和停止 allowlist 中的本地 Agent adapter。",
  version: "0.1.0",
  category: "agent",
  icon: "bot",
  defaultSize: { w: 320, h: 210 },
  minSize: { w: 260, h: 170 },
  configSchema: agentLauncherConfigSchema,
  defaultConfig: defaultAgentLauncherConfig,
  actions: agentLauncherActions,
} satisfies WorkflowComponentManifest<typeof agentLauncherConfigSchema>;
