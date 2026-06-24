export const agentRunStatuses = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "stopped",
] as const;

export type AgentRunStatus = (typeof agentRunStatuses)[number];

export const agentRunLogStreams = ["stdout", "stderr"] as const;

export type AgentRunLogStream = (typeof agentRunLogStreams)[number];

export const agentRuntimeEventNames = [
  "agent_run_started",
  "agent_run_stdout",
  "agent_run_stderr",
  "agent_run_exit",
] as const;

export type AgentRuntimeEventName = (typeof agentRuntimeEventNames)[number];

export type AgentRunStartedEvent = {
  type: "agent_run_started";
  runId: string;
  adapterId: string;
  timestamp: string;
};

export type AgentRunOutputEvent = {
  type: "agent_run_stdout" | "agent_run_stderr";
  runId: string;
  line: string;
  timestamp: string;
};

export type AgentRunExitEvent = {
  type: "agent_run_exit";
  runId: string;
  status: Exclude<AgentRunStatus, "queued" | "running">;
  exitCode?: number;
  timestamp: string;
};

export type AgentRuntimeEvent =
  | AgentRunStartedEvent
  | AgentRunOutputEvent
  | AgentRunExitEvent;

export type AgentRunRecord = {
  id: string;
  adapterId: string;
  status: AgentRunStatus;
  cwd?: string;
  argsJson: unknown;
  startedAt?: string;
  endedAt?: string;
  exitCode?: number;
};

export function createAgentRunOutputEvent(
  stream: AgentRunLogStream,
  payload: Omit<AgentRunOutputEvent, "type">,
): AgentRunOutputEvent {
  return {
    type: stream === "stdout" ? "agent_run_stdout" : "agent_run_stderr",
    ...payload,
  };
}
