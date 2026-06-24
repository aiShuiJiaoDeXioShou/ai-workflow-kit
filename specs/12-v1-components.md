# V1 First-Party Components

## Purpose

V1 validates the component SDK through real first-party components, not throwaway examples. These components should be useful in the actual AI workflow workbench while keeping security and runtime boundaries small.

Required V1 components:

- HTTP health monitor
- quota tracker
- Agent adapter launcher

## Shared Rules

All first-party components must:

- live under `packages/components/src/<component-type>/`
- use Zod config schemas
- export a manifest that passes SDK validation
- declare actions instead of executing system work directly
- render compactly on the canvas
- expose editable config through an inspector
- save and restore config through component persistence
- tolerate missing runtime state
- avoid plaintext secrets

## HTTP Health Monitor

Component type:

```txt
core.monitor.http-health
```

Purpose:

Monitor whether an HTTP endpoint is reachable and responding within expected latency.

Config fields:

- `label`
- `url`
- `method`
- `expectedStatus`
- `intervalSeconds`
- `timeoutMs`
- `showLatency`

Runtime state:

- `status`: `idle` | `checking` | `up` | `down` | `error`
- `latencyMs`
- `lastCheckedAt`
- `lastError`
- recent result history, kept small

Actions:

- `checkNow`
  - kind: `monitor.http.check`
  - validates current config
  - app/runtime performs the request
  - desktop runtime must send the request through a controlled Tauri backend command, not WebView `fetch`, to avoid CORS false negatives

Scheduling:

- app/runtime automatically runs `checkNow` for canvas instances using `intervalSeconds`
- first valid canvas instance check may run immediately after the node appears or config changes
- manual `checkNow` remains available from the component and inspector
- the component view must not own the timer or perform the request directly

V1 limits:

- no custom auth headers
- no secret tokens
- no scripting
- no multi-step checks

## Quota Tracker

Component type:

```txt
core.quota.tracker
```

Purpose:

Display usage, total quota, remaining quota, and threshold warnings for a manually maintained or file-backed quota source.

Config fields:

- `label`
- `sourceMode`: `manual` | `file`
- `manualCurrent`
- `manualLimit`
- `filePath`
- `jsonMapping`
- `warningThresholdPercent`
- `criticalThresholdPercent`
- `unitLabel`

Runtime state:

- `current`
- `limit`
- `remaining`
- `percentUsed`
- `level`: `normal` | `warning` | `critical` | `unknown`
- `lastLoadedAt`
- `lastError`

Actions:

- `refreshQuota`
  - kind: `quota.file.refresh`
  - only active when `sourceMode` is `file`
  - app/runtime reads the approved local file path

V1 limits:

- no direct OpenAI, Claude, or vendor quota API
- no token storage
- no remote HTTP quota source
- no background file watcher unless a later task adds it explicitly

## Agent Adapter Launcher

Component type:

```txt
core.agent.launcher
```

Purpose:

Start and stop an allowlisted local Agent/CLI adapter and surface the latest run state on the canvas.

Config fields:

- `label`
- `adapterId`
- `args`
- `cwdMode`
- `cwd`
- `showRecentLogs`

Runtime state:

- `runId`
- `status`: `idle` | `queued` | `running` | `succeeded` | `failed` | `stopped`
- `startedAt`
- `endedAt`
- `exitCode`
- `recentStdout`
- `recentStderr`

Actions:

- `startRun`
  - kind: `agent.adapter.start`
  - validates adapter id and structured args
  - runtime starts the allowlisted adapter
- `stopRun`
  - kind: `agent.adapter.stop`
  - runtime stops the active run if still running

V1 limits:

- no multi-turn chat console
- no autonomous session manager
- no arbitrary shell command
- no per-component environment variable editor

## SDK Validation Role

These three components jointly validate:

- config schema and inspector editing
- status rendering on canvas
- declarative action dispatch
- local runtime integration
- persistence and restore
- component registry behavior
- unknown component fallback by contrast with registered real components
