import {
  isJsonSerializableConfig,
  type WorkflowActionDefinition,
  type WorkflowActionKind,
  type WorkflowComponentManifest,
} from "@ai-workflow-kit/component-sdk";

export type RuntimeActionDispatchErrorCode =
  | "missing_action"
  | "missing_handler"
  | "invalid_config"
  | "invalid_input";

export class RuntimeActionDispatchError extends Error {
  readonly code: RuntimeActionDispatchErrorCode;

  constructor(code: RuntimeActionDispatchErrorCode, message: string) {
    super(message);
    this.name = "RuntimeActionDispatchError";
    this.code = code;
  }
}

export type RuntimeActionRequest = {
  manifest: WorkflowComponentManifest;
  instanceId: string;
  actionId: string;
  config: unknown;
  runtimeState?: unknown;
  input?: unknown;
};

export type RuntimeActionHandlerContext = {
  manifest: WorkflowComponentManifest;
  action: WorkflowActionDefinition;
  instanceId: string;
  config: unknown;
  runtimeState?: unknown;
  input?: unknown;
};

export type RuntimeActionHandler = (
  context: RuntimeActionHandlerContext,
) => Promise<unknown> | unknown;

export type RuntimeActionHandlers = Partial<
  Record<WorkflowActionKind, RuntimeActionHandler>
>;

export type RuntimeActionDispatcher = {
  dispatch: (request: RuntimeActionRequest) => Promise<unknown>;
};

export function createRuntimeActionDispatcher(
  handlers: RuntimeActionHandlers,
): RuntimeActionDispatcher {
  return {
    async dispatch(request) {
      const action = findDeclaredAction(request.manifest, request.actionId);
      const config = parseConfig(request.manifest, request.config);
      const input = parseActionInput(action, request.input);
      const handler = handlers[action.kind];

      if (!handler) {
        throw new RuntimeActionDispatchError(
          "missing_handler",
          `未注册 action handler：${action.kind}`,
        );
      }

      return handler({
        manifest: request.manifest,
        action,
        instanceId: request.instanceId,
        config,
        runtimeState: request.runtimeState,
        input,
      });
    },
  };
}

function findDeclaredAction(
  manifest: WorkflowComponentManifest,
  actionId: string,
): WorkflowActionDefinition {
  const action = manifest.actions?.find(
    (candidateAction) => candidateAction.id === actionId,
  );

  if (!action) {
    throw new RuntimeActionDispatchError(
      "missing_action",
      `组件 ${manifest.type} 未声明 action：${actionId}`,
    );
  }

  return action;
}

function parseConfig(
  manifest: WorkflowComponentManifest,
  config: unknown,
): unknown {
  const result = manifest.configSchema.safeParse(config);

  if (!result.success || !isJsonSerializableConfig(result.data)) {
    throw new RuntimeActionDispatchError(
      "invalid_config",
      `组件 ${manifest.type} 的配置未通过 schema 校验`,
    );
  }

  return result.data;
}

function parseActionInput(
  action: WorkflowActionDefinition,
  input: unknown,
): unknown {
  if (!action.inputSchema) {
    if (input !== undefined) {
      throw new RuntimeActionDispatchError(
        "invalid_input",
        `action ${action.id} 未声明输入 schema`,
      );
    }
    return undefined;
  }

  const result = action.inputSchema.safeParse(input);
  if (!result.success || !isJsonSerializableConfig(result.data)) {
    throw new RuntimeActionDispatchError(
      "invalid_input",
      `action ${action.id} 的输入未通过 schema 校验`,
    );
  }

  return result.data;
}
