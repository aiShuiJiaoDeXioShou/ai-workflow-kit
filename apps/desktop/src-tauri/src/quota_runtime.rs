use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs,
    time::{SystemTime, UNIX_EPOCH},
};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum QuotaRuntimeError {
    #[error("filePath 不能为空")]
    EmptyFilePath,
    #[error("JSON 映射路径不能为空：{0}")]
    EmptyMappingPath(&'static str),
    #[error("threshold 必须是 0 到 100 的有限数字")]
    InvalidThreshold,
    #[error("criticalThresholdPercent 必须大于或等于 warningThresholdPercent")]
    InvalidThresholdOrder,
    #[error("无法读取 quota JSON 文件：{0}")]
    ReadFile(#[source] std::io::Error),
    #[error("quota 文件不是合法 JSON：{0}")]
    ParseJson(#[source] serde_json::Error),
    #[error("JSON 路径不存在：{0}")]
    MissingPath(String),
    #[error("JSON 路径只能穿过对象字段：{0}")]
    NonObjectPath(String),
    #[error("JSON 路径必须指向数字：{0}")]
    NonNumericPath(String),
    #[error("current 必须是非负有限数字")]
    InvalidCurrent,
    #[error("limit 必须是正有限数字")]
    InvalidLimit,
}

type QuotaRuntimeResult<T> = Result<T, QuotaRuntimeError>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum QuotaLevel {
    Normal,
    Warning,
    Critical,
    Unknown,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotaJsonMapping {
    pub current_path: String,
    pub limit_path: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshQuotaFileRequest {
    pub file_path: String,
    pub json_mapping: QuotaJsonMapping,
    pub warning_threshold_percent: f64,
    pub critical_threshold_percent: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotaRuntimeState {
    pub current: f64,
    pub limit: f64,
    pub remaining: f64,
    pub percent_used: f64,
    pub level: QuotaLevel,
    pub last_loaded_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
}

#[tauri::command]
pub fn refresh_quota_file(request: RefreshQuotaFileRequest) -> Result<QuotaRuntimeState, String> {
    refresh_quota_file_internal(request).map_err(to_command_error)
}

fn refresh_quota_file_internal(
    request: RefreshQuotaFileRequest,
) -> QuotaRuntimeResult<QuotaRuntimeState> {
    validate_request(&request)?;

    // 这里是 quota 文件的唯一后端入口，只读取一个 UTF-8 JSON 文件，不暴露通用 fs 能力。
    let file_content =
        fs::read_to_string(request.file_path.trim()).map_err(QuotaRuntimeError::ReadFile)?;
    let json: Value = serde_json::from_str(&file_content).map_err(QuotaRuntimeError::ParseJson)?;
    let current = read_quota_number(&json, &request.json_mapping.current_path, "current")?;
    let limit = read_quota_number(&json, &request.json_mapping.limit_path, "limit")?;
    let remaining = limit - current;
    let percent_used = (current / limit) * 100.0;

    Ok(QuotaRuntimeState {
        current,
        limit,
        remaining,
        percent_used,
        level: resolve_quota_level(
            percent_used,
            request.warning_threshold_percent,
            request.critical_threshold_percent,
        ),
        last_loaded_at: current_timestamp(),
        last_error: None,
    })
}

fn validate_request(request: &RefreshQuotaFileRequest) -> QuotaRuntimeResult<()> {
    if request.file_path.trim().is_empty() {
        return Err(QuotaRuntimeError::EmptyFilePath);
    }

    ensure_mapping_path(&request.json_mapping.current_path, "currentPath")?;
    ensure_mapping_path(&request.json_mapping.limit_path, "limitPath")?;
    ensure_threshold(request.warning_threshold_percent)?;
    ensure_threshold(request.critical_threshold_percent)?;

    if request.critical_threshold_percent < request.warning_threshold_percent {
        return Err(QuotaRuntimeError::InvalidThresholdOrder);
    }

    Ok(())
}

fn ensure_mapping_path(path: &str, field_name: &'static str) -> QuotaRuntimeResult<()> {
    let trimmed = path.trim();

    if trimmed.is_empty() || trimmed.split('.').any(str::is_empty) {
        return Err(QuotaRuntimeError::EmptyMappingPath(field_name));
    }

    Ok(())
}

fn ensure_threshold(threshold: f64) -> QuotaRuntimeResult<()> {
    if threshold.is_finite() && (0.0..=100.0).contains(&threshold) {
        Ok(())
    } else {
        Err(QuotaRuntimeError::InvalidThreshold)
    }
}

fn read_quota_number(json: &Value, path: &str, field_name: &str) -> QuotaRuntimeResult<f64> {
    let value = read_json_path(json, path.trim())?;
    let number = value
        .as_f64()
        .filter(|number| number.is_finite())
        .ok_or_else(|| QuotaRuntimeError::NonNumericPath(path.trim().to_owned()))?;

    match field_name {
        "current" if number < 0.0 => Err(QuotaRuntimeError::InvalidCurrent),
        "limit" if number <= 0.0 => Err(QuotaRuntimeError::InvalidLimit),
        _ => Ok(number),
    }
}

fn read_json_path<'a>(json: &'a Value, path: &str) -> QuotaRuntimeResult<&'a Value> {
    let mut current = json;

    for segment in path.split('.') {
        let object = current
            .as_object()
            .ok_or_else(|| QuotaRuntimeError::NonObjectPath(path.to_owned()))?;

        current = object
            .get(segment)
            .ok_or_else(|| QuotaRuntimeError::MissingPath(path.to_owned()))?;
    }

    Ok(current)
}

fn resolve_quota_level(
    percent_used: f64,
    warning_threshold_percent: f64,
    critical_threshold_percent: f64,
) -> QuotaLevel {
    if !percent_used.is_finite() {
        return QuotaLevel::Unknown;
    }

    if percent_used >= critical_threshold_percent {
        QuotaLevel::Critical
    } else if percent_used >= warning_threshold_percent {
        QuotaLevel::Warning
    } else {
        QuotaLevel::Normal
    }
}

fn current_timestamp() -> String {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    format!("{}.{:03}Z", duration.as_secs(), duration.subsec_millis())
}

fn to_command_error(error: QuotaRuntimeError) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::TempDir;

    fn request_for(
        file_path: impl AsRef<Path>,
        current_path: &str,
        limit_path: &str,
    ) -> RefreshQuotaFileRequest {
        RefreshQuotaFileRequest {
            file_path: file_path.as_ref().to_string_lossy().into_owned(),
            json_mapping: QuotaJsonMapping {
                current_path: current_path.to_owned(),
                limit_path: limit_path.to_owned(),
            },
            warning_threshold_percent: 75.0,
            critical_threshold_percent: 90.0,
        }
    }

    fn write_quota_file(content: &str) -> (TempDir, std::path::PathBuf) {
        let temp_dir = TempDir::new().expect("应该能创建临时目录");
        let file_path = temp_dir.path().join("quota.json");

        fs::write(&file_path, content).expect("应该能写入 quota 测试文件");

        (temp_dir, file_path)
    }

    #[test]
    fn reads_mapped_quota_json_file() {
        let (_temp_dir, file_path) =
            write_quota_file(r#"{ "usage": { "current": 42, "limit": 100 } }"#);

        let state =
            refresh_quota_file_internal(request_for(file_path, "usage.current", "usage.limit"))
                .expect("合法 JSON 和映射应该能刷新 quota 状态");

        assert_eq!(state.current, 42.0);
        assert_eq!(state.limit, 100.0);
        assert_eq!(state.remaining, 58.0);
        assert_eq!(state.percent_used, 42.0);
        assert_eq!(state.level, QuotaLevel::Normal);
        assert!(state.last_loaded_at.ends_with('Z'));
        assert!(state.last_error.is_none());
    }

    #[test]
    fn fails_when_mapped_field_is_missing_or_non_numeric() {
        let (_missing_temp_dir, missing_file_path) =
            write_quota_file(r#"{ "usage": { "current": 42 } }"#);
        let missing_result = refresh_quota_file_internal(request_for(
            missing_file_path,
            "usage.current",
            "usage.limit",
        ));

        assert!(matches!(
            missing_result,
            Err(QuotaRuntimeError::MissingPath(_))
        ));

        let (_invalid_temp_dir, invalid_file_path) =
            write_quota_file(r#"{ "usage": { "current": "42", "limit": 100 } }"#);
        let invalid_result = refresh_quota_file_internal(request_for(
            invalid_file_path,
            "usage.current",
            "usage.limit",
        ));

        assert!(matches!(
            invalid_result,
            Err(QuotaRuntimeError::NonNumericPath(_))
        ));
    }

    #[test]
    fn resolves_normal_warning_and_critical_threshold_levels() {
        assert_eq!(resolve_quota_level(74.9, 75.0, 90.0), QuotaLevel::Normal);
        assert_eq!(resolve_quota_level(75.0, 75.0, 90.0), QuotaLevel::Warning);
        assert_eq!(resolve_quota_level(90.0, 75.0, 90.0), QuotaLevel::Critical);
    }

    #[test]
    fn fails_when_file_path_is_empty() {
        let result = refresh_quota_file_internal(RefreshQuotaFileRequest {
            file_path: "  ".to_owned(),
            json_mapping: QuotaJsonMapping {
                current_path: "current".to_owned(),
                limit_path: "limit".to_owned(),
            },
            warning_threshold_percent: 75.0,
            critical_threshold_percent: 90.0,
        });

        assert!(matches!(result, Err(QuotaRuntimeError::EmptyFilePath)));
    }
}
