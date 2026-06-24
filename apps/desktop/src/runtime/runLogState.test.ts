import { describe, expect, it } from "vitest";

import { initialRunLogState, runLogReducer } from "./runLogState";

describe("run log state", () => {
  it("tracks started runs and output lines", () => {
    const started = runLogReducer(initialRunLogState, {
      type: "started",
      payload: {
        adapterId: "local.echo",
        runId: "run-1",
        timestamp: "2026-06-23T09:30:00.000Z",
      },
    });
    const withOutput = runLogReducer(started, {
      type: "output",
      stream: "stdout",
      payload: {
        runId: "run-1",
        line: "ready",
        timestamp: "2026-06-23T09:30:01.000Z",
      },
    });

    expect(withOutput.activeRunId).toBe("run-1");
    expect(withOutput.runs["run-1"]).toMatchObject({
      adapterId: "local.echo",
      status: "running",
    });
    expect(withOutput.entries.map((entry) => entry.stream)).toEqual([
      "status",
      "stdout",
    ]);
    expect(withOutput.entries[0].line).toBe("Agent 已启动：local.echo");
  });

  it("records final status and exit code", () => {
    const started = runLogReducer(initialRunLogState, {
      type: "started",
      payload: {
        adapterId: "local.echo",
        runId: "run-1",
        timestamp: "2026-06-23T09:30:00.000Z",
      },
    });
    const exited = runLogReducer(started, {
      type: "exit",
      payload: {
        runId: "run-1",
        status: "succeeded",
        exitCode: 0,
        timestamp: "2026-06-23T09:30:02.000Z",
      },
    });

    expect(exited.runs["run-1"]).toMatchObject({
      status: "succeeded",
      exitCode: 0,
      endedAt: "2026-06-23T09:30:02.000Z",
    });
    expect(exited.entries.at(-1)?.line).toBe("退出成功 (0)");
  });

  it("records component action lifecycle entries", () => {
    const started = runLogReducer(initialRunLogState, {
      type: "component_action_started",
      payload: {
        actionId: "checkNow",
        componentType: "core.monitor.http-health",
        instanceId: "component-1",
        line: "开始 HTTP 检测：https://example.com/health",
        runId: "component-run-1",
        source: "manual",
        timestamp: "2026-06-23T09:30:00.000Z",
      },
    });
    const succeeded = runLogReducer(started, {
      type: "component_action_succeeded",
      payload: {
        line: "HTTP 检测正常：200，42 ms",
        runId: "component-run-1",
        timestamp: "2026-06-23T09:30:01.000Z",
      },
    });

    expect(succeeded.activeRunId).toBe("component-run-1");
    expect(succeeded.runs["component-run-1"]).toMatchObject({
      actionId: "checkNow",
      componentType: "core.monitor.http-health",
      instanceId: "component-1",
      source: "component",
      status: "succeeded",
    });
    expect(succeeded.entries.map((entry) => entry.line)).toEqual([
      "手动开始 HTTP 检测：https://example.com/health",
      "HTTP 检测正常：200，42 ms",
    ]);
  });

  it("records interval component action failures as stderr", () => {
    const started = runLogReducer(initialRunLogState, {
      type: "component_action_started",
      payload: {
        actionId: "checkNow",
        componentType: "core.monitor.http-health",
        instanceId: "component-1",
        line: "开始 HTTP 检测：https://example.com/health",
        runId: "component-run-2",
        source: "interval",
        timestamp: "2026-06-23T09:30:00.000Z",
      },
    });
    const failed = runLogReducer(started, {
      type: "component_action_failed",
      payload: {
        line: "HTTP 检测异常：期望 200，实际 500",
        runId: "component-run-2",
        timestamp: "2026-06-23T09:30:01.000Z",
      },
    });

    expect(failed.runs["component-run-2"].status).toBe("failed");
    expect(failed.entries.at(0)?.line).toBe(
      "自动开始 HTTP 检测：https://example.com/health",
    );
    expect(failed.entries.at(-1)?.stream).toBe("stderr");
  });

  it("limits retained log entries", () => {
    let state = runLogReducer(initialRunLogState, {
      type: "started",
      payload: {
        adapterId: "local.echo",
        runId: "run-1",
        timestamp: "2026-06-23T09:30:00.000Z",
      },
    });

    for (let index = 0; index < 220; index += 1) {
      state = runLogReducer(state, {
        type: "output",
        stream: "stdout",
        payload: {
          runId: "run-1",
          line: `line-${index}`,
          timestamp: `2026-06-23T09:30:${index}.000Z`,
        },
      });
    }

    expect(state.entries).toHaveLength(200);
    expect(state.entries[0].line).toBe("line-20");
  });

  it("clears the drawer state", () => {
    const started = runLogReducer(initialRunLogState, {
      type: "started",
      payload: {
        adapterId: "local.echo",
        runId: "run-1",
        timestamp: "2026-06-23T09:30:00.000Z",
      },
    });

    expect(runLogReducer(started, { type: "clear" })).toEqual(
      initialRunLogState,
    );
  });
});
