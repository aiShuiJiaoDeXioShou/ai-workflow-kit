import { describe, expect, it } from "vitest";

import {
  createAgentAdapterRegistry,
  createAgentRunOutputEvent,
  defineAgentAdapter,
  localEchoAdapter,
  parseAgentAdapterArgs,
  safeParseAgentAdapterArgs,
  validateAgentAdapter,
  type AgentAdapter,
} from "./index";

describe("agent adapter model", () => {
  it("defines a valid built-in local echo adapter", () => {
    expect(validateAgentAdapter(localEchoAdapter)).toEqual({
      valid: true,
      issues: [],
    });
    expect(localEchoAdapter.id).toBe("local.echo");
    expect(localEchoAdapter.cwdPolicy).toBe("workspace");
  });

  it("validates structured args with schema defaults", () => {
    expect(parseAgentAdapterArgs(localEchoAdapter, {})).toEqual({
      message: "AI Workflow Kit",
      repeat: 1,
    });

    expect(
      safeParseAgentAdapterArgs(localEchoAdapter, {
        message: "hello",
        repeat: 2,
      }).success,
    ).toBe(true);

    expect(
      safeParseAgentAdapterArgs(localEchoAdapter, {
        message: "hello",
        repeat: 99,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid adapter definitions", () => {
    const invalidAdapter = {
      ...localEchoAdapter,
      id: "bad",
      command: "",
      envAllowlist: ["lowercase"],
    } satisfies AgentAdapter;

    const result = validateAgentAdapter(invalidAdapter);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual([
      "id",
      "command",
      "envAllowlist.0",
    ]);
  });

  it("rejects missing title, invalid cwd policy, and non-Zod arg schemas", () => {
    const invalidAdapter = {
      ...localEchoAdapter,
      title: "",
      argsSchema: { type: "object" },
      cwdPolicy: "shell",
    } as unknown as AgentAdapter;

    const result = validateAgentAdapter(invalidAdapter);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual([
      "title",
      "cwdPolicy",
      "argsSchema",
    ]);
  });

  it("creates a stable allowlisted registry", () => {
    const registry = createAgentAdapterRegistry([localEchoAdapter]);

    expect(registry.adapters).toEqual([localEchoAdapter]);
    expect(registry.has("local.echo")).toBe(true);
    expect(registry.getById("local.echo")).toBe(localEchoAdapter);
    expect(registry.parseArgs("local.echo", {})).toEqual({
      message: "AI Workflow Kit",
      repeat: 1,
    });
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.adapters)).toBe(true);
    expect(() => registry.getRequired("missing.adapter")).toThrow(
      /unknown adapter id/,
    );
    expect(() => registry.parseArgs("missing.adapter", {})).toThrow(
      /unknown adapter id/,
    );
  });

  it("fails fast on duplicate adapter ids", () => {
    const duplicateAdapter = defineAgentAdapter({
      ...localEchoAdapter,
      title: "Duplicate Echo",
    });

    expect(() =>
      createAgentAdapterRegistry([localEchoAdapter, duplicateAdapter]),
    ).toThrow(/duplicate adapter id/);
  });

  it("creates stdout and stderr runtime events", () => {
    expect(
      createAgentRunOutputEvent("stdout", {
        runId: "run_123",
        line: "ready",
        timestamp: "2026-06-23T09:30:00.000Z",
      }),
    ).toEqual({
      type: "agent_run_stdout",
      runId: "run_123",
      line: "ready",
      timestamp: "2026-06-23T09:30:00.000Z",
    });

    expect(
      createAgentRunOutputEvent("stderr", {
        runId: "run_123",
        line: "warn",
        timestamp: "2026-06-23T09:30:01.000Z",
      }).type,
    ).toBe("agent_run_stderr");
  });
});
