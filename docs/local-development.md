# Local Development Commands

## Toolchain

Use the checked-in Node version:

```bash
nvm use 24.15.0
```

Package manager:

```bash
pnpm --version
```

Expected major version:

```txt
11.x
```

Rust is required for the Tauri backend:

```bash
rustc --version
cargo --version
```

## Install

Install workspace dependencies from the lockfile:

```bash
pnpm install --frozen-lockfile
```

Use plain `pnpm install` only when intentionally updating dependencies.

## Run The App

Start the Tauri desktop app:

```bash
pnpm tauri dev
```

Run only the Vite frontend during UI iteration:

```bash
pnpm dev
```

The Vite server is configured by `apps/desktop/vite.config.ts` and uses port `1420` for Tauri development.

## Workspace Quality Checks

Run TypeScript checks across workspace packages:

```bash
pnpm typecheck
```

Run Vitest across workspace packages:

```bash
pnpm test
```

Run oxlint across workspace packages:

```bash
pnpm lint
```

Run all three before marking most TypeScript tasks as `DONE`:

```bash
pnpm typecheck && pnpm test && pnpm lint
```

## Rust And Tauri Checks

Run the configured Cargo check through pnpm:

```bash
pnpm cargo:check
```

Run Rust tests directly:

```bash
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Run Rust clippy with warnings denied:

```bash
cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
```

Format Rust code:

```bash
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Focused Package Commands

Component SDK:

```bash
pnpm --filter @ai-workflow-kit/component-sdk typecheck
pnpm --filter @ai-workflow-kit/component-sdk test
pnpm --filter @ai-workflow-kit/component-sdk lint
```

Trusted components:

```bash
pnpm --filter @ai-workflow-kit/components typecheck
pnpm --filter @ai-workflow-kit/components test
pnpm --filter @ai-workflow-kit/components lint
```

Agent runtime TypeScript package:

```bash
pnpm --filter @ai-workflow-kit/agent-runtime typecheck
pnpm --filter @ai-workflow-kit/agent-runtime test
pnpm --filter @ai-workflow-kit/agent-runtime lint
```

Desktop app frontend:

```bash
pnpm --filter @ai-workflow-kit/desktop typecheck
pnpm --filter @ai-workflow-kit/desktop test
pnpm --filter @ai-workflow-kit/desktop lint
```

## Focused Test Examples

Canvas tests:

```bash
pnpm --filter @ai-workflow-kit/desktop test -- src/canvas
```

Runtime handler tests:

```bash
pnpm --filter @ai-workflow-kit/desktop test -- src/runtime
```

Rust persistence tests:

```bash
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml persistence::tests
```

Rust agent runtime tests:

```bash
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml agent_runtime::tests
```

## Workflow Component Skill Validation

Validate the local workflow component skill:

```bash
python3 /Users/linghe/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/workflow-component
```

If the Python environment does not have `PyYAML`, use a temporary virtual environment:

```bash
python3 -m venv /tmp/ai-workflow-kit-skill-validate
/tmp/ai-workflow-kit-skill-validate/bin/python -m pip install PyYAML
/tmp/ai-workflow-kit-skill-validate/bin/python /Users/linghe/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/workflow-component
```

## CI Parity

The closest local equivalent of CI is:

```bash
pnpm typecheck && pnpm test && pnpm lint && pnpm cargo:check && cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml && cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
```

Run this before larger handoffs or commits.

## Progress File Checks

Validate status prefixes:

```bash
rg '^- (TODO|DOING|DONE|BLOCKED): ' progress.md
```

Find invalid status prefixes:

```bash
awk '/^- / && $0 !~ /^- (TODO|DOING|DONE|BLOCKED): / { print; bad=1 } END { exit bad ? 1 : 0 }' progress.md
```

Ensure at most one main-agent task is `DOING`:

```bash
test "$(rg '^- DOING: ' progress.md | wc -l | tr -d ' ')" -le 1
```
