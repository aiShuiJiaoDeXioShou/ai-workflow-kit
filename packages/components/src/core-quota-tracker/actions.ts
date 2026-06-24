import {
  defineWorkflowAction,
  type WorkflowActionDefinition,
} from "@ai-workflow-kit/component-sdk";

export const refreshQuotaAction = defineWorkflowAction({
  id: "refreshQuota",
  title: "刷新额度",
  kind: "quota.file.refresh",
});

export const quotaTrackerActions = [
  refreshQuotaAction,
] satisfies WorkflowActionDefinition[];
