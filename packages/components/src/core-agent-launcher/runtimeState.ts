export const agentRunStatuses = [
  "idle",
  "queued",
  "running",
  "succeeded",
  "failed",
  "stopped",
] as const;

export type AgentRunStatus = (typeof agentRunStatuses)[number];

export type AgentLauncherRuntimeState = {
  runId?: string;
  status: AgentRunStatus;
  startedAt?: string;
  endedAt?: string;
  exitCode?: number;
  recentStdout: string[];
  recentStderr: string[];
};

const agentRunStatusSet = new Set<string>(agentRunStatuses);
const maxRecentLogLines = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readExitCode(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function readStatus(value: unknown): AgentRunStatus {
  return typeof value === "string" && agentRunStatusSet.has(value)
    ? (value as AgentRunStatus)
    : "idle";
}

function readRecentLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    )
    .slice(-maxRecentLogLines);
}

export function parseAgentLauncherRuntimeState(
  runtimeState: unknown,
): AgentLauncherRuntimeState {
  if (!isRecord(runtimeState)) {
    return {
      status: "idle",
      recentStdout: [],
      recentStderr: [],
    };
  }

  return {
    runId: readString(runtimeState.runId),
    status: readStatus(runtimeState.status),
    startedAt: readString(runtimeState.startedAt),
    endedAt: readString(runtimeState.endedAt),
    exitCode: readExitCode(runtimeState.exitCode),
    recentStdout: readRecentLines(runtimeState.recentStdout),
    recentStderr: readRecentLines(runtimeState.recentStderr),
  };
}
