import { ChevronsDown, ListX, Terminal } from "lucide-react";

import type { AgentRunStatus, RunLogState } from "./runLogState";

type RunLogDrawerProps = {
  clear: () => void;
  onMinimize?: () => void;
  state: RunLogState;
};

const statusLabels: Record<AgentRunStatus, string> = {
  idle: "空闲",
  running: "运行中",
  succeeded: "成功",
  failed: "失败",
  stopped: "已停止",
};

function formatStream(stream: string): string {
  return stream === "status" ? "状态" : stream;
}

function formatTime(value: string | undefined): string {
  if (!value) return "--";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function RunLogDrawer({ clear, onMinimize, state }: RunLogDrawerProps) {
  const activeRun = state.activeRunId
    ? state.runs[state.activeRunId]
    : undefined;
  const visibleEntries = state.entries.slice(-40);

  return (
    <div className="run-log-drawer">
      <header className="run-log-drawer__header">
        <div className="run-log-drawer__title">
          <Terminal size={15} aria-hidden="true" />
          <span className="workbench-kicker">运行日志</span>
        </div>
        <dl className="run-log-drawer__summary" aria-label="运行摘要">
          <div>
            <dt>状态</dt>
            <dd data-status={activeRun?.status ?? "idle"}>
              {statusLabels[activeRun?.status ?? "idle"]}
            </dd>
          </div>
          <div>
            <dt>运行</dt>
            <dd>{activeRun?.runId ?? "--"}</dd>
          </div>
          <div>
            <dt>退出码</dt>
            <dd>{activeRun?.exitCode ?? "--"}</dd>
          </div>
        </dl>
        <div className="run-log-drawer__actions">
          <button
            type="button"
            className="workbench-panel-button"
            onClick={onMinimize}
            aria-label="最小化运行日志"
            title="最小化运行日志"
          >
            <ChevronsDown size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="workbench-panel-button"
            onClick={clear}
            aria-label="清空运行日志"
            title="清空运行日志"
          >
            <ListX size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      {visibleEntries.length > 0 ? (
        <ol className="run-log-drawer__entries" aria-label="运行日志内容">
          {visibleEntries.map((entry) => (
            <li key={entry.id} data-stream={entry.stream}>
              <time>{formatTime(entry.timestamp)}</time>
              <span>{formatStream(entry.stream)}</span>
              <code title={entry.line}>{entry.line}</code>
            </li>
          ))}
        </ol>
      ) : (
        <div className="run-log-drawer__empty">暂无运行记录</div>
      )}
    </div>
  );
}
