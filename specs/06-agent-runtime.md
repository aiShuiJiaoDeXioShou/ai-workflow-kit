# Agent Runtime

## Purpose

The agent runtime gives the desktop app a safe way to start, stop, observe, and persist local CLI or agent processes. It is the foundation for future Codex, clawdbot, and harness adapters.

## Adapter Contract

```ts
type AgentAdapter = {
  id: string
  title: string
  command: string
  argsSchema: unknown
  cwdPolicy: 'workspace' | 'fixed' | 'selectable'
  envAllowlist: string[]
}
```

`argsSchema` is consumed by the app/runtime boundary. If authored in TypeScript, it should be a Zod schema in source. Only validated args JSON is passed to the Tauri backend.

## Execution Rules

- Only registered adapters can be executed.
- UI may pass structured args, not arbitrary shell strings.
- Args must be validated before execution.
- Environment variables must be filtered by `envAllowlist`.
- Working directory must obey `cwdPolicy`.
- `fixed` and `selectable` working directories must exist, be directories, and be canonicalized before process spawn.
- stdout and stderr must stream separately.
- stop must terminate a still-running process.

## Run Lifecycle

Allowed run statuses:

- `queued`
- `running`
- `succeeded`
- `failed`
- `stopped`

Lifecycle:

1. create run record
2. emit `agent_run_started`
3. spawn process through Tauri backend
4. stream stdout and stderr events
5. append logs to persistence
6. capture exit code
7. emit `agent_run_exit`
8. update final run status

## Runtime Events

```txt
agent_run_started
agent_run_stdout
agent_run_stderr
agent_run_exit
```

Event payloads must include `runId`. Output events must include stream content and timestamp.

## Agent Launcher Mapping

The Agent adapter launcher component declares:

- `agent.adapter.start`
- `agent.adapter.stop`

The app/runtime dispatcher maps these actions to `start_agent_run` and `stop_agent_run`. The component itself must not spawn processes, call Tauri commands, or format shell strings.

## Stop Behavior

Stopping a run should:

- find the process by `runId`
- send a termination signal
- update status to `stopped` if termination succeeds
- preserve logs already written
- emit a final exit event or stopped event

If the process already exited, stop should be idempotent and return the current final state.

## Security Constraints

Do not expose a generic shell execution command to the frontend. All process execution must go through adapter lookup and validation.

Secrets should not be passed through component config. Later versions may use OS keychain or Tauri Stronghold.

## V1 Built-In Adapter

The first adapter should support the Agent adapter launcher component and remain harmless by default. It may wrap a simple allowlisted local command only for runtime validation, but it must be modeled as a real adapter entry with structured args, cwd policy, stdout/stderr streaming, and stop behavior.

This adapter is a runtime validation target, not a canvas example component.

## Codex Local Adapter

Adapter id:

```txt
codex.local
```

Purpose:

Run the local Codex CLI through `codex exec` as an allowlisted adapter. This is the first real Agent adapter and is intended for repository-scoped work such as inspection, planning, implementation, and later deployment wrappers.

Command resolution:

- Prefer the Codex desktop bundled CLI at `/Applications/Codex.app/Contents/Resources/codex` when present.
- Fall back to `codex` so developer environments with a CLI on PATH can still run.

CWD policy:

```txt
selectable
```

The Agent Launcher must provide a repository working directory when using this adapter.

Structured args:

```ts
type CodexLocalArgs = {
  prompt: string
  model?: string
  sandbox?: 'read-only' | 'workspace-write'
  json?: boolean
  ephemeral?: boolean
  skipGitRepoCheck?: boolean
}
```

Runtime mapping:

```txt
codex exec --color never --sandbox <sandbox> [--json] [--model <model>] [--ephemeral] [--skip-git-repo-check] -- <prompt>
```

Defaults:

- `sandbox`: `workspace-write`
- `json`: `false`
- `ephemeral`: `false`
- `skipGitRepoCheck`: `false`

Security constraints:

- Do not expose arbitrary `codex` subcommands through this adapter.
- Do not support `danger-full-access` from component config.
- Do not pass arbitrary shell strings.
- Do not store secrets in component config.
- Environment forwarding remains allowlisted by the Rust backend.
