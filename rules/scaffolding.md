# Scaffolding Rules

## 初始化原则

初始化项目时必须使用官方或成熟模板作为起点，而不是手写等价脚手架。

优先顺序：

1. Tauri 官方 create/init flow
2. Vite React TypeScript 官方模板
3. 可信 MIT/Apache/BSD 类 Tauri React 模板
4. 手动创建缺失的 monorepo glue 文件

禁止直接复制 GPL 项目源码。GPL 项目可以作为目录组织和 CI 思路参考，但不能复制实现。

## 推荐路径

scaffold 任务应按以下顺序执行：

1. 确认 Node、pnpm、Rust 版本满足 `specs/10-initialization.md`。
2. 使用 Vite React TypeScript 模板创建 `apps/desktop` 前端。
3. 使用 Tauri v2 init/create flow 创建 `apps/desktop/src-tauri`。
4. 整理 root workspace 文件：
   - `package.json`
   - `pnpm-workspace.yaml`
   - `tsconfig.base.json`
5. 创建 package shell：
   - `packages/component-sdk`
   - `packages/components`
   - `packages/agent-runtime`
6. 保持 `apps/desktop` 为唯一 Tauri app。
7. 添加最小 Tauri capabilities。
8. 运行 scaffold 验证。

## 参考模板

可参考：

- Tauri 官方 React/Vite 模板
- `MrLightful/create-tauri-react`
- `dannysmith/tauri-template`
- `RoyRao2333/template-tauri-vite-react-ts-tailwind`
- `luochang212/skill-zoo`

参考时只借鉴结构、脚本和工具选择，不复制业务代码。

## 不允许的初始化方式

- 手写一套没有模板来源的 Vite/Tauri 基础文件。
- 把 Tauri app 放在仓库根目录后长期不迁移。
- 在 scaffold 阶段引入完整业务代码。
- 在 scaffold 阶段引入远程插件系统。
- 先写 CI 发布工作流但没有基础质量检查。

## 验收要求

scaffold 完成前至少验证：

```txt
node --version
pnpm --version
rustc --version
cargo --version
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm cargo:check
```

如果 Node 版本低于规则要求，任务必须 `BLOCKED`，不要强行安装依赖。

