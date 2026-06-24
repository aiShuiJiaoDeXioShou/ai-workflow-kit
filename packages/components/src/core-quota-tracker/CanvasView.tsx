import type { ComponentViewProps } from "@ai-workflow-kit/component-sdk";

import {
  deriveManualQuotaRuntimeState,
  parseQuotaRuntimeState,
  type QuotaLevel,
} from "./runtimeState";
import type { QuotaTrackerConfig } from "./schema";

const levelLabels = {
  normal: "正常",
  warning: "警告",
  critical: "严重",
  unknown: "未知",
} as const;

const levelColors = {
  normal: "#15803d",
  warning: "#111111",
  critical: "#dc2626",
  unknown: "#8a8f88",
} as const;

function formatQuotaValue(value: number | undefined, unitLabel: string): string {
  if (typeof value !== "number") return "--";
  return `${new Intl.NumberFormat().format(Math.round(value * 100) / 100)} ${unitLabel}`;
}

function formatPercent(value: number | undefined): string {
  return typeof value === "number" ? `${Math.round(value)}%` : "--";
}

function formatLastLoaded(value: string | undefined): string {
  if (!value) return "未加载";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProgressWidth(percentUsed: number | undefined): string {
  if (typeof percentUsed !== "number" || !Number.isFinite(percentUsed)) {
    return "0%";
  }

  return `${Math.max(0, Math.min(100, percentUsed))}%`;
}

function resolveDisplayState(
  config: QuotaTrackerConfig,
  runtimeState: unknown,
) {
  if (config.sourceMode === "manual") {
    return deriveManualQuotaRuntimeState(config);
  }

  return parseQuotaRuntimeState(runtimeState);
}

export function CanvasView({
  config,
  invokeAction,
  runtimeState,
}: ComponentViewProps<QuotaTrackerConfig>) {
  const state = resolveDisplayState(config, runtimeState);
  const level = state.level as QuotaLevel;
  const color = levelColors[level];

  return (
    <section
      aria-label={`${config.label} 额度追踪`}
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
          {levelLabels[level]}
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
          已用
        </dt>
        <dd style={{ fontSize: 12, margin: 0 }}>
          {formatQuotaValue(state.current, config.unitLabel)} /{" "}
          {formatQuotaValue(state.limit, config.unitLabel)}
        </dd>
        <dt style={{ color: "#84847d", fontSize: 11 }}>
          剩余
        </dt>
        <dd style={{ fontSize: 12, margin: 0 }}>
          {formatQuotaValue(state.remaining, config.unitLabel)}
        </dd>
      </dl>

      <div
        aria-label={`额度已用 ${formatPercent(state.percentUsed)}`}
        style={{ display: "grid", gap: 5 }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 8,
          }}
        >
          <div
            style={{
              background: "#d8d8d2",
              borderRadius: 999,
              flex: "1 1 auto",
              height: 8,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                background: color,
                display: "block",
                height: "100%",
                width: getProgressWidth(state.percentUsed),
              }}
            />
          </div>
          <span
            style={{
              color: "#2f2f2c",
              flex: "0 0 auto",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {formatPercent(state.percentUsed)}
          </span>
        </div>
      </div>

      <dl
        style={{
          display: "grid",
          gap: 6,
          gridTemplateColumns: "max-content minmax(0, 1fr)",
          margin: 0,
        }}
      >
        <dt style={{ color: "#84847d", fontSize: 11 }}>
          来源
        </dt>
        <dd
          title={config.sourceMode === "file" ? config.filePath : "手动"}
          style={{
            fontSize: 12,
            margin: 0,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {config.sourceMode === "file" ? config.filePath || "文件" : "手动"}
        </dd>
        {config.sourceMode === "file" ? (
          <>
            <dt style={{ color: "#84847d", fontSize: 11 }}>
              已加载
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
              {formatLastLoaded(state.lastLoadedAt)}
            </dd>
          </>
        ) : null}
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

      {config.sourceMode === "file" ? (
        <footer style={{ marginTop: "auto" }}>
          <button
            type="button"
            onClick={() => {
              void invokeAction("refreshQuota");
            }}
            style={{
              background: "rgba(17, 17, 17, 0.07)",
              border: "1px solid rgba(17, 17, 17, 0.28)",
              borderRadius: 6,
              color: "#171717",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 9px",
            }}
          >
            刷新
          </button>
        </footer>
      ) : null}
    </section>
  );
}
