# AI Workflow Kit Agent Rules

## 最高优先级

所有 Agent 在开始任何任务前，必须按顺序读取：

1. `goal.md`
2. `progress.md`
3. 与任务相关的 `specs/`
4. 与任务相关的 `rules/`

如果这些文件与聊天记录冲突，以仓库文件为准。聊天记录只能作为补充背景，不能作为唯一事实来源。

## 执行循环

每轮只领取一个 `TODO`。领取后必须立刻把该任务改为 `DOING`。

完成实现后必须运行对应验证。验证通过才能改为 `DONE`。验证失败、信息不足、环境缺失或范围不清时，改为 `BLOCKED` 并写明原因。

主 Agent 同时最多只能有一个 `DOING`。默认保持主线程干净：主 Agent 负责调度、集成和最终验收，具体探索、实现、验证应尽量分派给 subagents。

需要并行时，每个子 Agent 只能拿一个任务、相关文件、验收标准和验证命令。Subagent 不直接领取新的顶层 TODO，也不直接决定 `progress.md` 的最终状态。

更多细则见 `rules/subagents.md`。

## 项目定位

这是一个本地优先的 AI 工作流桌面应用：

- Tauri + React + TypeScript + Vite
- FlowGram free layout 工作流画布作为 root view
- SQLite 本地持久化
- trusted local packages 组件系统
- allowlisted local CLI agent runtime
- 轻量编排，不做 v1 完整 DAG 工作流引擎

不要把项目做成传统管理后台、营销落地页、云同步平台或完整流程引擎。

## 初始化规则

初始化项目结构时，必须优先使用官方或成熟模板：

- 优先用 Vite React TypeScript 模板创建前端结构。
- 优先用 Tauri v2 官方 init/create flow 创建桌面壳。
- 可参考 GitHub 上成熟 Tauri React 模板的目录组织，但不要复制 GPL 项目源码。
- 不允许手写一套与模板等价的原始脚手架，除非模板无法满足 monorepo 布局且原因已写入任务记录。

初始化后再整理成 `specs/10-initialization.md` 定义的 monorepo 结构。

## 语言与注释规则

代码注释统一使用中文风格。注释应该解释业务意图、边界、取舍和风险，不解释语法本身。

允许保留英文的情况：

- 第三方库原始 API 名称
- 协议字段名
- 标准 license header
- 外部规范要求的固定字符串
- 错误码、事件名、命令名

更多细则见 `rules/comment-style.md`。

## 第三方组件优先

通用能力优先使用成熟第三方库，不手写基础设施：

- 工作流画布用 FlowGram free layout
- UI 基础组件优先 Radix UI primitives 或后续选定的组件库
- 图标用 lucide-react
- 数据请求和缓存用 TanStack Query
- schema 和运行时校验用 zod
- 表单用 react-hook-form + zod resolver
- 测试用 Vitest、Testing Library、Playwright
- 桌面壳用 Tauri 官方能力

不要为了普通按钮、菜单、弹窗、tabs、tooltip、select、slider、checkbox、switch、scroll-area 手写可访问性交互。

更多细则见 `rules/dependency-policy.md` 和 `rules/react-ui.md`。

## 安全边界

不要向前端暴露通用 shell、通用 SQL 或任意文件系统能力。

- SQLite 通过 Rust `sqlx` 和受控 Tauri commands 管理。
- CLI/Agent 运行通过 Rust allowlist adapter 管理。
- 组件不能直接调用 Tauri commands。
- 组件不能直接运行进程。
- 组件配置不能明文存储密钥。
- Tauri capabilities 必须最小化。

更多细则见 `rules/security.md`。

## CI/CD 要求

CI/CD 必须随着项目结构逐步启用，不能依赖人工记忆。

最低要求：

- 每次 push 和 PR 验证控制文档、规则文件、状态格式。
- scaffold 后启用 pnpm install、typecheck、lint、test。
- Tauri 后端出现后启用 cargo check/test/clippy。
- release 只允许从 tag 或手动 workflow 触发。
- 发布工作流使用官方 Tauri GitHub Action 或明确记录替代原因。

更多细则见 `rules/ci-cd.md`。

## 禁止事项

- 不要绕过 `progress.md` 做大块实现。
- 不要一次领取多个 TODO。
- 不要让 subagent 接收没有文件范围、验收标准或验证命令的模糊任务。
- 不要让 subagent 修改未分配文件或覆盖其他 Agent 的变更。
- 不要把业务代码放在仓库根目录。
- 不要用自研画布替代 FlowGram，除非有新规格批准。
- 不要自研基础 UI 控件。
- 不要引入远程动态代码加载。
- 不要开放任意 shell 字符串执行。
- 不要把测试失败的任务标记为 `DONE`。
- 不要恢复或删除用户已有改动，除非用户明确要求。

## 完成响应

最终回复必须说明：

- 修改了哪些文件
- 验证运行了什么
- 是否有未解决风险或 blocker

如果没有运行某类验证，必须说明原因。
