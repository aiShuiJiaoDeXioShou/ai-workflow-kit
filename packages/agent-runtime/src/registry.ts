import { z } from "zod";

import {
  assertValidAgentAdapter,
  defineAgentAdapter,
  parseAgentAdapterArgs,
  type AgentAdapter,
  type AgentAdapterArgs,
} from "./adapter";

export type AgentAdapterRegistry = {
  adapters: readonly AgentAdapter[];
  getById: (adapterId: string) => AgentAdapter | undefined;
  getRequired: (adapterId: string) => AgentAdapter;
  has: (adapterId: string) => boolean;
  parseArgs: (adapterId: string, args: unknown) => unknown;
};

export const localEchoArgsSchema = z
  .object({
    message: z.string().trim().min(1).max(500).default("AI Workflow Kit"),
    repeat: z.number().int().min(1).max(5).default(1),
  })
  .strict();

export const localEchoAdapter = defineAgentAdapter({
  id: "local.echo",
  title: "Local Echo",
  command: "node",
  argsSchema: localEchoArgsSchema,
  cwdPolicy: "workspace",
  envAllowlist: [],
});

export type LocalEchoArgs = AgentAdapterArgs<typeof localEchoAdapter>;

const builtInAgentAdapters = [
  localEchoAdapter,
] satisfies readonly AgentAdapter[];

export function createAgentAdapterRegistry(
  adapters: readonly AgentAdapter[],
): AgentAdapterRegistry {
  const ids = new Set<string>();

  adapters.forEach((adapter) => {
    assertValidAgentAdapter(adapter);
    if (ids.has(adapter.id)) {
      throw new Error(`duplicate adapter id: ${adapter.id}`);
    }
    ids.add(adapter.id);
  });

  const stableAdapters = Object.freeze([...adapters]);
  const adaptersById = new Map(
    stableAdapters.map((adapter) => [adapter.id, adapter]),
  );
  const getRequired = (adapterId: string) => {
    const adapter = adaptersById.get(adapterId);
    if (!adapter) {
      throw new Error(`unknown adapter id: ${adapterId}`);
    }
    return adapter;
  };

  return Object.freeze({
    adapters: stableAdapters,
    getById(adapterId: string) {
      return adaptersById.get(adapterId);
    },
    getRequired,
    has(adapterId: string) {
      return adaptersById.has(adapterId);
    },
    parseArgs(adapterId: string, args: unknown) {
      return parseAgentAdapterArgs(getRequired(adapterId), args);
    },
  });
}

export const agentAdapterRegistry =
  createAgentAdapterRegistry(builtInAgentAdapters);

export const agentAdapters = agentAdapterRegistry.adapters;
export const getAgentAdapterById = agentAdapterRegistry.getById;
export const getRequiredAgentAdapter = agentAdapterRegistry.getRequired;
export const hasAgentAdapter = agentAdapterRegistry.has;
export const parseRegisteredAgentAdapterArgs = agentAdapterRegistry.parseArgs;
