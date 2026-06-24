# Project Rules

本目录存放所有 Agent 和工程实现必须遵守的项目规则。根目录 `AGENTS.md` 是总入口，本目录是细化规则。

## 文件索引

- `comment-style.md`：中文注释风格和文档字符串规则
- `scaffolding.md`：初始化项目结构与模板使用规则
- `dependency-policy.md`：第三方依赖、组件库和自研边界
- `react-ui.md`：React UI 架构与桌面界面规则
- `ci-cd.md`：CI/CD 工作流规则
- `security.md`：Tauri、SQLite、Agent runtime 安全边界
- `subagents.md`：多 Agent 分派、并行和主线程洁净度规则

## 适用范围

这些规则适用于：

- 主 Agent
- 子 Agent
- Codex skill 生成的组件
- 后续人工提交
- CI/CD 配置

如果规则之间冲突，优先级为：

1. `goal.md`
2. `AGENTS.md`
3. `specs/`
4. `rules/`
5. 具体任务说明

发现冲突时，不要自行猜测。将当前任务标记为 `BLOCKED`，并新增一个明确的规则修订 TODO。
