import {
  defineWorkflowAction,
  type WorkflowActionDefinition,
} from "@ai-workflow-kit/component-sdk";

export const startRunAction = defineWorkflowAction({
  id: "startRun",
  title: "启动运行",
  kind: "agent.adapter.start",
});

export const stopRunAction = defineWorkflowAction({
  id: "stopRun",
  title: "停止运行",
  kind: "agent.adapter.stop",
});

export const agentLauncherActions = [
  startRunAction,
  stopRunAction,
] satisfies WorkflowActionDefinition[];
