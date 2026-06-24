# Security Rules

## Tauri 权限

Tauri capabilities 必须最小化。初始权限只允许：

```txt
core:default
core:window:allow-destroy
core:window:allow-start-dragging
core:window:allow-toggle-maximize
opener:default
```

`core:window:allow-destroy` 只允许用于 Tauri `closeRequested` 中“保存画布成功后销毁当前窗口”的路径。不要把它扩展成通用窗口管理 UI。

新增权限必须满足：

- 有对应任务
- 有规格说明
- 有验证命令
- 有安全理由

## SQLite

SQLite 只能通过 Rust 后端访问。前端不能直接拿 SQL 连接。

原因：

- 避免任意 SQL 从 WebView 进入数据库
- 让迁移集中管理
- 让保存失败、事务、日志和恢复策略可测试

## Agent Runtime

Agent/CLI 运行只能通过 allowlisted adapter。

禁止：

- 前端传任意 shell 字符串
- 组件直接 spawn 进程
- 暴露 `shell:allow-execute` 给通用 UI
- 把用户输入拼接进 shell

允许：

- 前端传结构化 action input
- Rust 根据 adapter schema 校验参数
- Rust 使用受控 command/args 启动进程
- stdout/stderr 分流记录

## 组件安全

V1 只支持 trusted local packages。

禁止：

- 远程动态代码加载
- 第三方插件市场
- iframe 沙箱外的未知代码执行
- 组件绕过 registry
- 组件保存明文密钥

## 密钥

组件 config 不能保存 plaintext secret。后续需要密钥时，使用 OS keychain 或 Tauri Stronghold，并在 specs 中补充设计。
