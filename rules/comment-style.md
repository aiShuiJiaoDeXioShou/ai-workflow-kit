# Comment Style Rules

## 总原则

所有代码注释、TSDoc、Rust doc comment 和 TODO 注释默认使用中文风格。

中文风格不是逐字翻译英文，而是给未来维护者解释：

- 为什么这样设计
- 有哪些边界条件
- 与第三方库的适配取舍
- 有哪些安全或数据一致性风险
- 后续修改时不能破坏什么

## TypeScript / React

推荐：

```ts
// 组件配置只保存可序列化字段，避免把运行态塞进 FlowGram node。
const config = normalizeComponentConfig(rawConfig)
```

不推荐：

```ts
// Normalize the config.
const config = normalizeComponentConfig(rawConfig)

// 设置 config 变量。
const config = normalizeComponentConfig(rawConfig)
```

公共类型、SDK 接口和复杂 hook 应使用中文 TSDoc：

```ts
/**
 * 工作流组件的静态声明。
 *
 * manifest 会进入 trusted registry，因此必须保持可序列化且全局唯一。
 */
export type WorkflowComponentManifest = {}
```

## Rust

Rust doc comment 也使用中文：

```rust
/// 启动一个 allowlist 中声明过的 Agent 进程。
///
/// 不接受前端传入的任意 shell 字符串，避免绕过 adapter 校验。
pub async fn start_agent_run() {}
```

## TODO 格式

TODO 必须说明原因或退出条件：

```ts
// TODO: 接入 OS keychain 后移除临时 token 占位字段。
```

不要写空泛 TODO：

```ts
// TODO: improve
```

## 允许英文的情况

以下内容可以保留英文：

- 第三方 API 名称，例如 `useQuery`、`ShapeUtil`
- 协议字段名，例如 `stdout`、`stderr`
- 事件名，例如 `agent_run_started`
- 命令名，例如 `pnpm tauri dev`
- license header
- 外部错误码或标准术语

## 注释密度

不要为了满足中文要求到处加注释。简单代码不需要注释。

需要注释的地方：

- 安全边界
- 数据迁移
- 持久化策略
- FlowGram node 与 SQLite 状态拆分
- Agent 进程生命周期
- 组件 SDK 兼容性
- CI/CD 发布风险
