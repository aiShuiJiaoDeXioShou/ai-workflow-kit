import type { ComponentViewProps } from "@ai-workflow-kit/component-sdk";

import { parseHttpHealthRuntimeState } from "./runtimeState";
import type { HttpHealthMonitorConfig } from "./schema";

const statusLabels = {
  idle: "未检测",
  checking: "检测中",
  up: "正常",
  down: "异常",
  error: "错误",
} as const;

const statusColors = {
  idle: "#8a8f88",
  checking: "#111111",
  up: "#15803d",
  down: "#111111",
  error: "#dc2626",
} as const;

function formatLatency(latencyMs: number | undefined): string {
  return typeof latencyMs === "number" ? `${Math.round(latencyMs)} ms` : "--";
}

function formatLastChecked(value: string | undefined): string {
  if (!value) return "未检测";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHistoryMarker(
  status: ReturnType<
    typeof parseHttpHealthRuntimeState
  >["history"][number]["status"],
): string {
  if (status === "up") return "U";
  if (status === "down") return "D";
  return "E";
}

export function CanvasView({
  config,
  invokeAction,
  runtimeState,
}: ComponentViewProps<HttpHealthMonitorConfig>) {
  const state = parseHttpHealthRuntimeState(runtimeState);
  const color = statusColors[state.status];

  return (
    <section
      aria-label={`${config.label} HTTP health monitor`}
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

      <div
        style={{
          display: "grid",
          gap: 6,
          minWidth: 0,
        }}
      >
        <span
          title={config.url}
          style={{
            color: "#171717",
            fontSize: 12,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {config.method} {config.url}
        </span>
        <span style={{ color: "#6f6f68", fontSize: 12 }}>
          期望 {config.expectedStatus}，每 {config.intervalSeconds}s 检测
        </span>
      </div>

      <dl
        style={{
          display: "grid",
          gap: 6,
          gridTemplateColumns: "max-content minmax(0, 1fr)",
          margin: 0,
        }}
      >
        {config.showLatency ? (
          <>
            <dt style={{ color: "#84847d", fontSize: 11 }}>
              延迟
            </dt>
            <dd style={{ fontSize: 12, margin: 0 }}>
              {formatLatency(state.latencyMs)}
            </dd>
          </>
        ) : null}
        <dt style={{ color: "#84847d", fontSize: 11 }}>
          最近
        </dt>
        <dd
          style={{
            fontSize: 12,
            margin: 0,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatLastChecked(state.lastCheckedAt)}
        </dd>
        {state.lastError ? (
          <>
            <dt style={{ color: "#84847d", fontSize: 11 }}>
              错误
            </dt>
            <dd
              title={state.lastError}
              style={{
                color: "#dc2626",
                fontSize: 12,
                margin: 0,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {state.lastError}
            </dd>
          </>
        ) : null}
      </dl>

      <footer
        style={{
          alignItems: "center",
          display: "flex",
          gap: 8,
          marginTop: "auto",
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            void invokeAction("checkNow");
          }}
          style={{
            background: "rgba(17, 17, 17, 0.07)",
            border: "1px solid rgba(17, 17, 17, 0.28)",
            borderRadius: 6,
            color: "#171717",
            cursor: "pointer",
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 9px",
          }}
        >
          检测
        </button>
        {state.history.length > 0 ? (
          <div
            aria-label="最近检测结果"
            style={{
              display: "flex",
              gap: 4,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {state.history.map((item, index) => (
              <span
                key={`${item.checkedAt ?? "result"}-${index}`}
                title={item.error ?? item.status}
                style={{
                  alignItems: "center",
                  background: statusColors[item.status],
                  borderRadius: 999,
                  color: "#ffffff",
                  display: "inline-flex",
                  flex: "0 0 auto",
                  fontSize: 10,
                  fontWeight: 700,
                  height: 18,
                  justifyContent: "center",
                  width: 18,
                }}
              >
                {formatHistoryMarker(item.status)}
              </span>
            ))}
          </div>
        ) : null}
      </footer>
    </section>
  );
}
