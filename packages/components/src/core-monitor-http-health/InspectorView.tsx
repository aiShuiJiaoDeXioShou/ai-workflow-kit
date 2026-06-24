import type { ComponentInspectorProps } from "@ai-workflow-kit/component-sdk";

import {
  httpHealthMethods,
  type HttpHealthMethod,
  type HttpHealthMonitorConfig,
} from "./schema";

function parseIntegerInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fieldStyle() {
  return {
    display: "grid",
    gap: 5,
  };
}

function labelStyle() {
  return {
    color: "#6f6f68",
    fontSize: 12,
    fontWeight: 700,
  };
}

function controlStyle() {
  return {
    background: "#f7f7f5",
    border: "1px solid #d8d8d2",
    borderRadius: 6,
    boxSizing: "border-box" as const,
    color: "#171717",
    font: "inherit",
    minWidth: 0,
    padding: "7px 8px",
    width: "100%",
  };
}

export function InspectorView({
  config,
  invokeAction,
  updateConfig,
  validationErrors,
}: ComponentInspectorProps<HttpHealthMonitorConfig>) {
  function updateField<TKey extends keyof HttpHealthMonitorConfig>(
    field: TKey,
    value: HttpHealthMonitorConfig[TKey],
  ) {
    updateConfig({
      ...config,
      [field]: value,
    });
  }

  return (
    <section
      aria-label="HTTP 健康检查配置"
      style={{ display: "grid", gap: 12 }}
    >
      <label style={fieldStyle()}>
        <span style={labelStyle()}>名称</span>
        <input
          type="text"
          value={config.label}
          onChange={(event) => updateField("label", event.currentTarget.value)}
          style={controlStyle()}
        />
      </label>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>URL</span>
        <input
          type="url"
          value={config.url}
          onChange={(event) => updateField("url", event.currentTarget.value)}
          style={controlStyle()}
        />
      </label>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>方法</span>
        <select
          value={config.method}
          onChange={(event) =>
            updateField("method", event.currentTarget.value as HttpHealthMethod)
          }
          style={controlStyle()}
        >
          {httpHealthMethods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </label>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <label style={fieldStyle()}>
          <span style={labelStyle()}>期望状态码</span>
          <input
            type="number"
            min={100}
            max={599}
            value={config.expectedStatus}
            onChange={(event) =>
              updateField(
                "expectedStatus",
                parseIntegerInput(
                  event.currentTarget.value,
                  config.expectedStatus,
                ),
              )
            }
            style={controlStyle()}
          />
        </label>

        <label style={fieldStyle()}>
          <span style={labelStyle()}>检测间隔秒数</span>
          <input
            type="number"
            min={5}
            value={config.intervalSeconds}
            onChange={(event) =>
              updateField(
                "intervalSeconds",
                parseIntegerInput(
                  event.currentTarget.value,
                  config.intervalSeconds,
                ),
              )
            }
            style={controlStyle()}
          />
        </label>
      </div>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>超时时间毫秒</span>
        <input
          type="number"
          min={100}
          value={config.timeoutMs}
          onChange={(event) =>
            updateField(
              "timeoutMs",
              parseIntegerInput(event.currentTarget.value, config.timeoutMs),
            )
          }
          style={controlStyle()}
        />
      </label>

      <label
        style={{
          alignItems: "center",
          color: "#171717",
          display: "flex",
          gap: 8,
          fontSize: 13,
        }}
      >
        <input
          type="checkbox"
          checked={config.showLatency}
          onChange={(event) =>
            updateField("showLatency", event.currentTarget.checked)
          }
        />
        <span>在画布显示延迟</span>
      </label>

      {validationErrors.length > 0 ? (
        <div
          role="status"
          style={{
            background: "rgba(220, 38, 38, 0.10)",
            border: "1px solid rgba(220, 38, 38, 0.32)",
            borderRadius: 6,
            color: "#dc2626",
            display: "grid",
            gap: 5,
            padding: 8,
          }}
        >
          {validationErrors.map((error) => (
            <div key={`${error.path}:${error.message}`}>
              <strong>{error.path}</strong>: {error.message}
            </div>
          ))}
        </div>
      ) : null}

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
          font: "inherit",
          fontWeight: 700,
          padding: "8px 10px",
        }}
      >
        立即检测
      </button>
    </section>
  );
}
