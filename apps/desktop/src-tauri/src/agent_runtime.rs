use crate::persistence::PersistenceState;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::{
    collections::HashMap,
    path::PathBuf,
    process::Stdio,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, State};
use thiserror::Error;
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, BufReader},
    process::Command,
    sync::{oneshot, Mutex},
};
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum AgentRuntimeError {
    #[error("未知 Agent adapter：{0}")]
    UnknownAdapter(String),
    #[error("未知运行记录：{0}")]
    UnknownRun(String),
    #[error("adapter 参数无效：{0}")]
    InvalidArgs(String),
    #[error("工作目录无效：{0}")]
    InvalidCwd(String),
    #[error("无法启动 adapter 进程：{0}")]
    Spawn(#[source] std::io::Error),
    #[error("SQLite 操作失败：{0}")]
    Database(#[from] sqlx::Error),
    #[error("JSON 序列化失败：{0}")]
    Json(#[from] serde_json::Error),
}

type AgentRuntimeResult<T> = Result<T, AgentRuntimeError>;

// 这些枚举同时是前后端协议值，部分分支会在后续 dispatcher 和 cwd 策略任务中接入。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum AgentRunStatus {
    Queued,
    Running,
    Succeeded,
    Failed,
    Stopped,
}

impl AgentRunStatus {
    fn as_str(self) -> &'static str {
        match self {
            AgentRunStatus::Queued => "queued",
            AgentRunStatus::Running => "running",
            AgentRunStatus::Succeeded => "succeeded",
            AgentRunStatus::Failed => "failed",
            AgentRunStatus::Stopped => "stopped",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum AgentCwdPolicy {
    Workspace,
    Fixed,
    Selectable,
}

impl AgentCwdPolicy {
    fn as_str(self) -> &'static str {
        match self {
            AgentCwdPolicy::Workspace => "workspace",
            AgentCwdPolicy::Fixed => "fixed",
            AgentCwdPolicy::Selectable => "selectable",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AgentAdapterKind {
    LocalEcho,
    CodexExec,
    #[cfg(test)]
    TestStreams,
    #[cfg(test)]
    TestSleep,
}

#[derive(Debug, Clone)]
struct AgentAdapterDefinition {
    id: &'static str,
    title: &'static str,
    command: String,
    cwd_policy: AgentCwdPolicy,
    env_allowlist: &'static [&'static str],
    kind: AgentAdapterKind,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentAdapterInfo {
    pub id: String,
    pub title: String,
    pub command: String,
    pub cwd_policy: AgentCwdPolicy,
    pub env_allowlist: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRunRecord {
    pub id: String,
    pub adapter_id: String,
    pub status: AgentRunStatus,
    pub cwd: String,
    pub args_json: Value,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentRunStartedEvent {
    run_id: String,
    adapter_id: String,
    timestamp: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentRunOutputEvent {
    run_id: String,
    line: String,
    timestamp: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentRunExitEvent {
    run_id: String,
    status: AgentRunStatus,
    exit_code: Option<i32>,
    timestamp: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartAgentRunRequest {
    pub adapter_id: String,
    pub args_json: Value,
    pub cwd: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StopAgentRunRequest {
    pub run_id: String,
}

struct ActiveAgentRun {
    stop_tx: oneshot::Sender<()>,
}

#[derive(Clone)]
pub struct AgentRuntimeState {
    adapters: Arc<HashMap<String, AgentAdapterDefinition>>,
    active_runs: Arc<Mutex<HashMap<String, ActiveAgentRun>>>,
    run_records: Arc<Mutex<HashMap<String, AgentRunRecord>>>,
}

impl Default for AgentRuntimeState {
    fn default() -> Self {
        Self::new(builtin_adapters())
    }
}

impl AgentRuntimeState {
    fn new(adapters: Vec<AgentAdapterDefinition>) -> Self {
        let adapters = adapters
            .into_iter()
            .map(|adapter| (adapter.id.to_owned(), adapter))
            .collect();

        Self {
            adapters: Arc::new(adapters),
            active_runs: Arc::new(Mutex::new(HashMap::new())),
            run_records: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn adapter(&self, adapter_id: &str) -> AgentRuntimeResult<AgentAdapterDefinition> {
        self.adapters
            .get(adapter_id)
            .cloned()
            .ok_or_else(|| AgentRuntimeError::UnknownAdapter(adapter_id.to_owned()))
    }

    async fn run_record(&self, run_id: &str) -> Option<AgentRunRecord> {
        self.run_records.lock().await.get(run_id).cloned()
    }
}

#[tauri::command]
pub async fn start_agent_run(
    app: AppHandle,
    state: State<'_, AgentRuntimeState>,
    persistence: State<'_, PersistenceState>,
    request: StartAgentRunRequest,
) -> Result<AgentRunRecord, String> {
    start_agent_run_internal(Some(app), &state, persistence.pool(), request)
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn stop_agent_run(
    state: State<'_, AgentRuntimeState>,
    persistence: State<'_, PersistenceState>,
    request: StopAgentRunRequest,
) -> Result<AgentRunRecord, String> {
    stop_agent_run_internal(&state, persistence.pool(), request)
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn list_agent_adapters(
    state: State<'_, AgentRuntimeState>,
) -> Result<Vec<AgentAdapterInfo>, String> {
    Ok(state
        .adapters
        .values()
        .map(adapter_info)
        .collect::<Vec<_>>())
}

async fn start_agent_run_internal(
    app: Option<AppHandle>,
    state: &AgentRuntimeState,
    pool: &SqlitePool,
    request: StartAgentRunRequest,
) -> AgentRuntimeResult<AgentRunRecord> {
    let adapter = state.adapter(&request.adapter_id)?;
    let process_args = build_process_args(&adapter, &request.args_json)?;
    let cwd = resolve_cwd(adapter.cwd_policy, request.cwd.as_deref())?;
    let run_id = Uuid::new_v4().to_string();
    let started_at = current_timestamp();
    let record = AgentRunRecord {
        id: run_id.clone(),
        adapter_id: adapter.id.to_owned(),
        status: AgentRunStatus::Running,
        cwd: cwd.to_string_lossy().into_owned(),
        args_json: request.args_json,
        started_at: started_at.clone(),
        ended_at: None,
        exit_code: None,
    };

    persist_agent_run_started(pool, &adapter, &record).await?;

    let mut command = Command::new(&adapter.command);
    command
        .args(process_args)
        .current_dir(&cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env_clear();

    for env_name in adapter.env_allowlist {
        if let Ok(value) = std::env::var(env_name) {
            command.env(env_name, value);
        }
    }

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            let ended_at = current_timestamp();
            let _ = persist_agent_run_finished(
                pool,
                &record.id,
                AgentRunStatus::Failed,
                &ended_at,
                None,
            )
            .await;
            return Err(AgentRuntimeError::Spawn(error));
        }
    };
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let (stop_tx, stop_rx) = oneshot::channel();

    state
        .active_runs
        .lock()
        .await
        .insert(run_id.clone(), ActiveAgentRun { stop_tx });
    state
        .run_records
        .lock()
        .await
        .insert(run_id.clone(), record.clone());

    emit_runtime_event(
        &app,
        "agent_run_started",
        AgentRunStartedEvent {
            run_id: run_id.clone(),
            adapter_id: adapter.id.to_owned(),
            timestamp: started_at,
        },
    );

    if let Some(stdout) = stdout {
        spawn_output_reader(
            app.clone(),
            pool.clone(),
            run_id.clone(),
            AgentRunLogStream::Stdout,
            stdout,
        );
    }
    if let Some(stderr) = stderr {
        spawn_output_reader(
            app.clone(),
            pool.clone(),
            run_id.clone(),
            AgentRunLogStream::Stderr,
            stderr,
        );
    }

    spawn_wait_task(app, state.clone(), pool.clone(), run_id, child, stop_rx);

    Ok(record)
}

async fn stop_agent_run_internal(
    state: &AgentRuntimeState,
    pool: &SqlitePool,
    request: StopAgentRunRequest,
) -> AgentRuntimeResult<AgentRunRecord> {
    let active_run = state.active_runs.lock().await.remove(&request.run_id);

    if let Some(active_run) = active_run {
        let _ = active_run.stop_tx.send(());
        let ended_at = current_timestamp();
        let mut records = state.run_records.lock().await;
        let record = records
            .get_mut(&request.run_id)
            .ok_or_else(|| AgentRuntimeError::UnknownRun(request.run_id.clone()))?;

        record.status = AgentRunStatus::Stopped;
        record.ended_at = Some(ended_at.clone());
        record.exit_code = None;
        let stopped_record = record.clone();
        drop(records);

        persist_agent_run_finished(
            pool,
            &request.run_id,
            AgentRunStatus::Stopped,
            &ended_at,
            None,
        )
        .await?;

        return Ok(stopped_record);
    }

    state
        .run_record(&request.run_id)
        .await
        .ok_or(AgentRuntimeError::UnknownRun(request.run_id))
}

fn spawn_wait_task(
    app: Option<AppHandle>,
    state: AgentRuntimeState,
    pool: SqlitePool,
    run_id: String,
    mut child: tokio::process::Child,
    stop_rx: oneshot::Receiver<()>,
) {
    tokio::spawn(async move {
        let (status, exit_code) = tokio::select! {
            wait_result = child.wait() => status_from_exit(wait_result),
            _ = stop_rx => {
                let _ = child.kill().await;
                let _ = child.wait().await;
                (AgentRunStatus::Stopped, None)
            }
        };
        let ended_at = current_timestamp();

        {
            let mut records = state.run_records.lock().await;
            if let Some(record) = records.get_mut(&run_id) {
                if record.status != AgentRunStatus::Stopped {
                    record.status = status;
                    record.exit_code = exit_code;
                }
                record.ended_at.get_or_insert_with(|| ended_at.clone());
            }
        }

        let _ = persist_agent_run_finished(&pool, &run_id, status, &ended_at, exit_code).await;
        state.active_runs.lock().await.remove(&run_id);

        emit_runtime_event(
            &app,
            "agent_run_exit",
            AgentRunExitEvent {
                run_id,
                status,
                exit_code,
                timestamp: ended_at,
            },
        );
    });
}

fn spawn_output_reader<R>(
    app: Option<AppHandle>,
    pool: SqlitePool,
    run_id: String,
    stream: AgentRunLogStream,
    reader: R,
) where
    R: AsyncRead + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        let mut lines = BufReader::new(reader).lines();

        while let Ok(Some(line)) = lines.next_line().await {
            let timestamp = current_timestamp();
            let _ = persist_agent_run_log(&pool, &run_id, stream, &line, &timestamp).await;
            emit_runtime_event(
                &app,
                stream.event_name(),
                AgentRunOutputEvent {
                    run_id: run_id.clone(),
                    line,
                    timestamp,
                },
            );
        }
    });
}

fn status_from_exit(
    result: std::io::Result<std::process::ExitStatus>,
) -> (AgentRunStatus, Option<i32>) {
    match result {
        Ok(exit_status) if exit_status.success() => (AgentRunStatus::Succeeded, exit_status.code()),
        Ok(exit_status) => (AgentRunStatus::Failed, exit_status.code()),
        Err(_) => (AgentRunStatus::Failed, None),
    }
}

#[derive(Debug, Clone, Copy)]
enum AgentRunLogStream {
    Stdout,
    Stderr,
}

impl AgentRunLogStream {
    fn as_str(self) -> &'static str {
        match self {
            AgentRunLogStream::Stdout => "stdout",
            AgentRunLogStream::Stderr => "stderr",
        }
    }

    fn event_name(self) -> &'static str {
        match self {
            AgentRunLogStream::Stdout => "agent_run_stdout",
            AgentRunLogStream::Stderr => "agent_run_stderr",
        }
    }
}

fn build_process_args(
    adapter: &AgentAdapterDefinition,
    args_json: &Value,
) -> AgentRuntimeResult<Vec<String>> {
    match adapter.kind {
        AgentAdapterKind::LocalEcho => build_local_echo_args(args_json),
        AgentAdapterKind::CodexExec => build_codex_exec_args(args_json),
        #[cfg(test)]
        AgentAdapterKind::TestStreams => build_test_stream_args(),
        #[cfg(test)]
        AgentAdapterKind::TestSleep => build_test_sleep_args(),
    }
}

async fn persist_agent_run_started(
    pool: &SqlitePool,
    adapter: &AgentAdapterDefinition,
    record: &AgentRunRecord,
) -> AgentRuntimeResult<()> {
    let args_schema_json = serde_json::to_string(&adapter_args_schema(adapter.kind))?;
    let args_json = serde_json::to_string(&record.args_json)?;
    let env_allowlist_json = serde_json::to_string(adapter.env_allowlist)?;
    let mut transaction = pool.begin().await?;

    sqlx::query(
        "INSERT INTO agent_adapters
            (id, title, command, args_schema_json, env_allowlist_json, cwd_policy)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            command = excluded.command,
            args_schema_json = excluded.args_schema_json,
            env_allowlist_json = excluded.env_allowlist_json,
            cwd_policy = excluded.cwd_policy,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    )
    .bind(adapter.id)
    .bind(adapter.title)
    .bind(&adapter.command)
    .bind(args_schema_json)
    .bind(env_allowlist_json)
    .bind(adapter.cwd_policy.as_str())
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        "INSERT INTO agent_runs
            (id, adapter_id, status, cwd, args_json, started_at, ended_at, exit_code)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )
    .bind(&record.id)
    .bind(&record.adapter_id)
    .bind(record.status.as_str())
    .bind(&record.cwd)
    .bind(args_json)
    .bind(&record.started_at)
    .bind(&record.ended_at)
    .bind(record.exit_code)
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;

    Ok(())
}

async fn persist_agent_run_log(
    pool: &SqlitePool,
    run_id: &str,
    stream: AgentRunLogStream,
    line: &str,
    created_at: &str,
) -> AgentRuntimeResult<()> {
    sqlx::query(
        "INSERT INTO agent_run_logs (id, run_id, stream, line, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(Uuid::new_v4().to_string())
    .bind(run_id)
    .bind(stream.as_str())
    .bind(line)
    .bind(created_at)
    .execute(pool)
    .await?;

    Ok(())
}

async fn persist_agent_run_finished(
    pool: &SqlitePool,
    run_id: &str,
    status: AgentRunStatus,
    ended_at: &str,
    exit_code: Option<i32>,
) -> AgentRuntimeResult<()> {
    let result = sqlx::query(
        "UPDATE agent_runs
         SET status = ?1, ended_at = ?2, exit_code = ?3
         WHERE id = ?4",
    )
    .bind(status.as_str())
    .bind(ended_at)
    .bind(exit_code)
    .bind(run_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AgentRuntimeError::UnknownRun(run_id.to_owned()));
    }

    Ok(())
}

fn build_local_echo_args(args_json: &Value) -> AgentRuntimeResult<Vec<String>> {
    let args = args_json
        .as_object()
        .ok_or_else(|| AgentRuntimeError::InvalidArgs("argsJson 必须是对象".to_owned()))?;

    for key in args.keys() {
        if key != "message" && key != "repeat" {
            return Err(AgentRuntimeError::InvalidArgs(format!(
                "不支持的参数字段：{key}"
            )));
        }
    }

    let message = match args.get("message") {
        Some(Value::String(value)) if !value.trim().is_empty() && value.len() <= 500 => {
            value.trim().to_owned()
        }
        Some(_) => {
            return Err(AgentRuntimeError::InvalidArgs(
                "message 必须是 1 到 500 字符的字符串".to_owned(),
            ));
        }
        None => "AI Workflow Kit".to_owned(),
    };

    let repeat = match args.get("repeat") {
        Some(Value::Number(value)) => value.as_u64().filter(|value| (1..=5).contains(value)),
        Some(_) => None,
        None => Some(1),
    }
    .ok_or_else(|| AgentRuntimeError::InvalidArgs("repeat 必须是 1 到 5 的整数".to_owned()))?
        as usize;

    let repeated = (0..repeat).map(|_| message.clone()).collect::<Vec<_>>();

    #[cfg(unix)]
    {
        Ok(repeated)
    }

    #[cfg(windows)]
    {
        Ok(vec!["/C".to_owned(), "echo".to_owned(), repeated.join(" ")])
    }
}

fn build_codex_exec_args(args_json: &Value) -> AgentRuntimeResult<Vec<String>> {
    let args = args_json
        .as_object()
        .ok_or_else(|| AgentRuntimeError::InvalidArgs("argsJson 必须是对象".to_owned()))?;

    for key in args.keys() {
        if !matches!(
            key.as_str(),
            "prompt" | "model" | "sandbox" | "json" | "ephemeral" | "skipGitRepoCheck"
        ) {
            return Err(AgentRuntimeError::InvalidArgs(format!(
                "不支持的 Codex 参数字段：{key}"
            )));
        }
    }

    let prompt = required_string_arg(args.get("prompt"), "prompt", 1, 8_000)?;
    let sandbox = match args.get("sandbox") {
        Some(Value::String(value)) => match value.trim() {
            "read-only" => "read-only".to_owned(),
            "workspace-write" => "workspace-write".to_owned(),
            _ => {
                return Err(AgentRuntimeError::InvalidArgs(
                    "sandbox 只能是 read-only 或 workspace-write".to_owned(),
                ));
            }
        },
        Some(_) => {
            return Err(AgentRuntimeError::InvalidArgs(
                "sandbox 必须是字符串".to_owned(),
            ));
        }
        None => "workspace-write".to_owned(),
    };

    let mut process_args = vec![
        "exec".to_owned(),
        "--color".to_owned(),
        "never".to_owned(),
        "--sandbox".to_owned(),
        sandbox,
    ];

    if optional_bool_arg(args.get("json"), "json")? {
        process_args.push("--json".to_owned());
    }

    if let Some(model) = optional_string_arg(args.get("model"), "model", 1, 120)? {
        process_args.push("--model".to_owned());
        process_args.push(model);
    }

    if optional_bool_arg(args.get("ephemeral"), "ephemeral")? {
        process_args.push("--ephemeral".to_owned());
    }

    if optional_bool_arg(args.get("skipGitRepoCheck"), "skipGitRepoCheck")? {
        process_args.push("--skip-git-repo-check".to_owned());
    }

    process_args.push("--".to_owned());
    process_args.push(prompt);

    Ok(process_args)
}

fn required_string_arg(
    value: Option<&Value>,
    field_name: &str,
    min_length: usize,
    max_length: usize,
) -> AgentRuntimeResult<String> {
    match value {
        Some(Value::String(value)) => {
            let trimmed = value.trim();
            if trimmed.len() < min_length || trimmed.len() > max_length {
                return Err(AgentRuntimeError::InvalidArgs(format!(
                    "{field_name} 必须是 {min_length} 到 {max_length} 字符的字符串"
                )));
            }

            Ok(trimmed.to_owned())
        }
        Some(_) => Err(AgentRuntimeError::InvalidArgs(format!(
            "{field_name} 必须是字符串"
        ))),
        None => Err(AgentRuntimeError::InvalidArgs(format!(
            "{field_name} 不能为空"
        ))),
    }
}

fn optional_string_arg(
    value: Option<&Value>,
    field_name: &str,
    min_length: usize,
    max_length: usize,
) -> AgentRuntimeResult<Option<String>> {
    match value {
        Some(_) => required_string_arg(value, field_name, min_length, max_length).map(Some),
        None => Ok(None),
    }
}

fn optional_bool_arg(value: Option<&Value>, field_name: &str) -> AgentRuntimeResult<bool> {
    match value {
        Some(Value::Bool(value)) => Ok(*value),
        Some(_) => Err(AgentRuntimeError::InvalidArgs(format!(
            "{field_name} 必须是布尔值"
        ))),
        None => Ok(false),
    }
}

#[cfg(test)]
fn build_test_stream_args() -> AgentRuntimeResult<Vec<String>> {
    #[cfg(unix)]
    {
        Ok(vec![
            "-c".to_owned(),
            "printf 'out-one\nout-two\n'; printf 'err-one\nerr-two\n' >&2".to_owned(),
        ])
    }

    #[cfg(windows)]
    {
        Ok(vec![
            "/C".to_owned(),
            "echo out-one && echo out-two && echo err-one 1>&2 && echo err-two 1>&2".to_owned(),
        ])
    }
}

#[cfg(test)]
fn build_test_sleep_args() -> AgentRuntimeResult<Vec<String>> {
    #[cfg(unix)]
    {
        Ok(vec!["5".to_owned()])
    }

    #[cfg(windows)]
    {
        Ok(vec!["/T".to_owned(), "5".to_owned(), "/NOBREAK".to_owned()])
    }
}

fn resolve_cwd(
    cwd_policy: AgentCwdPolicy,
    requested_cwd: Option<&str>,
) -> AgentRuntimeResult<PathBuf> {
    match cwd_policy {
        AgentCwdPolicy::Workspace => std::env::current_dir()
            .map_err(|error| AgentRuntimeError::InvalidCwd(error.to_string())),
        AgentCwdPolicy::Fixed | AgentCwdPolicy::Selectable => {
            let cwd = requested_cwd
                .map(str::trim)
                .filter(|cwd| !cwd.is_empty())
                .ok_or_else(|| AgentRuntimeError::InvalidCwd("cwd 不能为空".to_owned()))?;

            let cwd = PathBuf::from(cwd);
            if !cwd.is_dir() {
                return Err(AgentRuntimeError::InvalidCwd(
                    "cwd 必须是已存在的目录".to_owned(),
                ));
            }

            cwd.canonicalize()
                .map_err(|error| AgentRuntimeError::InvalidCwd(error.to_string()))
        }
    }
}

fn adapter_args_schema(kind: AgentAdapterKind) -> Value {
    match kind {
        AgentAdapterKind::LocalEcho => json!({
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "message": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 500
                },
                "repeat": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5
                }
            }
        }),
        AgentAdapterKind::CodexExec => json!({
            "type": "object",
            "additionalProperties": false,
            "required": ["prompt"],
            "properties": {
                "prompt": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 8000
                },
                "model": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 120
                },
                "sandbox": {
                    "type": "string",
                    "enum": ["read-only", "workspace-write"],
                    "default": "workspace-write"
                },
                "json": {
                    "type": "boolean",
                    "default": false
                },
                "ephemeral": {
                    "type": "boolean",
                    "default": false
                },
                "skipGitRepoCheck": {
                    "type": "boolean",
                    "default": false
                }
            }
        }),
        #[cfg(test)]
        AgentAdapterKind::TestStreams | AgentAdapterKind::TestSleep => json!({}),
    }
}

fn adapter_info(adapter: &AgentAdapterDefinition) -> AgentAdapterInfo {
    AgentAdapterInfo {
        id: adapter.id.to_owned(),
        title: adapter.title.to_owned(),
        command: adapter.command.clone(),
        cwd_policy: adapter.cwd_policy,
        env_allowlist: adapter
            .env_allowlist
            .iter()
            .map(|env_name| (*env_name).to_owned())
            .collect(),
    }
}

fn builtin_adapters() -> Vec<AgentAdapterDefinition> {
    vec![
        AgentAdapterDefinition {
            id: "local.echo",
            title: "Local Echo",
            command: local_echo_command(),
            cwd_policy: AgentCwdPolicy::Workspace,
            env_allowlist: &[],
            kind: AgentAdapterKind::LocalEcho,
        },
        AgentAdapterDefinition {
            id: "codex.local",
            title: "Codex Local",
            command: codex_command(),
            cwd_policy: AgentCwdPolicy::Selectable,
            // Codex 需要读取本机登录态和常规 CLI 环境，但仍只放行明确列出的变量。
            env_allowlist: &[
                "CODEX_HOME",
                "HOME",
                "LANG",
                "LC_ALL",
                "LOGNAME",
                "PATH",
                "SHELL",
                "TMPDIR",
                "USER",
            ],
            kind: AgentAdapterKind::CodexExec,
        },
    ]
}

fn local_echo_command() -> String {
    #[cfg(unix)]
    {
        "/bin/echo".to_owned()
    }

    #[cfg(windows)]
    {
        "C:\\Windows\\System32\\cmd.exe".to_owned()
    }
}

fn codex_command() -> String {
    const CODEX_APP_CLI: &str = "/Applications/Codex.app/Contents/Resources/codex";

    if PathBuf::from(CODEX_APP_CLI).is_file() {
        return CODEX_APP_CLI.to_owned();
    }

    "codex".to_owned()
}

fn emit_runtime_event<T: Serialize + Clone>(app: &Option<AppHandle>, event: &str, payload: T) {
    if let Some(app) = app {
        let _ = app.emit(event, payload);
    }
}

fn current_timestamp() -> String {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    format!("{}.{:03}Z", duration.as_secs(), duration.subsec_millis())
}

fn to_command_error(error: AgentRuntimeError) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::persistence::initialize_persistence;
    use serde_json::json;
    use sqlx::Row;
    use tempfile::TempDir;
    use tokio::time::{sleep, Duration};

    async fn test_persistence() -> (TempDir, PersistenceState) {
        let temp_dir = TempDir::new().expect("应该能创建临时目录");
        let state = initialize_persistence(temp_dir.path())
            .await
            .expect("应该能初始化测试数据库");

        (temp_dir, state)
    }

    async fn wait_for_finished_run(state: &AgentRuntimeState, run_id: &str) -> AgentRunRecord {
        for _ in 0..20 {
            let record = state.run_record(run_id).await.expect("应该存在运行记录");
            if !matches!(
                record.status,
                AgentRunStatus::Queued | AgentRunStatus::Running
            ) {
                return record;
            }
            sleep(Duration::from_millis(50)).await;
        }

        panic!("运行记录应该在测试时间内结束");
    }

    async fn wait_for_persisted_logs(
        pool: &SqlitePool,
        run_id: &str,
        expected_count: usize,
    ) -> Vec<(String, String)> {
        for _ in 0..20 {
            let rows = sqlx::query(
                "SELECT stream, line
                 FROM agent_run_logs
                 WHERE run_id = ?1
                 ORDER BY created_at, id",
            )
            .bind(run_id)
            .fetch_all(pool)
            .await
            .expect("应该能读取运行日志");

            if rows.len() >= expected_count {
                return rows
                    .into_iter()
                    .map(|row| {
                        (
                            row.try_get("stream").expect("应该存在 stream 字段"),
                            row.try_get("line").expect("应该存在 line 字段"),
                        )
                    })
                    .collect();
            }

            sleep(Duration::from_millis(50)).await;
        }

        panic!("运行日志应该在测试时间内写入");
    }

    #[test]
    fn local_echo_args_are_strictly_structured() {
        assert_eq!(
            build_local_echo_args(&json!({ "message": "hello", "repeat": 2 }))
                .expect("合法参数应该通过"),
            vec!["hello".to_owned(), "hello".to_owned()]
        );

        assert!(build_local_echo_args(&json!({ "message": { "bad": true } })).is_err());
        assert!(build_local_echo_args(&json!({ "message": "hello", "repeat": 6 })).is_err());
        assert!(build_local_echo_args(&json!({ "command": "rm -rf" })).is_err());
    }

    #[test]
    fn codex_exec_args_are_strictly_structured() {
        assert_eq!(
            build_codex_exec_args(&json!({
                "prompt": "检查这个仓库并给出部署计划",
                "model": "gpt-5.4",
                "sandbox": "read-only",
                "json": true,
                "ephemeral": true,
                "skipGitRepoCheck": true
            }))
            .expect("合法 Codex 参数应该通过"),
            vec![
                "exec".to_owned(),
                "--color".to_owned(),
                "never".to_owned(),
                "--sandbox".to_owned(),
                "read-only".to_owned(),
                "--json".to_owned(),
                "--model".to_owned(),
                "gpt-5.4".to_owned(),
                "--ephemeral".to_owned(),
                "--skip-git-repo-check".to_owned(),
                "--".to_owned(),
                "检查这个仓库并给出部署计划".to_owned(),
            ]
        );

        assert_eq!(
            build_codex_exec_args(&json!({ "prompt": "hello" })).expect("sandbox 应该有安全默认值"),
            vec![
                "exec".to_owned(),
                "--color".to_owned(),
                "never".to_owned(),
                "--sandbox".to_owned(),
                "workspace-write".to_owned(),
                "--".to_owned(),
                "hello".to_owned(),
            ]
        );

        assert!(build_codex_exec_args(&json!({ "prompt": "" })).is_err());
        assert!(
            build_codex_exec_args(&json!({ "prompt": "x", "sandbox": "danger-full-access" }))
                .is_err()
        );
        assert!(build_codex_exec_args(&json!({ "prompt": "x", "command": "rm -rf" })).is_err());
        assert!(build_codex_exec_args(&json!({ "prompt": "x", "json": "true" })).is_err());
    }

    #[tokio::test]
    async fn rejects_unknown_adapter() {
        let (_temp_dir, persistence) = test_persistence().await;
        let state = AgentRuntimeState::default();
        let error = start_agent_run_internal(
            None,
            &state,
            persistence.pool(),
            StartAgentRunRequest {
                adapter_id: "missing.adapter".to_owned(),
                args_json: json!({}),
                cwd: None,
            },
        )
        .await
        .expect_err("未知 adapter 应该被拒绝");

        assert!(matches!(error, AgentRuntimeError::UnknownAdapter(_)));

        let run_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM agent_runs")
            .fetch_one(persistence.pool())
            .await
            .expect("未知 adapter 不应该写入运行记录");
        assert_eq!(run_count, 0);
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn fixed_cwd_policy_requires_cwd_before_persisting_run() {
        let (_temp_dir, persistence) = test_persistence().await;
        let state = AgentRuntimeState::new(vec![AgentAdapterDefinition {
            id: "test.fixed",
            title: "Test Fixed",
            command: "/bin/echo".to_owned(),
            cwd_policy: AgentCwdPolicy::Fixed,
            env_allowlist: &[],
            kind: AgentAdapterKind::LocalEcho,
        }]);

        let error = start_agent_run_internal(
            None,
            &state,
            persistence.pool(),
            StartAgentRunRequest {
                adapter_id: "test.fixed".to_owned(),
                args_json: json!({}),
                cwd: None,
            },
        )
        .await
        .expect_err("fixed cwd policy 缺少 cwd 时应该拒绝启动");

        assert!(matches!(error, AgentRuntimeError::InvalidCwd(_)));

        let run_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM agent_runs")
            .fetch_one(persistence.pool())
            .await
            .expect("cwd 校验失败不应该写入运行记录");
        assert_eq!(run_count, 0);
    }

    #[tokio::test]
    async fn selectable_cwd_policy_rejects_missing_directory() {
        let (_temp_dir, persistence) = test_persistence().await;
        let state = AgentRuntimeState::new(vec![AgentAdapterDefinition {
            id: "test.selectable",
            title: "Test Selectable",
            command: local_echo_command(),
            cwd_policy: AgentCwdPolicy::Selectable,
            env_allowlist: &[],
            kind: AgentAdapterKind::LocalEcho,
        }]);
        let error = start_agent_run_internal(
            None,
            &state,
            persistence.pool(),
            StartAgentRunRequest {
                adapter_id: "test.selectable".to_owned(),
                args_json: json!({ "message": "cwd-missing" }),
                cwd: Some("/definitely/missing/ai-workflow-kit".to_owned()),
            },
        )
        .await
        .expect_err("不存在的 cwd 应该被拒绝");

        assert!(matches!(error, AgentRuntimeError::InvalidCwd(_)));

        let run_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM agent_runs")
            .fetch_one(persistence.pool())
            .await
            .expect("无效 cwd 不应该写入运行记录");
        assert_eq!(run_count, 0);
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn selectable_cwd_policy_persists_requested_cwd() {
        let (temp_dir, persistence) = test_persistence().await;
        let state = AgentRuntimeState::new(vec![AgentAdapterDefinition {
            id: "test.selectable",
            title: "Test Selectable",
            command: "/bin/echo".to_owned(),
            cwd_policy: AgentCwdPolicy::Selectable,
            env_allowlist: &[],
            kind: AgentAdapterKind::LocalEcho,
        }]);
        let cwd = temp_dir.path().to_string_lossy().into_owned();

        let record = start_agent_run_internal(
            None,
            &state,
            persistence.pool(),
            StartAgentRunRequest {
                adapter_id: "test.selectable".to_owned(),
                args_json: json!({ "message": "cwd-ok" }),
                cwd: Some(cwd.clone()),
            },
        )
        .await
        .expect("selectable cwd policy 应该允许显式 cwd");

        let finished = wait_for_finished_run(&state, &record.id).await;
        let persisted_cwd =
            sqlx::query_scalar::<_, String>("SELECT cwd FROM agent_runs WHERE id = ?1")
                .bind(&record.id)
                .fetch_one(persistence.pool())
                .await
                .expect("应该能读取持久化 cwd");

        let canonical_cwd = temp_dir
            .path()
            .canonicalize()
            .expect("测试目录应该能 canonicalize")
            .to_string_lossy()
            .into_owned();

        assert_eq!(record.cwd, canonical_cwd);
        assert_eq!(finished.status, AgentRunStatus::Succeeded);
        assert_eq!(persisted_cwd, canonical_cwd);
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn starts_allowlisted_local_echo_and_records_exit() {
        let (_temp_dir, persistence) = test_persistence().await;
        let state = AgentRuntimeState::default();
        let record = start_agent_run_internal(
            None,
            &state,
            persistence.pool(),
            StartAgentRunRequest {
                adapter_id: "local.echo".to_owned(),
                args_json: json!({ "message": "ready" }),
                cwd: None,
            },
        )
        .await
        .expect("allowlisted adapter 应该能启动");

        assert_eq!(record.adapter_id, "local.echo");
        assert_eq!(record.status, AgentRunStatus::Running);

        let finished = wait_for_finished_run(&state, &record.id).await;
        assert_eq!(finished.status, AgentRunStatus::Succeeded);
        assert_eq!(finished.exit_code, Some(0));

        let adapter_count =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM agent_adapters WHERE id = ?1")
                .bind("local.echo")
                .fetch_one(persistence.pool())
                .await
                .expect("应该能读取持久化 adapter");
        let persisted_run = sqlx::query(
            "SELECT status, exit_code, ended_at
             FROM agent_runs
             WHERE id = ?1",
        )
        .bind(&record.id)
        .fetch_one(persistence.pool())
        .await
        .expect("应该能读取持久化运行记录");
        let logs = wait_for_persisted_logs(persistence.pool(), &record.id, 1).await;

        assert_eq!(adapter_count, 1);
        assert_eq!(
            persisted_run
                .try_get::<String, _>("status")
                .expect("应该存在 status 字段"),
            "succeeded"
        );
        assert_eq!(
            persisted_run
                .try_get::<Option<i32>, _>("exit_code")
                .expect("应该存在 exit_code 字段"),
            Some(0)
        );
        assert!(persisted_run
            .try_get::<Option<String>, _>("ended_at")
            .expect("应该存在 ended_at 字段")
            .is_some());
        assert!(logs.contains(&("stdout".to_owned(), "ready".to_owned())));

        let stopped = stop_agent_run_internal(
            &state,
            persistence.pool(),
            StopAgentRunRequest { run_id: record.id },
        )
        .await
        .expect("已结束运行应该能幂等读取");

        assert_eq!(stopped.status, AgentRunStatus::Succeeded);
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn persists_stdout_and_stderr_lines() {
        let (_temp_dir, persistence) = test_persistence().await;
        let state = AgentRuntimeState::new(vec![AgentAdapterDefinition {
            id: "test.streams",
            title: "Test Streams",
            command: "/bin/sh".to_owned(),
            cwd_policy: AgentCwdPolicy::Workspace,
            env_allowlist: &[],
            kind: AgentAdapterKind::TestStreams,
        }]);

        let record = start_agent_run_internal(
            None,
            &state,
            persistence.pool(),
            StartAgentRunRequest {
                adapter_id: "test.streams".to_owned(),
                args_json: json!({}),
                cwd: None,
            },
        )
        .await
        .expect("测试 adapter 应该能启动");

        let finished = wait_for_finished_run(&state, &record.id).await;
        let logs = wait_for_persisted_logs(persistence.pool(), &record.id, 4).await;

        assert_eq!(finished.status, AgentRunStatus::Succeeded);
        assert!(logs.contains(&("stdout".to_owned(), "out-one".to_owned())));
        assert!(logs.contains(&("stdout".to_owned(), "out-two".to_owned())));
        assert!(logs.contains(&("stderr".to_owned(), "err-one".to_owned())));
        assert!(logs.contains(&("stderr".to_owned(), "err-two".to_owned())));
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn stopping_run_persists_stopped_status() {
        let (_temp_dir, persistence) = test_persistence().await;
        let state = AgentRuntimeState::new(vec![AgentAdapterDefinition {
            id: "test.sleep",
            title: "Test Sleep",
            command: "/bin/sleep".to_owned(),
            cwd_policy: AgentCwdPolicy::Workspace,
            env_allowlist: &[],
            kind: AgentAdapterKind::TestSleep,
        }]);

        let record = start_agent_run_internal(
            None,
            &state,
            persistence.pool(),
            StartAgentRunRequest {
                adapter_id: "test.sleep".to_owned(),
                args_json: json!({}),
                cwd: None,
            },
        )
        .await
        .expect("测试长运行 adapter 应该能启动");

        let stopped = stop_agent_run_internal(
            &state,
            persistence.pool(),
            StopAgentRunRequest {
                run_id: record.id.clone(),
            },
        )
        .await
        .expect("应该能停止运行");

        let persisted_run = sqlx::query(
            "SELECT status, exit_code, ended_at
             FROM agent_runs
             WHERE id = ?1",
        )
        .bind(&record.id)
        .fetch_one(persistence.pool())
        .await
        .expect("应该能读取停止后的运行记录");

        assert_eq!(stopped.status, AgentRunStatus::Stopped);
        assert!(stopped.ended_at.is_some());
        assert_eq!(
            persisted_run
                .try_get::<String, _>("status")
                .expect("应该存在 status 字段"),
            "stopped"
        );
        assert_eq!(
            persisted_run
                .try_get::<Option<i32>, _>("exit_code")
                .expect("应该存在 exit_code 字段"),
            None
        );
        assert!(persisted_run
            .try_get::<Option<String>, _>("ended_at")
            .expect("应该存在 ended_at 字段")
            .is_some());

        sleep(Duration::from_millis(100)).await;
    }

    #[tokio::test]
    async fn lists_builtin_agent_adapters() {
        let state = AgentRuntimeState::default();
        let adapters = state
            .adapters
            .values()
            .map(adapter_info)
            .collect::<Vec<_>>();

        assert_eq!(adapters.len(), 2);

        let local_echo = adapters
            .iter()
            .find(|adapter| adapter.id == "local.echo")
            .expect("应该注册 local.echo adapter");
        assert_eq!(local_echo.cwd_policy, AgentCwdPolicy::Workspace);

        let codex_local = adapters
            .iter()
            .find(|adapter| adapter.id == "codex.local")
            .expect("应该注册 codex.local adapter");
        assert_eq!(codex_local.cwd_policy, AgentCwdPolicy::Selectable);
        assert!(codex_local.env_allowlist.iter().any(|name| name == "HOME"));
        assert!(codex_local.env_allowlist.iter().any(|name| name == "PATH"));
    }
}
