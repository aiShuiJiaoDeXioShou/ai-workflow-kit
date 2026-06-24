import { z } from "zod";

export const agentLauncherCwdModes = [
  "workspace",
  "fixed",
  "selectable",
] as const;

export type AgentLauncherCwdMode = (typeof agentLauncherCwdModes)[number];

export const agentLauncherArgValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const agentLauncherArgsSchema = z.record(
  z.string().trim().min(1).max(80),
  agentLauncherArgValueSchema,
);

export const agentLauncherConfigSchema = z.object({
  label: z.string().trim().min(1).max(80),
  adapterId: z.string().trim().min(1).max(120),
  args: agentLauncherArgsSchema,
  cwdMode: z.enum(agentLauncherCwdModes),
  cwd: z.string().trim().max(1_000),
  showRecentLogs: z.boolean(),
});

export type AgentLauncherConfig = z.infer<typeof agentLauncherConfigSchema>;
export type AgentLauncherArgs = z.infer<typeof agentLauncherArgsSchema>;

export const defaultAgentLauncherConfig: AgentLauncherConfig =
  agentLauncherConfigSchema.parse({
    label: "Agent 启动器",
    adapterId: "local.echo",
    args: {},
    cwdMode: "workspace",
    cwd: "",
    showRecentLogs: true,
  });
