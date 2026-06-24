import type { ComponentViewProps } from "@ai-workflow-kit/component-sdk";

import {
  parseAgentLauncherRuntimeState,
  type AgentRunStatus,
} from "./runtimeState";
import type { AgentLauncherConfig } from "./schema";

const statusLabels: Record<AgentRunStatus, string> = {
  idle: "空闲",
  queued: "排队中",
  running: "运行中",
  succeeded: "成功",
  failed: "失败",
  stopped: "已停止",
};

const statusColors: Record<AgentRunStatus, string> = {
  idle: "#8a8f88",
  queued: "#111111",
  running: "#111111",
  succeeded: "#15803d",
  failed: "#dc2626",
  stopped: "#8a8f88",
};

function formatDate(value: string | undefined): string {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatExitCode(value: number | undefined): string {
  return typeof value === "number" ? value.toString() : "--";
}

function LogLines({ lines, title }: { lines: string[]; title: string }) {
  if (lines.length === 0) return null;

  return (
    <div
      aria-label={title}
      style={{
        display: "grid",
        gap: 3,
        minWidth: 0,
      }}
    >
      {lines.map((line, index) => (
        <span
          key={`${title}-${index}-${line}`}
          title={line}
          style={{
            color: "#6f6f68",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {line}
        </span>
      ))}
    </div>
  );
}

export function CanvasView({
  config,
  invokeAction,
  runtimeState,
}: ComponentViewProps<AgentLauncherConfig>) {
  const state = parseAgentLauncherRuntimeState(runtimeState);
  const isActive = state.status === "queued" || state.status === "running";
  const color = statusColors[state.status];

  return (
    <section
      aria-label={`${config.label} Agent 启动器`}
      style={{
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
        overflow: "hidden",
        padding: 12,
        width: "100%",
      }}
    >
      <header
        style={{
          alignItems: "center",
          display: "flex",
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            background: color,
            borderRadius: 999,
            display: "inline-block",
            flex: "0 0 auto",
            height: 9,
            width: 9,
          }}
        />
        <strong
          style={{
            flex: "1 1 auto",
            fontSize: 14,
            lineHeight: 1.2,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {config.label}
        </strong>
        <span
          style={{
            color,
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {statusLabels[state.status]}
        </span>
      </header>

      <dl
        style={{
          display: "grid",
          gap: 6,
          gridTemplateColumns: "max-content minmax(0, 1fr)",
          margin: 0,
        }}
      >
        <dt style={{ color: "#84847d", fontSize: 11 }}>
          Adapter
        </dt>
        <dd
          title={config.adapterId}
          style={{
            fontSize: 12,
            margin: 0,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {config.adapterId}
        </dd>
        <dt style={{ color: "#84847d", fontSize: 11 }}>运行</dt>
        <dd
          title={state.runId}
          style={{
            fontSize: 12,
            margin: 0,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {state.runId ?? "--"}
        </dd>
        <dt style={{ color: "#84847d", fontSize: 11 }}>
          启动时间
        </dt>
        <dd style={{ fontSize: 12, margin: 0 }}>
          {formatDate(state.startedAt)}
        </dd>
        <dt style={{ color: "#84847d", fontSize: 11 }}>
          退出码
        </dt>
        <dd style={{ fontSize: 12, margin: 0 }}>
          {formatExitCode(state.exitCode)}
        </dd>
      </dl>

      {config.showRecentLogs ? (
        <div
          style={{
            display: "grid",
            gap: 4,
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <LogLines lines={state.recentStdout} title="最近 stdout" />
          <LogLines lines={state.recentStderr} title="最近 stderr" />
        </div>
      ) : null}

      <footer style={{ marginTop: "auto" }}>
        <button
          type="button"
          onClick={() => {
            void invokeAction(isActive ? "stopRun" : "startRun");
          }}
          style={{
            background: isActive
              ? "rgba(220, 38, 38, 0.10)"
              : "rgba(17, 17, 17, 0.07)",
            border: isActive
              ? "1px solid rgba(220, 38, 38, 0.32)"
              : "1px solid rgba(17, 17, 17, 0.28)",
            borderRadius: 6,
            color: "#171717",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 9px",
          }}
        >
          {isActive ? "停止" : "启动"}
        </button>
      </footer>
    </section>
  );
}
