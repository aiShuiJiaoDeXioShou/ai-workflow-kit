import type { ComponentInspectorProps } from "@ai-workflow-kit/component-sdk";

import {
  quotaSourceModes,
  type QuotaSourceMode,
  type QuotaTrackerConfig,
} from "./schema";

const sourceModeLabels: Record<QuotaSourceMode, string> = {
  file: "文件",
  manual: "手动",
};

function parseNumberInput(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
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
}: ComponentInspectorProps<QuotaTrackerConfig>) {
  function updateField<TKey extends keyof QuotaTrackerConfig>(
    field: TKey,
    value: QuotaTrackerConfig[TKey],
  ) {
    updateConfig({
      ...config,
      [field]: value,
    });
  }

  function updateJsonMapping(
    field: keyof QuotaTrackerConfig["jsonMapping"],
    value: string,
  ) {
    updateConfig({
      ...config,
      jsonMapping: {
        ...config.jsonMapping,
        [field]: value,
      },
    });
  }

  const canRefresh = config.sourceMode === "file";

  return (
    <section
      aria-label="额度追踪配置"
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
        <span style={labelStyle()}>来源模式</span>
        <select
          value={config.sourceMode}
          onChange={(event) =>
            updateField(
              "sourceMode",
              event.currentTarget.value as QuotaSourceMode,
            )
          }
          style={controlStyle()}
        >
          {quotaSourceModes.map((sourceMode) => (
            <option key={sourceMode} value={sourceMode}>
              {sourceModeLabels[sourceMode]}
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
          <span style={labelStyle()}>手动当前值</span>
          <input
            type="number"
            min={0}
            value={config.manualCurrent}
            onChange={(event) =>
              updateField(
                "manualCurrent",
                parseNumberInput(
                  event.currentTarget.value,
                  config.manualCurrent,
                ),
              )
            }
            style={controlStyle()}
          />
        </label>

        <label style={fieldStyle()}>
          <span style={labelStyle()}>手动上限</span>
          <input
            type="number"
            min={0}
            value={config.manualLimit}
            onChange={(event) =>
              updateField(
                "manualLimit",
                parseNumberInput(event.currentTarget.value, config.manualLimit),
              )
            }
            style={controlStyle()}
          />
        </label>
      </div>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>文件路径</span>
        <input
          type="text"
          value={config.filePath}
          onChange={(event) => updateField("filePath", event.currentTarget.value)}
          style={controlStyle()}
        />
      </label>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <label style={fieldStyle()}>
          <span style={labelStyle()}>当前值路径</span>
          <input
            type="text"
            value={config.jsonMapping.currentPath}
            onChange={(event) =>
              updateJsonMapping("currentPath", event.currentTarget.value)
            }
            style={controlStyle()}
          />
        </label>

        <label style={fieldStyle()}>
          <span style={labelStyle()}>上限路径</span>
          <input
            type="text"
            value={config.jsonMapping.limitPath}
            onChange={(event) =>
              updateJsonMapping("limitPath", event.currentTarget.value)
            }
            style={controlStyle()}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <label style={fieldStyle()}>
          <span style={labelStyle()}>警告百分比</span>
          <input
            type="number"
            min={0}
            max={100}
            value={config.warningThresholdPercent}
            onChange={(event) =>
              updateField(
                "warningThresholdPercent",
                parseNumberInput(
                  event.currentTarget.value,
                  config.warningThresholdPercent,
                ),
              )
            }
            style={controlStyle()}
          />
        </label>

        <label style={fieldStyle()}>
          <span style={labelStyle()}>严重百分比</span>
          <input
            type="number"
            min={0}
            max={100}
            value={config.criticalThresholdPercent}
            onChange={(event) =>
              updateField(
                "criticalThresholdPercent",
                parseNumberInput(
                  event.currentTarget.value,
                  config.criticalThresholdPercent,
                ),
              )
            }
            style={controlStyle()}
          />
        </label>
      </div>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>单位名称</span>
        <input
          type="text"
          value={config.unitLabel}
          onChange={(event) =>
            updateField("unitLabel", event.currentTarget.value)
          }
          style={controlStyle()}
        />
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
        disabled={!canRefresh}
        onClick={() => {
          if (canRefresh) {
            void invokeAction("refreshQuota");
          }
        }}
        style={{
          background: canRefresh
            ? "rgba(17, 17, 17, 0.07)"
            : "#f7f7f5",
          border: canRefresh
            ? "1px solid rgba(17, 17, 17, 0.28)"
            : "1px solid #d8d8d2",
          borderRadius: 6,
          color: canRefresh ? "#171717" : "#b2b2aa",
          cursor: canRefresh ? "pointer" : "not-allowed",
          font: "inherit",
          fontWeight: 700,
          padding: "8px 10px",
        }}
      >
        刷新额度
      </button>
    </section>
  );
}
