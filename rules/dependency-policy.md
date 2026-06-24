# Dependency Policy

## 第三方优先

通用功能优先使用成熟第三方库。不要自研已经被生态解决得很好的基础能力。

必须优先使用第三方库的领域：

- 无限画布
- 弹窗、菜单、tooltip、tabs、select、checkbox、switch、slider
- 图标
- 表单状态和校验
- 客户端缓存
- 日期和 ID 工具
- 单元测试、组件测试、端到端测试
- Tauri 桌面能力

## 当前推荐依赖

核心：

```txt
react
react-dom
vite
typescript
@tauri-apps/api
@flowgram.ai/free-layout-editor
```

UI：

```txt
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-tooltip
@radix-ui/react-tabs
@radix-ui/react-switch
@radix-ui/react-checkbox
@radix-ui/react-slider
@radix-ui/react-select
@radix-ui/react-scroll-area
@radix-ui/react-separator
lucide-react
```

状态和数据：

```txt
@tanstack/react-query
zustand
zod
react-hook-form
@hookform/resolvers
nanoid
```

样式：

```txt
tailwindcss
@tailwindcss/vite
clsx
tailwind-merge
```

测试和质量：

```txt
vitest
@testing-library/react
@testing-library/jest-dom
jsdom
@playwright/test
oxlint
prettier
```

Rust：

```txt
tauri
tokio
sqlx
serde
serde_json
uuid
chrono
thiserror
tracing
```

## 引入依赖的判断

可以引入依赖，当它满足至少一项：

- 明显减少自研复杂度
- 提供可访问性或跨平台兼容能力
- 是该领域事实标准
- 与现有架构边界吻合
- 能显著提高测试可靠性

不要引入依赖，当它只是：

- 包装几行简单代码
- 只服务一个小样式
- 与现有依赖重复
- 要求放宽安全边界
- 让 bundle 或 native 构建复杂度明显升高

## 版本策略

- 新依赖必须通过 package manager 安装并进入 lockfile。
- 不手写依赖条目绕过 lockfile。
- 大版本升级必须单独任务处理。
- Tauri JS 包和 Rust crate 版本必须同一主版本。
- FlowGram 版本升级必须检查 node registry、dropCard、document JSON、edge persistence 和 React peer compatibility。

## 第三方组件封装

第三方 UI 组件不应散落全项目。

推荐做法：

- 在 `apps/desktop/src/shell/ui/` 或类似目录封装项目级 UI primitives。
- 页面和业务组件使用项目封装，不直接依赖 Radix 低层细节。
- 图标统一从 `lucide-react` 引入。
- 画布组件通过 FlowGram node registry 和 component SDK 接入，不绕过 trusted component registry。
