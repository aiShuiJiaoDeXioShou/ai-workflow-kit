# Project Rules And CI/CD

## Purpose

This spec records the project-level rules requested after the initialization baseline. It connects `AGENTS.md`, `rules/`, and `.github/workflows/` so future Agents know these are part of the implementation contract, not optional documentation.

## Files

Project rule files:

```txt
AGENTS.md
rules/README.md
rules/comment-style.md
rules/scaffolding.md
rules/dependency-policy.md
rules/react-ui.md
rules/ci-cd.md
rules/security.md
rules/subagents.md
```

CI/CD files:

```txt
.github/workflows/ci.yml
.github/workflows/release.yml
```

## Required Behaviors

- All Agents must read `AGENTS.md` before work.
- Code comments must use Chinese style unless preserving external names or required headers.
- Generic UI and infrastructure capabilities should prefer mature third-party libraries.
- Project initialization must use Vite/Tauri templates or documented template-derived flow.
- UI architecture must use React.
- CI must validate the repository even before scaffold exists.
- Release must use guarded Tauri build flow and must not publish without app config.
- Main Agent should delegate non-trivial scoped work to subagents while keeping top-level progress ownership.

## Template References

Project scaffold may borrow structure and tooling ideas from:

- Tauri official create project flow
- `MrLightful/create-tauri-react`
- `dannysmith/tauri-template`
- `RoyRao2333/template-tauri-vite-react-ts-tailwind`
- `luochang212/skill-zoo`

Do not copy GPL-only project source code. When using template-generated files, keep generated structure but adapt package names, scripts, and workspace layout to `specs/10-initialization.md`.

## CI/CD Contract

`ci.yml` must always run repository rule checks.

Node checks become active only when:

```txt
package.json
pnpm-lock.yaml
```

exist.

Rust checks become active only when:

```txt
apps/desktop/src-tauri/Cargo.toml
```

exists.

`release.yml` may be present before scaffold, but it must fail early with a clear message if:

```txt
apps/desktop/src-tauri/tauri.conf.json
```

does not exist.
