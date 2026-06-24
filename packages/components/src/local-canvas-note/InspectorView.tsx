import type { ComponentInspectorProps } from "@ai-workflow-kit/component-sdk";

import {
  canvasNoteAccentOptions,
  type CanvasNoteAccent,
  type CanvasNoteConfig,
} from "./schema";

const accentLabels: Record<CanvasNoteAccent, string> = {
  brass: "黑色",
  green: "绿色",
  neutral: "中性",
  vermillion: "红色",
};

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
  updateConfig,
  validationErrors,
}: ComponentInspectorProps<CanvasNoteConfig>) {
  function updateField<TKey extends keyof CanvasNoteConfig>(
    field: TKey,
    value: CanvasNoteConfig[TKey],
  ) {
    updateConfig({
      ...config,
      [field]: value,
    });
  }

  return (
    <section
      aria-label="画布便签配置"
      style={{ display: "grid", gap: 12 }}
    >
      <label style={fieldStyle()}>
        <span style={labelStyle()}>标题</span>
        <input
          type="text"
          value={config.title}
          onChange={(event) => updateField("title", event.currentTarget.value)}
          style={controlStyle()}
        />
      </label>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>正文</span>
        <textarea
          value={config.body}
          onChange={(event) => updateField("body", event.currentTarget.value)}
          style={{
            ...controlStyle(),
            minHeight: 120,
            resize: "vertical",
          }}
        />
      </label>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>强调色</span>
        <select
          value={config.accent}
          onChange={(event) =>
            updateField("accent", event.currentTarget.value as CanvasNoteAccent)
          }
          style={controlStyle()}
        >
          {canvasNoteAccentOptions.map((accent) => (
            <option key={accent} value={accent}>
              {accentLabels[accent]}
            </option>
          ))}
        </select>
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
          checked={config.showTitle}
          onChange={(event) =>
            updateField("showTitle", event.currentTarget.checked)
          }
        />
        <span>在画布显示标题</span>
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
    </section>
  );
}
