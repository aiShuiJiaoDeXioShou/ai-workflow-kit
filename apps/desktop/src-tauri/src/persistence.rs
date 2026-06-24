use serde::{Deserialize, Serialize};
use sqlx::{
    migrate::Migrator,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    FromRow, SqlitePool,
};
use std::{
    path::{Path, PathBuf},
    time::Duration,
};
use tauri::State;
use thiserror::Error;
use uuid::Uuid;

const DATABASE_FILE_NAME: &str = "ai-workflow-kit.sqlite3";
const DEFAULT_CANVAS_ID: &str = "root";
const DEFAULT_CANVAS_TITLE: &str = "Root Canvas";

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

#[derive(Debug, Error)]
pub enum PersistenceError {
    #[error("无法创建应用数据目录：{0}")]
    CreateDataDir(#[source] std::io::Error),
    #[error("SQLite 操作失败：{0}")]
    Database(#[from] sqlx::Error),
    #[error("SQLite 迁移失败：{0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error("JSON 序列化失败：{0}")]
    Json(#[from] serde_json::Error),
    #[error("请求字段不能为空：{0}")]
    EmptyField(&'static str),
}

type PersistenceResult<T> = Result<T, PersistenceError>;

#[derive(Clone)]
pub struct PersistenceState {
    pool: SqlitePool,
    database_path: PathBuf,
}

impl PersistenceState {
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    fn database_file_name(&self) -> String {
        self.database_path
            .file_name()
            .and_then(|file_name| file_name.to_str())
            .unwrap_or(DATABASE_FILE_NAME)
            .to_owned()
    }
}

#[derive(Debug, Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasRecord {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentInstanceRecord {
    pub id: String,
    pub canvas_id: String,
    pub component_type: String,
    pub config_json: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentRuntimeStateRecord {
    pub component_instance_id: String,
    pub state_json: serde_json::Value,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasSnapshotRecord {
    pub id: String,
    pub canvas_id: String,
    pub document_json: serde_json::Value,
    pub session_json: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceHealth {
    pub database_file: String,
    pub migration_version: i64,
    pub canvas_count: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveCanvasSnapshotRequest {
    pub canvas_id: String,
    pub document_json: serde_json::Value,
    pub session_json: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadCanvasSnapshotRequest {
    pub canvas_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateComponentInstanceRequest {
    pub canvas_id: String,
    pub component_type: String,
    pub config_json: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateComponentInstanceConfigRequest {
    pub id: String,
    pub config_json: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertComponentRuntimeStateRequest {
    pub component_instance_id: String,
    pub state_json: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadComponentRuntimeStateRequest {
    pub component_instance_id: String,
}

#[derive(Debug, FromRow)]
struct CanvasSnapshotRow {
    id: String,
    canvas_id: String,
    document_json: String,
    session_json: String,
    created_at: String,
}

#[derive(Debug, FromRow)]
struct ComponentInstanceRow {
    id: String,
    canvas_id: String,
    component_type: String,
    config_json: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, FromRow)]
struct ComponentRuntimeStateRow {
    component_instance_id: String,
    state_json: String,
    updated_at: String,
}

/// 初始化本地 SQLite。数据库路径只在 Rust 后端解析，不通过前端传入。
pub async fn initialize_persistence(
    app_data_dir: impl AsRef<Path>,
) -> PersistenceResult<PersistenceState> {
    let database_path = app_data_dir.as_ref().join(DATABASE_FILE_NAME);
    let pool = connect_database(&database_path).await?;

    Ok(PersistenceState {
        pool,
        database_path,
    })
}

pub async fn connect_database(database_path: impl AsRef<Path>) -> PersistenceResult<SqlitePool> {
    if let Some(parent) = database_path.as_ref().parent() {
        std::fs::create_dir_all(parent).map_err(PersistenceError::CreateDataDir)?;
    }

    let connect_options = SqliteConnectOptions::new()
        .filename(database_path.as_ref())
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_options)
        .await?;

    MIGRATOR.run(&pool).await?;

    Ok(pool)
}

#[tauri::command]
pub async fn get_persistence_health(
    state: State<'_, PersistenceState>,
) -> Result<PersistenceHealth, String> {
    collect_persistence_health(&state)
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn load_default_canvas(
    state: State<'_, PersistenceState>,
) -> Result<CanvasRecord, String> {
    ensure_default_canvas(state.pool())
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn save_canvas_snapshot(
    state: State<'_, PersistenceState>,
    request: SaveCanvasSnapshotRequest,
) -> Result<CanvasSnapshotRecord, String> {
    save_canvas_snapshot_record(state.pool(), request)
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn load_latest_canvas_snapshot(
    state: State<'_, PersistenceState>,
    request: LoadCanvasSnapshotRequest,
) -> Result<Option<CanvasSnapshotRecord>, String> {
    ensure_non_empty(&request.canvas_id, "canvasId").map_err(to_command_error)?;
    fetch_latest_canvas_snapshot(state.pool(), &request.canvas_id)
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn create_component_instance(
    state: State<'_, PersistenceState>,
    request: CreateComponentInstanceRequest,
) -> Result<ComponentInstanceRecord, String> {
    create_component_instance_record(state.pool(), request)
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn update_component_instance_config(
    state: State<'_, PersistenceState>,
    request: UpdateComponentInstanceConfigRequest,
) -> Result<ComponentInstanceRecord, String> {
    update_component_instance_config_record(state.pool(), request)
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn upsert_component_runtime_state(
    state: State<'_, PersistenceState>,
    request: UpsertComponentRuntimeStateRequest,
) -> Result<ComponentRuntimeStateRecord, String> {
    upsert_component_runtime_state_record(state.pool(), request)
        .await
        .map_err(to_command_error)
}

#[tauri::command]
pub async fn load_component_runtime_state(
    state: State<'_, PersistenceState>,
    request: LoadComponentRuntimeStateRequest,
) -> Result<Option<ComponentRuntimeStateRecord>, String> {
    load_component_runtime_state_record(state.pool(), request)
        .await
        .map_err(to_command_error)
}

async fn collect_persistence_health(
    state: &PersistenceState,
) -> PersistenceResult<PersistenceHealth> {
    let migration_version = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(MAX(version), 0) FROM _sqlx_migrations WHERE success = 1",
    )
    .fetch_one(state.pool())
    .await?;

    let canvas_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM canvases")
        .fetch_one(state.pool())
        .await?;

    Ok(PersistenceHealth {
        database_file: state.database_file_name(),
        migration_version,
        canvas_count,
    })
}

async fn ensure_default_canvas(pool: &SqlitePool) -> PersistenceResult<CanvasRecord> {
    ensure_canvas(pool, DEFAULT_CANVAS_ID, DEFAULT_CANVAS_TITLE).await
}

async fn ensure_canvas(
    pool: &SqlitePool,
    id: &str,
    title: &str,
) -> PersistenceResult<CanvasRecord> {
    ensure_non_empty(id, "canvasId")?;
    ensure_non_empty(title, "title")?;

    sqlx::query("INSERT INTO canvases (id, title) VALUES (?1, ?2) ON CONFLICT(id) DO NOTHING")
        .bind(id)
        .bind(title)
        .execute(pool)
        .await?;

    fetch_canvas(pool, id).await
}

async fn fetch_canvas(pool: &SqlitePool, id: &str) -> PersistenceResult<CanvasRecord> {
    let canvas = sqlx::query_as::<_, CanvasRecord>(
        "SELECT id, title, created_at, updated_at FROM canvases WHERE id = ?1",
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    Ok(canvas)
}

async fn create_component_instance_record(
    pool: &SqlitePool,
    request: CreateComponentInstanceRequest,
) -> PersistenceResult<ComponentInstanceRecord> {
    ensure_non_empty(&request.canvas_id, "canvasId")?;
    ensure_non_empty(&request.component_type, "componentType")?;

    if request.canvas_id == DEFAULT_CANVAS_ID {
        ensure_default_canvas(pool).await?;
    } else {
        fetch_canvas(pool, &request.canvas_id).await?;
    }

    let id = Uuid::new_v4().to_string();
    let config_json = serde_json::to_string(&request.config_json)?;

    sqlx::query(
        "INSERT INTO component_instances (id, canvas_id, component_type, config_json)
         VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&id)
    .bind(&request.canvas_id)
    .bind(&request.component_type)
    .bind(config_json)
    .execute(pool)
    .await?;

    fetch_component_instance(pool, &id).await
}

async fn update_component_instance_config_record(
    pool: &SqlitePool,
    request: UpdateComponentInstanceConfigRequest,
) -> PersistenceResult<ComponentInstanceRecord> {
    ensure_non_empty(&request.id, "id")?;

    let config_json = serde_json::to_string(&request.config_json)?;
    let result = sqlx::query(
        "UPDATE component_instances
         SET config_json = ?2,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?1",
    )
    .bind(&request.id)
    .bind(config_json)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(sqlx::Error::RowNotFound.into());
    }

    fetch_component_instance(pool, &request.id).await
}

async fn fetch_component_instance(
    pool: &SqlitePool,
    id: &str,
) -> PersistenceResult<ComponentInstanceRecord> {
    let row = sqlx::query_as::<_, ComponentInstanceRow>(
        "SELECT id, canvas_id, component_type, config_json, created_at, updated_at
         FROM component_instances
         WHERE id = ?1",
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    component_instance_from_row(row)
}

async fn upsert_component_runtime_state_record(
    pool: &SqlitePool,
    request: UpsertComponentRuntimeStateRequest,
) -> PersistenceResult<ComponentRuntimeStateRecord> {
    ensure_non_empty(&request.component_instance_id, "componentInstanceId")?;

    let state_json = serde_json::to_string(&request.state_json)?;

    sqlx::query(
        "INSERT INTO component_runtime_state (component_instance_id, state_json, updated_at)
         VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(component_instance_id) DO UPDATE SET
            state_json = excluded.state_json,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    )
    .bind(&request.component_instance_id)
    .bind(state_json)
    .execute(pool)
    .await?;

    fetch_component_runtime_state(pool, &request.component_instance_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound.into())
}

async fn load_component_runtime_state_record(
    pool: &SqlitePool,
    request: LoadComponentRuntimeStateRequest,
) -> PersistenceResult<Option<ComponentRuntimeStateRecord>> {
    ensure_non_empty(&request.component_instance_id, "componentInstanceId")?;

    fetch_component_runtime_state(pool, &request.component_instance_id).await
}

async fn fetch_component_runtime_state(
    pool: &SqlitePool,
    component_instance_id: &str,
) -> PersistenceResult<Option<ComponentRuntimeStateRecord>> {
    let row = sqlx::query_as::<_, ComponentRuntimeStateRow>(
        "SELECT component_instance_id, state_json, updated_at
         FROM component_runtime_state
         WHERE component_instance_id = ?1",
    )
    .bind(component_instance_id)
    .fetch_optional(pool)
    .await?;

    row.map(component_runtime_state_from_row).transpose()
}

async fn save_canvas_snapshot_record(
    pool: &SqlitePool,
    request: SaveCanvasSnapshotRequest,
) -> PersistenceResult<CanvasSnapshotRecord> {
    ensure_non_empty(&request.canvas_id, "canvasId")?;

    if request.canvas_id == DEFAULT_CANVAS_ID {
        ensure_default_canvas(pool).await?;
    } else {
        fetch_canvas(pool, &request.canvas_id).await?;
    }

    let id = Uuid::new_v4().to_string();
    let document_json = serde_json::to_string(&request.document_json)?;
    let session_json = serde_json::to_string(&request.session_json)?;
    let mut transaction = pool.begin().await?;

    sqlx::query(
        "INSERT INTO canvas_snapshots (id, canvas_id, document_json, session_json)
         VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&id)
    .bind(&request.canvas_id)
    .bind(document_json)
    .bind(session_json)
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        "UPDATE canvases
         SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?1",
    )
    .bind(&request.canvas_id)
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;

    fetch_canvas_snapshot(pool, &id).await
}

async fn fetch_latest_canvas_snapshot(
    pool: &SqlitePool,
    canvas_id: &str,
) -> PersistenceResult<Option<CanvasSnapshotRecord>> {
    let row = sqlx::query_as::<_, CanvasSnapshotRow>(
        "SELECT id, canvas_id, document_json, session_json, created_at
         FROM canvas_snapshots
         WHERE canvas_id = ?1
         ORDER BY created_at DESC, id DESC
         LIMIT 1",
    )
    .bind(canvas_id)
    .fetch_optional(pool)
    .await?;

    row.map(snapshot_from_row).transpose()
}

async fn fetch_canvas_snapshot(
    pool: &SqlitePool,
    id: &str,
) -> PersistenceResult<CanvasSnapshotRecord> {
    let row = sqlx::query_as::<_, CanvasSnapshotRow>(
        "SELECT id, canvas_id, document_json, session_json, created_at
         FROM canvas_snapshots
         WHERE id = ?1",
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    snapshot_from_row(row)
}

fn snapshot_from_row(row: CanvasSnapshotRow) -> PersistenceResult<CanvasSnapshotRecord> {
    Ok(CanvasSnapshotRecord {
        id: row.id,
        canvas_id: row.canvas_id,
        document_json: serde_json::from_str(&row.document_json)?,
        session_json: serde_json::from_str(&row.session_json)?,
        created_at: row.created_at,
    })
}

fn component_instance_from_row(
    row: ComponentInstanceRow,
) -> PersistenceResult<ComponentInstanceRecord> {
    Ok(ComponentInstanceRecord {
        id: row.id,
        canvas_id: row.canvas_id,
        component_type: row.component_type,
        config_json: serde_json::from_str(&row.config_json)?,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

fn component_runtime_state_from_row(
    row: ComponentRuntimeStateRow,
) -> PersistenceResult<ComponentRuntimeStateRecord> {
    Ok(ComponentRuntimeStateRecord {
        component_instance_id: row.component_instance_id,
        state_json: serde_json::from_str(&row.state_json)?,
        updated_at: row.updated_at,
    })
}

fn ensure_non_empty(value: &str, field: &'static str) -> PersistenceResult<()> {
    if value.trim().is_empty() {
        return Err(PersistenceError::EmptyField(field));
    }

    Ok(())
}

fn to_command_error(error: PersistenceError) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use sqlx::Row;
    use tempfile::TempDir;

    async fn test_state() -> (TempDir, PersistenceState) {
        let temp_dir = TempDir::new().expect("应该能创建临时目录");
        let state = initialize_persistence(temp_dir.path())
            .await
            .expect("应该能初始化测试数据库");

        (temp_dir, state)
    }

    #[tokio::test]
    async fn migrates_fresh_database() {
        let (_temp_dir, state) = test_state().await;

        let table_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*)
             FROM sqlite_master
             WHERE type = 'table'
             AND name IN (
                'canvases',
                'canvas_snapshots',
                'component_instances',
                'component_runtime_state',
                'agent_adapters',
                'agent_runs',
                'agent_run_logs'
             )",
        )
        .fetch_one(state.pool())
        .await
        .expect("应该能读取迁移后的表");

        let health = collect_persistence_health(&state)
            .await
            .expect("应该能读取迁移状态");

        assert_eq!(table_count, 7);
        assert_eq!(health.database_file, DATABASE_FILE_NAME);
        assert_eq!(health.migration_version, 1);
    }

    #[tokio::test]
    async fn saves_and_loads_canvas_snapshot_json_separately() {
        let (_temp_dir, state) = test_state().await;
        let canvas = ensure_default_canvas(state.pool())
            .await
            .expect("应该能创建默认画布");
        let document_json = json!({ "shapes": ["shape:workflow"], "schema": 1 });
        let session_json = json!({ "camera": { "x": 12, "y": -4, "z": 0.85 } });

        let saved = save_canvas_snapshot_record(
            state.pool(),
            SaveCanvasSnapshotRequest {
                canvas_id: canvas.id.clone(),
                document_json: document_json.clone(),
                session_json: session_json.clone(),
            },
        )
        .await
        .expect("应该能保存画布快照");

        let loaded = fetch_latest_canvas_snapshot(state.pool(), &canvas.id)
            .await
            .expect("应该能读取最新快照")
            .expect("应该存在刚保存的快照");

        assert_eq!(saved.id, loaded.id);
        assert_eq!(loaded.document_json, document_json);
        assert_eq!(loaded.session_json, session_json);
    }

    #[tokio::test]
    async fn saving_default_canvas_snapshot_creates_canvas_if_missing() {
        let (_temp_dir, state) = test_state().await;
        let document_json = json!({ "nodes": [], "edges": [] });

        let saved = save_canvas_snapshot_record(
            state.pool(),
            SaveCanvasSnapshotRequest {
                canvas_id: DEFAULT_CANVAS_ID.to_owned(),
                document_json: document_json.clone(),
                session_json: json!({}),
            },
        )
        .await
        .expect("保存 root 快照时应该能自动创建默认画布");

        let health = collect_persistence_health(&state)
            .await
            .expect("应该能读取持久化健康状态");
        let loaded = fetch_latest_canvas_snapshot(state.pool(), DEFAULT_CANVAS_ID)
            .await
            .expect("应该能读取 root 快照")
            .expect("应该存在刚保存的 root 快照");

        assert_eq!(health.canvas_count, 1);
        assert_eq!(saved.id, loaded.id);
        assert_eq!(loaded.document_json, document_json);
    }

    #[tokio::test]
    async fn component_config_requires_valid_json() {
        let (_temp_dir, state) = test_state().await;
        let canvas = ensure_default_canvas(state.pool())
            .await
            .expect("应该能创建默认画布");

        let invalid_insert = sqlx::query(
            "INSERT INTO component_instances (id, canvas_id, component_type, config_json)
             VALUES ('component-1', ?1, 'monitor.http-health', 'not-json')",
        )
        .bind(&canvas.id)
        .execute(state.pool())
        .await;

        assert!(invalid_insert.is_err());

        sqlx::query(
            "INSERT INTO component_instances (id, canvas_id, component_type, config_json)
             VALUES ('component-2', ?1, 'monitor.http-health', ?2)",
        )
        .bind(&canvas.id)
        .bind(json!({ "url": "https://example.com" }).to_string())
        .execute(state.pool())
        .await
        .expect("合法 JSON 配置应该能写入");

        let config_json: String =
            sqlx::query("SELECT config_json FROM component_instances WHERE id = 'component-2'")
                .fetch_one(state.pool())
                .await
                .expect("应该能读取组件配置")
                .try_get("config_json")
                .expect("应该存在 config_json 字段");

        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&config_json).expect("配置应该是 JSON"),
            json!({ "url": "https://example.com" })
        );
    }

    #[tokio::test]
    async fn creates_and_fetches_component_instance_with_unchanged_config() {
        let (_temp_dir, state) = test_state().await;
        let config_json = json!({
            "url": "https://example.com",
            "intervalSeconds": 30,
            "headers": [
                { "name": "accept", "value": "application/json" },
                { "name": "x-workspace", "value": "local" }
            ],
            "enabled": true,
            "lastError": null
        });

        let instance = create_component_instance_record(
            state.pool(),
            CreateComponentInstanceRequest {
                canvas_id: DEFAULT_CANVAS_ID.to_owned(),
                component_type: "core.monitor.http-health".to_owned(),
                config_json: config_json.clone(),
            },
        )
        .await
        .expect("应该能创建组件实例");
        let fetched = fetch_component_instance(state.pool(), &instance.id)
            .await
            .expect("应该能通过持久化 helper 读取组件实例");

        assert_eq!(fetched.id, instance.id);
        assert_eq!(fetched.canvas_id, DEFAULT_CANVAS_ID);
        assert_eq!(fetched.component_type, "core.monitor.http-health");
        assert_eq!(fetched.config_json, config_json);
    }

    #[tokio::test]
    async fn updates_component_instance_config_without_recreating_instance() {
        let (_temp_dir, state) = test_state().await;
        let instance = create_component_instance_record(
            state.pool(),
            CreateComponentInstanceRequest {
                canvas_id: DEFAULT_CANVAS_ID.to_owned(),
                component_type: "core.monitor.http-health".to_owned(),
                config_json: json!({ "url": "https://example.com/health" }),
            },
        )
        .await
        .expect("应该能创建组件实例");

        let updated_config = json!({
            "url": "https://api.example.com/live",
            "method": "HEAD"
        });
        let updated = update_component_instance_config_record(
            state.pool(),
            UpdateComponentInstanceConfigRequest {
                id: instance.id.clone(),
                config_json: updated_config.clone(),
            },
        )
        .await
        .expect("应该能更新组件配置");

        assert_eq!(updated.id, instance.id);
        assert_eq!(updated.canvas_id, instance.canvas_id);
        assert_eq!(updated.component_type, instance.component_type);
        assert_eq!(updated.config_json, updated_config);
        assert_ne!(updated.updated_at, "");
    }

    #[tokio::test]
    async fn failing_snapshot_save_keeps_previous_valid_snapshot() {
        let (_temp_dir, state) = test_state().await;
        let canvas = ensure_default_canvas(state.pool())
            .await
            .expect("应该能创建默认画布");
        let previous_document = json!({ "version": 1, "shapes": ["shape:previous"] });
        let previous_session = json!({ "camera": { "x": 1, "y": 2, "z": 0.75 } });

        let previous = save_canvas_snapshot_record(
            state.pool(),
            SaveCanvasSnapshotRequest {
                canvas_id: canvas.id.clone(),
                document_json: previous_document.clone(),
                session_json: previous_session.clone(),
            },
        )
        .await
        .expect("应该能保存第一份有效快照");

        sqlx::query(
            "CREATE TRIGGER fail_canvas_snapshot_insert
             BEFORE INSERT ON canvas_snapshots
             WHEN json_extract(NEW.document_json, '$.forceFailure') = 1
             BEGIN
                SELECT RAISE(ABORT, 'forced snapshot failure');
             END",
        )
        .execute(state.pool())
        .await
        .expect("应该能安装测试用失败触发器");

        let failed = save_canvas_snapshot_record(
            state.pool(),
            SaveCanvasSnapshotRequest {
                canvas_id: canvas.id.clone(),
                document_json: json!({ "forceFailure": true, "shapes": ["shape:failed"] }),
                session_json: json!({ "camera": { "x": 9, "y": 9, "z": 1.0 } }),
            },
        )
        .await;

        assert!(failed.is_err());

        let loaded = fetch_latest_canvas_snapshot(state.pool(), &canvas.id)
            .await
            .expect("失败后仍应该能读取最新快照")
            .expect("失败后上一份有效快照应该仍存在");
        let snapshot_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM canvas_snapshots WHERE canvas_id = ?1",
        )
        .bind(&canvas.id)
        .fetch_one(state.pool())
        .await
        .expect("应该能统计快照数量");

        assert_eq!(loaded.id, previous.id);
        assert_eq!(loaded.document_json, previous_document);
        assert_eq!(loaded.session_json, previous_session);
        assert_eq!(snapshot_count, 1);
    }

    #[tokio::test]
    async fn upserts_and_loads_component_runtime_state() {
        let (_temp_dir, state) = test_state().await;

        let instance = create_component_instance_record(
            state.pool(),
            CreateComponentInstanceRequest {
                canvas_id: DEFAULT_CANVAS_ID.to_owned(),
                component_type: "core.monitor.http-health".to_owned(),
                config_json: json!({ "url": "https://example.com" }),
            },
        )
        .await
        .expect("应该能创建组件实例");

        let saved = upsert_component_runtime_state_record(
            state.pool(),
            UpsertComponentRuntimeStateRequest {
                component_instance_id: instance.id.clone(),
                state_json: json!({ "status": "ok", "history": [200] }),
            },
        )
        .await
        .expect("应该能写入组件运行态");

        assert_eq!(saved.component_instance_id, instance.id);
        assert_eq!(
            saved.state_json,
            json!({ "status": "ok", "history": [200] })
        );
        assert!(!saved.updated_at.is_empty());

        upsert_component_runtime_state_record(
            state.pool(),
            UpsertComponentRuntimeStateRequest {
                component_instance_id: instance.id.clone(),
                state_json: json!({ "status": "failed", "history": [200, 500] }),
            },
        )
        .await
        .expect("应该能覆盖组件运行态");

        let loaded = load_component_runtime_state_record(
            state.pool(),
            LoadComponentRuntimeStateRequest {
                component_instance_id: instance.id,
            },
        )
        .await
        .expect("应该能读取组件运行态")
        .expect("应该存在刚写入的组件运行态");

        assert_eq!(
            loaded.state_json,
            json!({ "status": "failed", "history": [200, 500] })
        );
    }

    #[tokio::test]
    async fn loading_missing_component_runtime_state_returns_none() {
        let (_temp_dir, state) = test_state().await;

        let loaded = load_component_runtime_state_record(
            state.pool(),
            LoadComponentRuntimeStateRequest {
                component_instance_id: "missing-component".to_owned(),
            },
        )
        .await
        .expect("缺失运行态应该返回空结果而不是失败");

        assert!(loaded.is_none());
    }

    #[tokio::test]
    async fn component_runtime_state_rejects_missing_component_instance() {
        let (_temp_dir, state) = test_state().await;

        let result = upsert_component_runtime_state_record(
            state.pool(),
            UpsertComponentRuntimeStateRequest {
                component_instance_id: "missing-component".to_owned(),
                state_json: json!({ "status": "orphaned" }),
            },
        )
        .await;

        assert!(result.is_err());

        let orphan_count =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM component_runtime_state")
                .fetch_one(state.pool())
                .await
                .expect("应该能统计组件运行态");

        assert_eq!(orphan_count, 0);
    }

    #[tokio::test]
    async fn agent_log_stream_is_limited_to_stdout_or_stderr() {
        let (_temp_dir, state) = test_state().await;

        sqlx::query(
            "INSERT INTO agent_adapters
                (id, title, command, args_schema_json, env_allowlist_json, cwd_policy)
             VALUES ('adapter-1', 'Echo', 'echo', '{}', '[]', 'workspace')",
        )
        .execute(state.pool())
        .await
        .expect("应该能写入受控 adapter");

        sqlx::query(
            "INSERT INTO agent_runs (id, adapter_id, status, cwd, args_json)
             VALUES ('run-1', 'adapter-1', 'running', '/tmp', '{}')",
        )
        .execute(state.pool())
        .await
        .expect("应该能写入运行记录");

        let invalid_stream = sqlx::query(
            "INSERT INTO agent_run_logs (id, run_id, stream, line)
             VALUES ('log-1', 'run-1', 'stdin', 'blocked stream')",
        )
        .execute(state.pool())
        .await;

        assert!(invalid_stream.is_err());
    }

    #[tokio::test]
    async fn agent_run_logs_are_read_in_created_at_then_id_order() {
        let (_temp_dir, state) = test_state().await;

        sqlx::query(
            "INSERT INTO agent_adapters
                (id, title, command, args_schema_json, env_allowlist_json, cwd_policy)
             VALUES ('adapter-ordered-logs', 'Echo', 'echo', '{}', '[]', 'workspace')",
        )
        .execute(state.pool())
        .await
        .expect("应该能写入受控 adapter");

        sqlx::query(
            "INSERT INTO agent_runs (id, adapter_id, status, cwd, args_json)
             VALUES ('run-ordered-logs', 'adapter-ordered-logs', 'running', '/tmp', '{}')",
        )
        .execute(state.pool())
        .await
        .expect("应该能写入运行记录");

        for (id, line, created_at) in [
            ("log-c", "third", "2026-01-01T00:00:01.000Z"),
            ("log-b", "second", "2026-01-01T00:00:00.000Z"),
            ("log-a", "first", "2026-01-01T00:00:00.000Z"),
        ] {
            sqlx::query(
                "INSERT INTO agent_run_logs (id, run_id, stream, line, created_at)
                 VALUES (?1, 'run-ordered-logs', 'stdout', ?2, ?3)",
            )
            .bind(id)
            .bind(line)
            .bind(created_at)
            .execute(state.pool())
            .await
            .expect("应该能追加运行日志");
        }

        let rows = sqlx::query(
            "SELECT id, line, created_at
             FROM agent_run_logs
             WHERE run_id = 'run-ordered-logs'
             ORDER BY created_at, id",
        )
        .fetch_all(state.pool())
        .await
        .expect("应该能按追加顺序读取运行日志");
        let ordered_lines = rows
            .iter()
            .map(|row| {
                row.try_get::<String, _>("line")
                    .expect("应该存在 line 字段")
            })
            .collect::<Vec<_>>();

        assert_eq!(ordered_lines, ["first", "second", "third"]);
    }
}
