-- v1 本地持久化基础表。业务写入必须通过 Rust 后端 command，不向前端暴露通用 SQL。

CREATE TABLE canvases (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE canvas_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    document_json TEXT NOT NULL CHECK (json_valid(document_json)),
    session_json TEXT NOT NULL CHECK (json_valid(session_json)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_canvas_snapshots_canvas_created_at
ON canvas_snapshots(canvas_id, created_at DESC);

CREATE TABLE component_instances (
    id TEXT PRIMARY KEY NOT NULL,
    canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    component_type TEXT NOT NULL CHECK (length(trim(component_type)) > 0),
    config_json TEXT NOT NULL CHECK (json_valid(config_json)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_component_instances_canvas_id
ON component_instances(canvas_id);

CREATE TABLE component_runtime_state (
    component_instance_id TEXT PRIMARY KEY NOT NULL
        REFERENCES component_instances(id) ON DELETE CASCADE,
    state_json TEXT NOT NULL CHECK (json_valid(state_json)),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE agent_adapters (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    command TEXT NOT NULL CHECK (length(trim(command)) > 0),
    args_schema_json TEXT NOT NULL DEFAULT ('{}') CHECK (json_valid(args_schema_json)),
    env_allowlist_json TEXT NOT NULL DEFAULT ('[]') CHECK (json_valid(env_allowlist_json)),
    cwd_policy TEXT NOT NULL CHECK (cwd_policy IN ('workspace', 'fixed', 'selectable')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE agent_runs (
    id TEXT PRIMARY KEY NOT NULL,
    adapter_id TEXT NOT NULL REFERENCES agent_adapters(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'stopped')),
    cwd TEXT NOT NULL,
    args_json TEXT NOT NULL DEFAULT ('{}') CHECK (json_valid(args_json)),
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ended_at TEXT,
    exit_code INTEGER
);

CREATE INDEX idx_agent_runs_adapter_started_at
ON agent_runs(adapter_id, started_at DESC);

CREATE TABLE agent_run_logs (
    id TEXT PRIMARY KEY NOT NULL,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    stream TEXT NOT NULL CHECK (stream IN ('stdout', 'stderr')),
    line TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_agent_run_logs_run_created_at
ON agent_run_logs(run_id, created_at);
