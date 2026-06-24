import type { ComponentInspectorProps } from "@ai-workflow-kit/component-sdk";
import { useEffect, useState } from "react";

import {
  agentLauncherArgsSchema,
  agentLauncherCwdModes,
  type AgentLauncherConfig,
  type AgentLauncherCwdMode,
} from "./schema";

const cwdModeLabels: Record<AgentLauncherCwdMode, string> = {
  fixed: "固定路径",
  selectable: "可选择",
  workspace: "工作区",
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

function formatArgs(args: AgentLauncherConfig["args"]): string {
  return JSON.stringify(args, null, 2);
}

export function InspectorView({
  config,
  invokeAction,
  updateConfig,
  validationErrors,
}: ComponentInspectorProps<AgentLauncherConfig>) {
  const [argsText, setArgsText] = useState(() => formatArgs(config.args));
  const [argsError, setArgsError] = useState<string | undefined>();

  useEffect(() => {
    setArgsText(formatArgs(config.args));
    setArgsError(undefined);
  }, [config.args]);

  function updateField<TKey extends keyof AgentLauncherConfig>(
    field: TKey,
    value: AgentLauncherConfig[TKey],
  ) {
    updateConfig({
      ...config,
      [field]: value,
    });
  }

  function updateArgs(nextText: string) {
    setArgsText(nextText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(nextText);
    } catch {
      setArgsError("Args 必须是合法 JSON");
      return;
    }

    const result = agentLauncherArgsSchema.safeParse(parsed);
    if (!result.success) {
      setArgsError(
        "Args 必须是 string、number 或 boolean 值组成的对象",
      );
      return;
    }

    setArgsError(undefined);
    updateField("args", result.data);
  }

  return (
    <section
      aria-label="Agent 启动器配置"
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
        <span style={labelStyle()}>Adapter id</span>
        <input
          type="text"
          value={config.adapterId}
          onChange={(event) =>
            updateField("adapterId", event.currentTarget.value)
          }
          style={controlStyle()}
        />
      </label>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>工作目录模式</span>
        <select
          value={config.cwdMode}
          onChange={(event) =>
            updateField(
              "cwdMode",
              event.currentTarget.value as AgentLauncherCwdMode,
            )
          }
          style={controlStyle()}
        >
          {agentLauncherCwdModes.map((cwdMode) => (
            <option key={cwdMode} value={cwdMode}>
              {cwdModeLabels[cwdMode]}
            </option>
          ))}
        </select>
      </label>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>工作目录</span>
        <input
          type="text"
          value={config.cwd}
          onChange={(event) => updateField("cwd", event.currentTarget.value)}
          style={controlStyle()}
        />
      </label>

      <label style={fieldStyle()}>
        <span style={labelStyle()}>结构化 args</span>
        <textarea
          value={argsText}
          onChange={(event) => updateArgs(event.currentTarget.value)}
          spellCheck={false}
          style={{
            ...controlStyle(),
            fontFamily: "JetBrains Mono, monospace",
            minHeight: 92,
            resize: "vertical",
          }}
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
          checked={config.showRecentLogs}
          onChange={(event) =>
            updateField("showRecentLogs", event.currentTarget.checked)
          }
        />
        <span>在画布显示最近日志</span>
      </label>

      {argsError ? (
        <div
          role="status"
          style={{
            background: "rgba(220, 38, 38, 0.10)",
            border: "1px solid rgba(220, 38, 38, 0.32)",
            borderRadius: 6,
            color: "#dc2626",
            padding: 8,
          }}
        >
          {argsError}
        </div>
      ) : null}

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

      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <button
          type="button"
          onClick={() => {
            void invokeAction("startRun");
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
          启动运行
        </button>
        <button
          type="button"
          onClick={() => {
            void invokeAction("stopRun");
          }}
          style={{
            background: "rgba(220, 38, 38, 0.10)",
            border: "1px solid rgba(220, 38, 38, 0.32)",
            borderRadius: 6,
            color: "#171717",
            cursor: "pointer",
            font: "inherit",
            fontWeight: 700,
            padding: "8px 10px",
          }}
        >
          停止运行
        </button>
      </div>
    </section>
  );
}
