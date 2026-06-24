import { z } from "zod";

export const agentCwdPolicies = ["workspace", "fixed", "selectable"] as const;

export type AgentCwdPolicy = (typeof agentCwdPolicies)[number];

export type AgentAdapter<TArgsSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  id: string;
  title: string;
  command: string;
  argsSchema: TArgsSchema;
  cwdPolicy: AgentCwdPolicy;
  envAllowlist: string[];
};

export type AgentAdapterArgs<TAdapter extends AgentAdapter> =
  TAdapter extends AgentAdapter<infer TArgsSchema>
    ? z.infer<TArgsSchema>
    : never;

export type AgentAdapterValidationIssue = {
  path: string;
  message: string;
};

export type AgentAdapterValidationResult = {
  valid: boolean;
  issues: AgentAdapterValidationIssue[];
};

const adapterIdPattern = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;
const envNamePattern = /^[A-Z_][A-Z0-9_]*$/;

function issue(path: string, message: string): AgentAdapterValidationIssue {
  return { path, message };
}

function isZodSchema(value: unknown): value is z.ZodTypeAny {
  return value instanceof z.ZodType;
}

export function validateAgentAdapter(
  adapter: AgentAdapter,
): AgentAdapterValidationResult {
  const issues: AgentAdapterValidationIssue[] = [];

  if (!adapter.id || !adapterIdPattern.test(adapter.id)) {
    issues.push(issue("id", "id must be namespaced, for example local.echo"));
  }
  if (!adapter.title) {
    issues.push(issue("title", "title is required"));
  }
  if (!adapter.command.trim()) {
    issues.push(issue("command", "command is required"));
  }
  if (!agentCwdPolicies.includes(adapter.cwdPolicy)) {
    issues.push(issue("cwdPolicy", "cwdPolicy is invalid"));
  }
  if (!isZodSchema(adapter.argsSchema)) {
    issues.push(issue("argsSchema", "argsSchema must be a Zod schema"));
  }

  adapter.envAllowlist.forEach((envName, index) => {
    if (!envNamePattern.test(envName)) {
      issues.push(
        issue(`envAllowlist.${index}`, "env name must be explicit uppercase"),
      );
    }
  });

  return { valid: issues.length === 0, issues };
}

export function assertValidAgentAdapter(adapter: AgentAdapter): void {
  const result = validateAgentAdapter(adapter);
  if (!result.valid) {
    throw new Error(
      result.issues
        .map(
          (validationIssue) =>
            `${validationIssue.path}: ${validationIssue.message}`,
        )
        .join("\n"),
    );
  }
}

export function defineAgentAdapter<TArgsSchema extends z.ZodTypeAny>(
  adapter: AgentAdapter<TArgsSchema>,
): AgentAdapter<TArgsSchema> {
  assertValidAgentAdapter(adapter);
  return adapter;
}

export function parseAgentAdapterArgs<TArgsSchema extends z.ZodTypeAny>(
  adapter: AgentAdapter<TArgsSchema>,
  args: unknown,
): z.infer<TArgsSchema> {
  return adapter.argsSchema.parse(args);
}

export function safeParseAgentAdapterArgs<TArgsSchema extends z.ZodTypeAny>(
  adapter: AgentAdapter<TArgsSchema>,
  args: unknown,
) {
  return adapter.argsSchema.safeParse(args);
}
