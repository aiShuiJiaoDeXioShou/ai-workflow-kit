# Persistence

## Purpose

Persistence stores local canvas documents, component instances, runtime state, agent runs, and logs. The app is local-first and should work without network access.

## Storage Choice

Use SQLite through the Tauri backend. The frontend should not write SQLite directly.

## Minimum Tables

```txt
canvases
canvas_snapshots
component_instances
component_runtime_state
agent_adapters
agent_runs
agent_run_logs
```

## Table Responsibilities

### `canvases`

Stores canvas identity and metadata:

- id
- title
- created_at
- updated_at

### `canvas_snapshots`

Stores FlowGram canvas state:

- id
- canvas_id
- document_json
- session_json
- created_at

Document and session must be stored separately in the row or as separate columns. The document represents durable canvas content. The session represents camera, viewport, selection, or other restorable UI state.

### `component_instances`

Stores component config:

- id
- canvas_id
- component_type
- config_json
- created_at
- updated_at

Config must be JSON-serializable and must not include plaintext secrets.

Zod schemas are never persisted. Only config values that have passed the component's Zod schema are written to `config_json`.

### `component_runtime_state`

Stores non-authoritative runtime state:

- component_instance_id
- state_json
- updated_at

Runtime state can be regenerated or replaced by future runs.

### `agent_adapters`

Stores allowlisted adapter definitions if adapters are user-editable. If adapters are static in v1, this table may be introduced later by the persistence task.

### `agent_runs`

Stores run metadata:

- id
- adapter_id
- status
- cwd
- args_json
- started_at
- ended_at
- exit_code

### `agent_run_logs`

Stores streamed process output:

- id
- run_id
- stream
- line
- created_at

`stream` must be either `stdout` or `stderr`.

## Save Strategy

Canvas save should be debounced or explicit. V1 may begin with explicit save if it simplifies correctness, but autosave should be easy to add.

On save:

1. validate canvas id
2. ensure the default `root` canvas exists before writing a root snapshot
3. persist component config changes
4. persist FlowGram document snapshot
5. persist FlowGram session state
6. update canvas `updated_at`

## Failure Behavior

Persistence failure must not crash the canvas. The UI should show a recoverable error and keep current in-memory state.

If partial failure occurs:

- do not delete existing snapshots
- do not remove component instances
- surface enough detail for debugging
- allow retry

## Component Runtime Writes

Declared actions may update runtime state through app/runtime services:

- `monitor.http.check` writes latest HTTP check status and compact history.
- `quota.file.refresh` writes loaded quota values and refresh errors.
- `agent.adapter.start` and `agent.adapter.stop` write run status references and recent log summaries.

Runtime state must stay replaceable. It is not the source of truth for component config.

## Quota File Source

Quota file refresh must read only the configured, user-approved local file path. It must not introduce broad filesystem access to component code.

If Tauri filesystem permissions become necessary, they must be scoped by a dedicated task and documented in `rules/security.md` or a follow-up spec before implementation.

## Migrations

Schema migrations must be versioned and run through the Tauri backend. A migration task must include validation with a fresh database and an existing database fixture when fixtures exist.
