import type { ComponentViewProps } from "@ai-workflow-kit/component-sdk";

import type { CanvasNoteAccent, CanvasNoteConfig } from "./schema";

const accentColors: Record<CanvasNoteAccent, string> = {
  neutral: "#8a8f88",
  brass: "#111111",
  green: "#15803d",
  vermillion: "#dc2626",
};

function previewLines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function CanvasView({ config }: ComponentViewProps<CanvasNoteConfig>) {
  const color = accentColors[config.accent];
  const lines = previewLines(config.body);

  return (
    <section
      aria-label={`${config.title} 画布便签`}
      style={{
        boxSizing: "border-box",
        display: "grid",
        gap: 10,
        gridTemplateRows: config.showTitle ? "auto minmax(0, 1fr)" : "minmax(0, 1fr)",
        height: "100%",
        overflow: "hidden",
        padding: 12,
        width: "100%",
      }}
    >
      {config.showTitle ? (
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
            {config.title}
          </strong>
        </header>
      ) : null}

      <div
        style={{
          borderLeft: `3px solid ${color}`,
          color: "#2f2f2c",
          display: "grid",
          fontSize: 12,
          gap: 5,
          lineHeight: 1.35,
          minHeight: 0,
          overflow: "hidden",
          paddingLeft: 9,
        }}
      >
        {lines.map((line, index) => (
          <p
            key={`${index}-${line}`}
            style={{
              margin: 0,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
