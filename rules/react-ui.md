# React UI Rules

## 架构目标

UI 使用 React 编写，保持桌面工作台形态。应用首屏就是 root canvas，不做 landing page。

推荐分层：

```txt
apps/desktop/src/
├── app/
├── canvas/
├── palette/
├── inspector/
├── runtime/
├── shell/
├── styles/
└── test/
```

## 组件边界

- `app/` 负责应用装配和 provider。
- `canvas/` 负责 FlowGram 集成、节点注册、拖拽落点、连线和 canvas state。
- `palette/` 负责组件列表和拖拽源。
- `inspector/` 负责选中组件配置。
- `runtime/` 负责 action、agent run、日志展示的前端状态。
- `shell/` 负责布局、工具栏、抽屉、通用 UI primitives。

不要把所有组件堆在一个 `components/` 目录里。

## 第三方 UI 组件

常见交互控件优先使用第三方组件：

- Dialog
- DropdownMenu
- Tooltip
- Tabs
- Select
- Checkbox
- Switch
- Slider
- ScrollArea
- Separator

默认选择 Radix UI primitives。视觉样式由本项目 Tailwind/CSS variables 控制。

## 视觉规则

遵守 `specs/07-ui-shell.md`：

- 工业工具感
- 高密度、克制、适合长期使用
- full-bleed canvas
- 左侧 palette
- 右侧 inspector
- 底部 run log drawer
- 不做营销 hero
- 不做嵌套卡片
- 不使用装饰性渐变背景

## React 状态规则

- 远程或 Tauri command 数据用 TanStack Query。
- 纯客户端 UI 状态可用 Zustand。
- 表单用 react-hook-form + zod。
- 组件配置必须保持 JSON 可序列化。
- 不把 FlowGram document 当业务数据库。

## 可访问性

使用第三方 headless 组件时，不要破坏其键盘和 ARIA 行为。

图标按钮必须有可读名称：

- `aria-label`
- tooltip
- visible label

## 禁止事项

- 不自研通用弹窗、菜单、tabs、select、tooltip。
- 不使用 emoji 作为图标。
- 不让组件直接调用 Tauri command。
- 不在 CanvasView 内执行进程或读写 SQLite。
- 不把业务状态塞进 FlowGram node data。
