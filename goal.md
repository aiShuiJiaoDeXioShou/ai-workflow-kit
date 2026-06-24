# AI Workflow Kit Goal

## Product Goal

构建一个本地优先的 AI 工作流桌面应用。应用启动后直接进入无限画布，用户可以把监控、额度、Agent 控制台、命令运行器等能力作为组件拖拽到画布上，进行配置、运行和观察。

这个项目的核心不是传统仪表盘，而是一个可以持续扩展的个人 AI 工作台。画布是 root view，组件是能力单元，Agent runtime 是执行入口，Codex skill 是持续生成新组件的生产工具。

## V1 Decisions

- Desktop stack: Tauri + React + TypeScript + Vite
- Root view: FlowGram free layout workflow canvas
- Storage: local SQLite
- Component model: trusted local packages
- Agent model: allowlisted local CLI runner
- Orchestration model: light orchestration, not full DAG execution
- UI direction: industrial/utilitarian workbench

## V1 Success Criteria

- App opens directly into the root canvas.
- Components can be dragged onto the workflow canvas as nodes, moved, connected, deleted, saved, and restored.
- Selected components can be configured from an inspector.
- HTTP health monitor, quota tracker, and Agent adapter launcher prove the SDK loop.
- A CLI runner can start, stop, stream logs, and persist run history.
- A Codex skill can generate a new trusted component following the SDK.
- Future agents such as Codex, clawdbot, or harness can be added through adapters without rewriting the shell.

## Out Of Scope

- Cloud sync
- Team collaboration
- Plugin marketplace
- Remote dynamic code loading
- Full workflow scheduler
- Automatic DAG retries or compensation
- Deep product-specific integrations for Codex, clawdbot, or harness
- Third-party component sandboxing
- Account system and multi-user permissions

## Execution Protocol

Every implementation round must restore context from files, not from chat memory.

1. Read `goal.md`.
2. Read `progress.md`.
3. Read all relevant files in `specs/`.
4. Pick exactly one `TODO`.
5. Change that item to `DOING` immediately.
6. Implement only that item.
7. Run the task's validation command.
8. Mark `DONE` only if validation passes.
9. Mark `BLOCKED` if validation fails or required information is missing.
10. Repeat until no `TODO` items remain.

The main Agent should keep the main thread clean. For non-trivial work, it should delegate concrete exploration, implementation, and verification subtasks to subagents whenever the work can be scoped safely.

When parallel work is needed, each sub Agent receives only one task, relevant files, acceptance criteria, and validation commands. The sub Agent may return only change summary, validation result, failure reason, and next-step recommendation. The main Agent remains responsible for integration, final validation, and `progress.md` updates.

## Progress Rules

- `progress.md` is the execution source of truth.
- Valid statuses are only `TODO`, `DOING`, `DONE`, and `BLOCKED`.
- The main Agent may have at most one `DOING` task at a time.
- A `DONE` task must have passed validation.
- A `BLOCKED` task must include a short reason.
- Do not add a task unless it has a clear validation path.
