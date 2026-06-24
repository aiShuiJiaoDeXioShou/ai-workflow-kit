import {
  defineWorkflowAction,
  type WorkflowActionDefinition,
} from "@ai-workflow-kit/component-sdk";

export const checkNowAction = defineWorkflowAction({
  id: "checkNow",
  title: "立即检测",
  kind: "monitor.http.check",
});

export const httpHealthMonitorActions = [
  checkNowAction,
] satisfies WorkflowActionDefinition[];
