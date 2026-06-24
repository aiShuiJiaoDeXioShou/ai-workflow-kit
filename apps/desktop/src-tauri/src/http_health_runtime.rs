use reqwest::{Client, Method, Url};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum HttpHealthRuntimeError {
    #[error("url 不能为空")]
    EmptyUrl,
    #[error("HTTP method 不支持：{0}")]
    UnsupportedMethod(String),
    #[error("timeoutMs 必须大于 0")]
    InvalidTimeout,
    #[error("URL 格式无效：{0}")]
    InvalidUrl(String),
    #[error("HTTP client 初始化失败：{0}")]
    BuildClient(#[source] reqwest::Error),
    #[error("HTTP 请求失败：{0}")]
    Request(#[source] reqwest::Error),
}

type HttpHealthRuntimeResult<T> = Result<T, HttpHealthRuntimeError>;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckHttpHealthRequest {
    pub url: String,
    pub method: String,
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckHttpHealthResponse {
    pub status_code: u16,
}

#[tauri::command]
pub async fn check_http_health(
    request: CheckHttpHealthRequest,
) -> Result<CheckHttpHealthResponse, String> {
    check_http_health_internal(request)
        .await
        .map_err(to_command_error)
}

async fn check_http_health_internal(
    request: CheckHttpHealthRequest,
) -> HttpHealthRuntimeResult<CheckHttpHealthResponse> {
    validate_request(&request)?;

    let client = Client::builder()
        .timeout(Duration::from_millis(request.timeout_ms))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(HttpHealthRuntimeError::BuildClient)?;
    let method = parse_method(&request.method)?;
    let url = Url::parse(request.url.trim())
        .map_err(|error| HttpHealthRuntimeError::InvalidUrl(error.to_string()))?;
    let response = client
        .request(method, url)
        .send()
        .await
        .map_err(HttpHealthRuntimeError::Request)?;

    Ok(CheckHttpHealthResponse {
        status_code: response.status().as_u16(),
    })
}

fn validate_request(request: &CheckHttpHealthRequest) -> HttpHealthRuntimeResult<()> {
    if request.url.trim().is_empty() {
        return Err(HttpHealthRuntimeError::EmptyUrl);
    }

    if request.timeout_ms == 0 {
        return Err(HttpHealthRuntimeError::InvalidTimeout);
    }

    parse_method(&request.method)?;

    Ok(())
}

fn parse_method(method: &str) -> HttpHealthRuntimeResult<Method> {
    match method.trim().to_ascii_uppercase().as_str() {
        "GET" => Ok(Method::GET),
        "HEAD" => Ok(Method::HEAD),
        "POST" => Ok(Method::POST),
        other => Err(HttpHealthRuntimeError::UnsupportedMethod(other.to_owned())),
    }
}

fn to_command_error(error: HttpHealthRuntimeError) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        io::{Read, Write},
        net::TcpListener,
        thread,
    };

    fn spawn_single_response_server(status_line: &'static str) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").expect("应该能绑定本地测试端口");
        let address = listener.local_addr().expect("应该能读取本地测试地址");

        thread::spawn(move || {
            if let Ok((mut stream, _peer)) = listener.accept() {
                let mut buffer = [0_u8; 1024];
                let _ = stream.read(&mut buffer);
                let response = format!(
                    "HTTP/1.1 {status_line}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                );
                let _ = stream.write_all(response.as_bytes());
            }
        });

        format!("http://{address}/health")
    }

    #[tokio::test]
    async fn reports_status_code_from_http_endpoint() {
        let url = spawn_single_response_server("204 No Content");
        let result = check_http_health_internal(CheckHttpHealthRequest {
            url,
            method: "GET".to_owned(),
            timeout_ms: 1_000,
        })
        .await
        .expect("本地 HTTP 端点应该能完成检测");

        assert_eq!(result.status_code, 204);
    }

    #[test]
    fn rejects_unsupported_methods() {
        let result = validate_request(&CheckHttpHealthRequest {
            url: "https://example.com".to_owned(),
            method: "PUT".to_owned(),
            timeout_ms: 1_000,
        });

        assert!(matches!(
            result,
            Err(HttpHealthRuntimeError::UnsupportedMethod(_))
        ));
    }
}
