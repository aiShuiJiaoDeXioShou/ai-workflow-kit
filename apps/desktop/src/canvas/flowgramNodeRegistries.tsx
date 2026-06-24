import type { WorkflowNodeRegistry } from "@flowgram.ai/free-layout-editor";
import { Field } from "@flowgram.ai/free-layout-editor";

import {
  FLOWGRAM_WORKFLOW_COMPONENT_NODE_TYPE,
  FLOWGRAM_WORKFLOW_END_NODE_TYPE,
  FLOWGRAM_WORKFLOW_START_NODE_TYPE,
} from "./flowgramComponentNode";

const categoryLabels: Record<string, string> = {
  agent: "Agent",
  custom: "自定义",
  monitor: "监控",
  quota: "额度",
  system: "系统",
  utility: "工具",
  workflow: "工作流",
};

const statusLabels: Record<string, string> = {
  error: "错误",
  idle: "空闲",
  running: "运行中",
  success: "成功",
  warning: "警告",
};

function FlowgramNodeFields() {
  return (
    <>
      <Field<string> name="title">
        {({ field }) => (
          <div className="flowgram-workflow-node__title">{field.value}</div>
        )}
      </Field>
      <Field<string> name="category">
        {({ field }) => (
          <div className="flowgram-workflow-node__category">
            {categoryLabels[field.value ?? "workflow"] ?? field.value ?? "工作流"}
          </div>
        )}
      </Field>
      <Field<string> name="componentType">
        {({ field }) =>
          field.value ? (
            <div className="flowgram-workflow-node__type">{field.value}</div>
          ) : (
            <span hidden />
          )
        }
      </Field>
      <Field<string> name="description">
        {({ field }) => (
          <div className="flowgram-workflow-node__description">
            {field.value}
          </div>
        )}
      </Field>
      <Field<string> name="status">
        {({ field }) => (
          <div
            className="flowgram-workflow-node__status"
            data-status={field.value ?? "idle"}
          >
            {statusLabels[field.value ?? "idle"] ?? field.value ?? "空闲"}
          </div>
        )}
      </Field>
    </>
  );
}

export const flowgramNodeRegistries: WorkflowNodeRegistry[] = [
  {
    type: FLOWGRAM_WORKFLOW_START_NODE_TYPE,
    meta: {
      defaultPorts: [{ type: "output" }],
    },
  },
  {
    type: FLOWGRAM_WORKFLOW_END_NODE_TYPE,
    meta: {
      defaultPorts: [{ type: "input" }],
    },
  },
  {
    type: FLOWGRAM_WORKFLOW_COMPONENT_NODE_TYPE,
    meta: {
      defaultExpanded: true,
    },
    defaultPorts: [{ type: "input" }, { type: "output" }],
  },
];

export function getFlowgramNodeDefaultRegistry(
  type: string,
): WorkflowNodeRegistry {
  return {
    type,
    meta: {
      defaultExpanded: true,
    },
    formMeta: {
      // FlowGram 的节点数据由 node engine 管理，这里只声明渲染字段。
      render: () => <FlowgramNodeFields />,
    },
  };
}
