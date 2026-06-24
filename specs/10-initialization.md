# Initialization Baseline

## Purpose

This file defines the project structure and dependency baseline to use before scaffold or business implementation begins. It was originally based on official Tauri and tldraw documentation, npm and Cargo registry checks, and a lightweight review of similar open source projects. The active canvas decision has since moved to FlowGram free layout.

The goal is to avoid an accidental scaffold that is hard to evolve. Future implementation tasks should treat this file as the source of truth for initial structure, package manager, dependency families, and dependency boundaries.

## Reference Projects Reviewed

### Skill Zoo

Repository: <https://github.com/luochang212/skill-zoo>

Why relevant:

- Tauri v2 desktop app for managing AI agent skills.
- Uses React, TypeScript, Vite, Tailwind, Rust backend, tests, and a `skills/` folder.
- Has a practical split between frontend hooks/components/types and Rust commands/services/store.

Useful patterns to borrow:

- Keep Tauri commands thin and move real work into Rust services.
- Keep frontend data access behind hooks and query layers.
- Include Rust tests early for local filesystem and persistence behavior.
- Treat skills as first-class project artifacts, not loose docs.

What not to copy:

- Do not adopt Bun as the package manager for this project. `pnpm` is a better fit for the planned multi-package workspace and is also common in mature Tauri apps.
- Do not copy its skill file persistence model directly. Our skills generate workflow components, while Skill Zoo manages external skill directories.

### Clash Verge Rev

Repository: <https://github.com/clash-verge-rev/clash-verge-rev>

Why relevant:

- Large, mature Tauri v2 desktop app.
- Uses `pnpm`, Tauri permissions, Rust backend modules, frontend app code, and a packaging pipeline.
- Shows how desktop apps with local process/network responsibilities keep native capability boundaries explicit.

Useful patterns to borrow:

- Use `pnpm` and workspace-friendly scripts.
- Keep Tauri capabilities explicit and reviewable.
- Allow Rust crates/modules to grow as native responsibilities grow.
- Keep app commands and frontend commands separate from packaging scripts.

What not to copy:

- Do not copy source code because the project is GPL-3.0-only.
- Do not adopt its full UI stack or proxy-specific complexity.
- Do not add broad shell permissions just because a mature local app needs them.

### FlowGram

Repository: <https://github.com/bytedance/flowgram.ai>

Why relevant:

- The core infinite canvas engine chosen for this project.
- Uses a monorepo with apps, packages, internal tooling, and templates.
- Official docs and templates support free layout workflow nodes, drag/drop, edges, node forms, minimap, history, and auto layout.

Useful patterns to borrow:

- Separate app code from reusable packages.
- Implement workflow components as FlowGram nodes through node registries.
- Persist FlowGram document JSON and session state separately.
- Keep node data small and validated.

What not to copy:

- Do not copy FlowGram demo implementation wholesale beyond public API patterns.
- Do not start with multiplayer sync.
- Track FlowGram React and TypeScript compatibility when upgrading.

### Rivet

Repository: <https://github.com/Ironclad/rivet>

Why relevant:

- Open source visual AI programming environment and TypeScript library.
- Its workspace separates core logic, node/runtime integrations, app shell, executor, and CLI.

Useful patterns to borrow:

- Keep the component SDK independent from the desktop UI.
- Keep runtime/executor concerns separate from canvas rendering.
- Preserve the option to expose capabilities through a CLI later.

What not to copy:

- Do not implement a full graph execution engine in v1.
- Do not start with Rivet-style node graph semantics. Our v1 canvas is a light orchestration workbench.

### Claw Orchestrator

Repository: <https://github.com/Enderfga/claw-orchestrator>

Why relevant:

- Runtime for wrapping Claude Code, Codex, Gemini, Cursor Agent, OpenCode, and custom CLIs.
- Has a multi-engine abstraction, persistent sessions, streaming events, and a dashboard.

Useful patterns to borrow:

- Model agents as adapters behind a common session/run interface.
- Keep process lifecycle, stdout/stderr streaming, and run history explicit.
- Treat each engine as a capability behind a safe adapter, not as arbitrary shell access.

What not to copy:

- Do not bring in multi-agent council, autoloop, proxy, MCP server, or 65-tool runtime scope in v1.
- Do not couple the desktop shell to a single agent runtime implementation.

## Final Initialization Decisions

### Package Manager

Use `pnpm`.

Target:

```txt
pnpm 11.x
```

Registry check on 2026-06-23 returned:

```txt
pnpm 11.8.0
```

Reasoning:

- Works well with monorepos and workspace packages.
- Keeps dependency installation deterministic through `pnpm-lock.yaml`.
- Matches mature Tauri app practice seen in Clash Verge Rev.
- Avoids coupling this project to Bun-specific execution behavior.

### Runtime Prerequisites

Target local tooling:

```txt
Node.js >= 22.12
pnpm >= 11
Rust >= 1.85
Cargo >= matching Rust toolchain
```

Current local check during research:

```txt
node v20.18.1
npm 10.8.2
rustc 1.93.0
cargo 1.93.0
```

Implication:

- Rust is ready.
- Node should be upgraded or pinned through a tool manager before running the scaffold task.
- The scaffold task should add a checked-in tool hint such as `.nvmrc`, `.node-version`, or `package.json#engines`.

Recommended checked-in version hints:

```txt
.node-version -> 22.12.0 or newer 22 LTS
package.json engines.node -> >=22.12
package.json packageManager -> pnpm@11.8.0
```

## Target Repository Structure

The initialized repository should use this shape:

```txt
.
├── goal.md
├── progress.md
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── specs/
├── apps/
│   └── desktop/
│       ├── package.json
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── src/
│       │   ├── main.tsx
│       │   ├── app/
│       │   ├── canvas/
│       │   ├── palette/
│       │   ├── inspector/
│       │   ├── runtime/
│       │   ├── shell/
│       │   ├── styles/
│       │   └── test/
│       └── src-tauri/
│           ├── Cargo.toml
│           ├── build.rs
│           ├── tauri.conf.json
│           ├── capabilities/
│           │   └── default.json
│           └── src/
│               ├── main.rs
│               ├── lib.rs
│               ├── commands/
│               ├── db/
│               ├── runtime/
│               ├── services/
│               ├── state.rs
│               └── error.rs
├── packages/
│   ├── component-sdk/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   ├── components/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── registry.ts
│   │       ├── core-monitor-http-health/
│   │       ├── core-quota-tracker/
│   │       └── core-agent-launcher/
│   └── agent-runtime/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
└── skills/
    └── workflow-component/
        └── SKILL.md
```

## Workspace Boundaries

### Root Workspace

Root owns:

- workspace scripts
- shared TypeScript config
- shared lint and format config
- lockfile
- project-level documentation

Root must not contain app runtime code.

### `apps/desktop`

Owns:

- Tauri desktop app
- React shell
- FlowGram editor integration
- panels and layout
- Tauri command calls
- desktop app tests

It may depend on:

- `@ai-workflow-kit/component-sdk`
- `@ai-workflow-kit/components`
- `@ai-workflow-kit/agent-runtime`

### `packages/component-sdk`

Owns:

- shared types
- manifest validation
- action result contracts
- component props
- config schema helpers

It must not depend on:

- `apps/desktop`
- Tauri APIs
- FlowGram runtime APIs unless a type-only adapter becomes unavoidable

### `packages/components`

Owns:

- trusted component registry
- HTTP health monitor component
- quota tracker component
- Agent adapter launcher component

Component directory names use manifest type names with dots converted to hyphens, for example `core.monitor.http-health` becomes `core-monitor-http-health`.

It may depend on:

- component SDK
- React
- zod

It must not:

- call Tauri commands directly
- spawn processes directly
- access SQLite directly

### `packages/agent-runtime`

Owns:

- TypeScript-facing adapter types
- run status types
- event payload types
- frontend helpers for displaying run state

Actual process spawning stays in Tauri/Rust.

## Frontend Dependency Baseline

Use these dependency families for the first scaffold.

Core app:

```txt
@tauri-apps/api 2.11.1
react 19.2.7
react-dom 19.2.7
@flowgram.ai/free-layout-editor 1.0.12
@tanstack/react-query 5.101.0
zustand 5.0.14
zod 4.4.3
lucide-react 1.21.0
clsx 2.1.1
tailwind-merge 3.6.0
sonner 2.0.7
nanoid 5.1.15
react-error-boundary 6.1.2
```

Third-party UI primitives:

```txt
@radix-ui/react-dialog 1.1.17
@radix-ui/react-dropdown-menu 2.1.18
@radix-ui/react-tooltip 1.2.10
@radix-ui/react-tabs 1.1.15
@radix-ui/react-switch 1.3.1
@radix-ui/react-checkbox 1.3.5
@radix-ui/react-slider 1.4.1
@radix-ui/react-select 2.3.1
@radix-ui/react-scroll-area 1.2.12
@radix-ui/react-separator 1.1.10
```

Forms and validation:

```txt
react-hook-form 7.80.0
@hookform/resolvers 5.4.0
zod 4.4.3
```

Styling and build:

```txt
tailwindcss 4.3.1
@tailwindcss/vite 4.3.1
vite 8.0.16
@vitejs/plugin-react 6.0.2
typescript 6.0.3
```

Testing and quality:

```txt
vitest 4.1.9
@testing-library/react 16.3.2
@testing-library/jest-dom 6.9.1
jsdom 29.1.1
@playwright/test 1.61.0
oxlint 1.71.0
prettier 3.8.4
@types/react 19.x
@types/react-dom 19.x
@types/node 22.x
```

Do not add these in the initial scaffold unless a task needs them:

- React Router
- Monaco
- CodeMirror
- MUI
- Framer Motion
- i18n
- remote data clients

The initial scaffold may include Radix UI primitives listed above because common desktop controls should not be hand-rolled. Additional third-party components should still be introduced by the task that needs them.

## Tauri and Rust Dependency Baseline

Use Tauri v2.

Rust dependencies:

```toml
tauri = { version = "2.11.3", features = [] }
serde = { version = "1.0.228", features = ["derive"] }
serde_json = "1.0.150"
tokio = { version = "1.52.3", features = ["macros", "rt-multi-thread", "process", "sync", "time"] }
sqlx = { version = "0.9.0", features = ["runtime-tokio-rustls", "sqlite", "migrate", "chrono", "uuid"] }
chrono = { version = "0.4.45", features = ["serde"] }
uuid = { version = "1.23.3", features = ["v4", "serde"] }
directories = "6.0.0"
thiserror = "2.0.18"
tracing = "0.1.44"
tracing-subscriber = "0.3.23"
```

Build dependencies:

```toml
tauri-build = { version = "2.6.3", features = [] }
```

Tauri plugins to include initially:

```txt
@tauri-apps/plugin-opener 2.5.4
tauri-plugin-opener 2.5.4
```

Tauri plugins to defer:

```txt
@tauri-apps/plugin-sql / tauri-plugin-sql
@tauri-apps/plugin-shell / tauri-plugin-shell
@tauri-apps/plugin-dialog / tauri-plugin-dialog
@tauri-apps/plugin-process / tauri-plugin-process
@tauri-apps/plugin-updater / tauri-plugin-updater
```

Reasoning:

- SQLite should be handled by Rust `sqlx` behind Tauri commands, not directly from frontend JavaScript.
- Process spawning should be handled by Rust `tokio::process::Command` behind allowlisted Tauri commands, not by exposing a generic shell plugin.
- Dialog, process restart, updater, and filesystem plugins are useful later but not needed to prove the v1 canvas/component/runtime loop.

## Security Baseline

Initial Tauri capabilities should be minimal:

```json
{
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-toggle-maximize",
    "opener:default"
  ]
}
```

Do not include:

```txt
shell:allow-execute
shell:allow-spawn
fs:default
sql:default
process:default
```

Any future permission must be introduced by a dedicated task and validated against the relevant spec.

## Initial Scripts

Root scripts:

```json
{
  "dev": "pnpm --filter @ai-workflow-kit/desktop dev",
  "tauri": "pnpm --filter @ai-workflow-kit/desktop tauri",
  "typecheck": "pnpm -r typecheck",
  "test": "pnpm -r test",
  "lint": "pnpm -r lint",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

Desktop scripts:

```json
{
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "lint": "oxlint src"
}
```

Rust validation scripts may be root scripts later:

```json
{
  "cargo:check": "cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml",
  "cargo:test": "cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml",
  "cargo:clippy": "cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml -- -D warnings"
}
```

## Scaffold Strategy

The scaffold task should not accept the default single-package Tauri layout blindly. It should produce the target workspace layout above.

Recommended approach:

1. Create root `package.json`, `pnpm-workspace.yaml`, and `tsconfig.base.json`.
2. Create `apps/desktop` using Tauri React TypeScript template or manual Vite + Tauri init.
3. Move or edit generated files until `src-tauri` lives under `apps/desktop`.
4. Add package names:
   - `@ai-workflow-kit/desktop`
   - `@ai-workflow-kit/component-sdk`
   - `@ai-workflow-kit/components`
   - `@ai-workflow-kit/agent-runtime`
5. Add empty package shells for SDK, components, and agent-runtime.
6. Add minimal Tauri capabilities only.
7. Add dependency baseline from this file.
8. Run validation.

## Scaffold Validation

Before marking `Scaffold desktop app shell` as `DONE`, run:

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
pnpm --filter @ai-workflow-kit/desktop tauri --version
```

If local Node remains below target, mark the scaffold task `BLOCKED` with the Node version reason rather than forcing dependency installation on an unsupported runtime.

## CI/CD Baseline

The repository includes guarded GitHub Actions workflows before the app scaffold exists:

```txt
.github/workflows/ci.yml
.github/workflows/release.yml
```

`ci.yml` always validates repository control files and status rules. Node quality checks activate only after `package.json` and `pnpm-lock.yaml` exist. Rust quality checks activate only after `apps/desktop/src-tauri/Cargo.toml` exists.

`release.yml` is intended for future Tauri releases. It fails early with a clear scaffold message until `apps/desktop/src-tauri/tauri.conf.json` exists.

Rules for these workflows live in:

```txt
rules/ci-cd.md
specs/11-project-rules-and-ci.md
```

## References

- Skill Zoo: <https://github.com/luochang212/skill-zoo>
- Clash Verge Rev: <https://github.com/clash-verge-rev/clash-verge-rev>
- FlowGram: <https://github.com/bytedance/flowgram.ai>
- Rivet: <https://github.com/Ironclad/rivet>
- Claw Orchestrator: <https://github.com/Enderfga/claw-orchestrator>
- Tauri create project: <https://v2.tauri.app/start/create-project/>
- Tauri capabilities: <https://v2.tauri.app/security/capabilities/>
- Tauri SQL plugin docs: <https://v2.tauri.app/plugin/sql/>
- Tauri shell plugin docs: <https://v2.tauri.app/plugin/shell/>
- FlowGram docs: <https://flowgram.ai/>
