export type AgentRunStatus =
  | "idle"
  | "running"
  | "succeeded"
  | "failed"
  | "stopped";

export type AgentRunLogStream = "stdout" | "stderr" | "status";
export type ComponentActionSource = "manual" | "interval";

const runStatusLabels: Record<Exclude<AgentRunStatus, "idle" | "running">, string> = {
  failed: "失败",
  stopped: "已停止",
  succeeded: "成功",
};

export type AgentRunLogEntry = {
  id: string;
  runId: string;
  stream: AgentRunLogStream;
  line: string;
  timestamp: string;
};

export type AgentRunSummary = {
  runId: string;
  adapterId?: string;
  actionId?: string;
  componentType?: string;
  instanceId?: string;
  source?: "agent" | "component";
  status: AgentRunStatus;
  startedAt?: string;
  endedAt?: string;
  exitCode?: number;
};

export type RunLogState = {
  activeRunId?: string;
  runs: Record<string, AgentRunSummary>;
  entries: AgentRunLogEntry[];
};

export type AgentRunStartedPayload = {
  runId: string;
  adapterId: string;
  timestamp: string;
};

export type AgentRunOutputPayload = {
  runId: string;
  line: string;
  timestamp: string;
};

export type AgentRunExitPayload = {
  runId: string;
  status: Exclude<AgentRunStatus, "idle" | "running">;
  exitCode?: number | null;
  timestamp: string;
};

export type ComponentActionStartedPayload = {
  runId: string;
  actionId: string;
  componentType: string;
  instanceId: string;
  source: ComponentActionSource;
  line: string;
  timestamp: string;
};

export type ComponentActionFinishedPayload = {
  runId: string;
  line: string;
  timestamp: string;
};

export type RunLogAction =
  | {
      type: "started";
      payload: AgentRunStartedPayload;
    }
  | {
      type: "output";
      stream: Extract<AgentRunLogStream, "stdout" | "stderr">;
      payload: AgentRunOutputPayload;
    }
  | {
      type: "exit";
      payload: AgentRunExitPayload;
    }
  | {
      type: "component_action_started";
      payload: ComponentActionStartedPayload;
    }
  | {
      type: "component_action_succeeded";
      payload: ComponentActionFinishedPayload;
    }
  | {
      type: "component_action_failed";
      payload: ComponentActionFinishedPayload;
    }
  | {
      type: "clear";
    };

const maxLogEntries = 200;

export const initialRunLogState: RunLogState = {
  runs: {},
  entries: [],
};

export function runLogReducer(
  state: RunLogState,
  action: RunLogAction,
): RunLogState {
  if (action.type === "clear") return initialRunLogState;

  if (action.type === "started") {
    const { adapterId, runId, timestamp } = action.payload;
    const entry = createEntry({
      line: `Agent 已启动：${adapterId}`,
      runId,
      stream: "status",
      timestamp,
    });

    return {
      activeRunId: runId,
      runs: {
        ...state.runs,
        [runId]: {
          runId,
          adapterId,
          source: "agent",
          status: "running",
          startedAt: timestamp,
        },
      },
      entries: appendEntry(state.entries, entry),
    };
  }

  if (action.type === "output") {
    return {
      ...state,
      activeRunId: action.payload.runId,
      entries: appendEntry(
        state.entries,
        createEntry({
          line: action.payload.line,
          runId: action.payload.runId,
          stream: action.stream,
          timestamp: action.payload.timestamp,
        }),
      ),
    };
  }

  if (action.type === "component_action_started") {
    const {
      actionId,
      componentType,
      instanceId,
      line,
      runId,
      source,
      timestamp,
    } = action.payload;

    return {
      activeRunId: runId,
      runs: {
        ...state.runs,
        [runId]: {
          runId,
          actionId,
          componentType,
          instanceId,
          source: "component",
          status: "running",
          startedAt: timestamp,
        },
      },
      entries: appendEntry(
        state.entries,
        createEntry({
          line: `${source === "interval" ? "自动" : "手动"}${line}`,
          runId,
          stream: "status",
          timestamp,
        }),
      ),
    };
  }

  if (
    action.type === "component_action_succeeded" ||
    action.type === "component_action_failed"
  ) {
    const previousRun = state.runs[action.payload.runId];
    const status = action.type === "component_action_succeeded"
      ? "succeeded"
      : "failed";

    return {
      activeRunId: action.payload.runId,
      runs: {
        ...state.runs,
        [action.payload.runId]: {
          runId: action.payload.runId,
          actionId: previousRun?.actionId,
          componentType: previousRun?.componentType,
          instanceId: previousRun?.instanceId,
          source: "component",
          status,
          startedAt: previousRun?.startedAt,
          endedAt: action.payload.timestamp,
        },
      },
      entries: appendEntry(
        state.entries,
        createEntry({
          line: action.payload.line,
          runId: action.payload.runId,
          stream: status === "failed" ? "stderr" : "status",
          timestamp: action.payload.timestamp,
        }),
      ),
    };
  }

  const previousRun = state.runs[action.payload.runId];
  const exitCode =
    typeof action.payload.exitCode === "number"
      ? action.payload.exitCode
      : undefined;
  const entry = createEntry({
    line: `退出${runStatusLabels[action.payload.status]}${
      exitCode === undefined ? "" : ` (${exitCode})`
    }`,
    runId: action.payload.runId,
    stream: "status",
    timestamp: action.payload.timestamp,
  });

  return {
    activeRunId: action.payload.runId,
    runs: {
      ...state.runs,
      [action.payload.runId]: {
        runId: action.payload.runId,
        adapterId: previousRun?.adapterId,
        status: action.payload.status,
        startedAt: previousRun?.startedAt,
        endedAt: action.payload.timestamp,
        exitCode,
      },
    },
    entries: appendEntry(state.entries, entry),
  };
}

function appendEntry(
  entries: AgentRunLogEntry[],
  entry: AgentRunLogEntry,
): AgentRunLogEntry[] {
  return [...entries, entry].slice(-maxLogEntries);
}

function createEntry({
  line,
  runId,
  stream,
  timestamp,
}: Omit<AgentRunLogEntry, "id">): AgentRunLogEntry {
  return {
    id: `${runId}:${timestamp}:${stream}:${line}`,
    line,
    runId,
    stream,
    timestamp,
  };
}
