# CI/CD Rules

## 目标

CI/CD 必须让项目始终处在可验证状态。即使项目还未 scaffold，CI 也应该能验证控制文档和规则文件；当 app scaffold 出现后，再自动启用 Node、Rust 和 Tauri 检查。

## 工作流分层

### CI

触发：

- push to `main`
- push to `master`
- pull_request
- workflow_dispatch

必须检查：

- `goal.md`、`progress.md`、`AGENTS.md`、`specs/`、`rules/` 存在
- `rules/subagents.md` 存在并包含主线程洁净度约束
- `progress.md` 只使用 `TODO`、`DOING`、`DONE`、`BLOCKED`
- 主任务最多一个 `DOING`
- scaffold 后运行 `pnpm install --frozen-lockfile`
- scaffold 后运行 typecheck、lint、test
- Rust/Tauri 出现后运行 cargo check/test/clippy

### Release

触发：

- `app-v*` tag
- manual workflow_dispatch

必须：

- 使用 matrix 构建 macOS、Linux、Windows
- Linux 安装 Tauri WebKit 依赖
- 使用官方 `tauri-apps/tauri-action`
- 默认 draft release
- 不在没有 Tauri config 时发布

## 可靠性规则

- CI 必须设置 concurrency，避免同一分支重复运行浪费资源。
- CI 权限默认只读。
- Release 才允许 `contents: write`。
- Node、pnpm、Rust 版本必须显式声明。
- 依赖安装使用 frozen lockfile。
- 不允许在 CI 里自动修改源码。
- 不允许跳过测试发布。

## 当前限制

当前仓库还没有 `package.json`、`pnpm-lock.yaml` 或 Tauri app。CI 必须以 guard 方式编写：

- 文档检查总是运行。
- Node 检查只在 `package.json` 和 lockfile 存在后运行。
- Rust 检查只在 `apps/desktop/src-tauri/Cargo.toml` 存在后运行。
- Release 在 Tauri config 不存在时直接失败并提示原因。

## 后续增强

项目 scaffold 后应补充：

- Playwright smoke test
- Tauri build artifact upload
- dependency audit
- license check
- changelog/release note 生成
- macOS/Windows signing
- updater signing
