---
name: workflow-component
description: Create or update trusted local AI Workflow Kit workflow components. Use when the user asks Codex to generate a new canvas component, add a component to packages/components, update a component manifest/schema/view/inspector/action, or scaffold a component that follows the AI Workflow Kit SDK, registry, runtime action, and interview-first workflow.
---

# Workflow Component

Use this skill to create or update trusted local workflow components for AI Workflow Kit. Follow the interview-first flow before editing files.

## Restore Context

Before making decisions, read these files in order:

1. `goal.md`
2. `progress.md`
3. `AGENTS.md`
4. `rules/comment-style.md`
5. `rules/dependency-policy.md`
6. `rules/react-ui.md`
7. `rules/security.md`
8. `specs/03-canvas.md`
9. `specs/04-component-sdk.md`
10. `specs/12-v1-components.md`
11. Existing component files under `packages/components/src`

If these files conflict with chat context, follow repository files.

## Interview First

Do not generate or edit component files until the component contract is clear. Ask concise questions or infer conservative defaults for:

- manifest type namespace, such as `local.<domain>.<name>`
- title, description, category, icon id, version
- default size and minimum size
- config fields, validation rules, and default config
- runtime state shape and failed/unknown runtime behavior
- declared actions and allowed action kinds
- inspector controls and validation error display
- canvas display states at default and minimum size
- persistence expectations
- tests and validation commands

Stop and ask before implementation when the component would require new runtime permissions, filesystem access, network behavior, process execution, secrets, dependencies, or Tauri capabilities.

## Implementation

Read `references/component-blueprint.md` when implementing file layout, registry updates, and test expectations.

Generate components under:

```txt
packages/components/src/<component-type-with-dots-as-hyphens>/
```

Expected files:

```txt
index.ts
manifest.ts
schema.ts
CanvasView.tsx
InspectorView.tsx
actions.ts
__tests__/<component-name>.test.ts
```

Omit `actions.ts` only when the component has no actions. Omit `InspectorView.tsx` only when there is no editable config beyond defaults.

Update `packages/components/src/registry.ts` explicitly. Components do not auto-register in V1.

## Boundaries

Component modules must not:

- call Tauri commands
- spawn processes
- read or write SQLite
- read arbitrary files
- perform direct HTTP checks for runtime actions
- store plaintext secrets in config
- dynamically load remote code
- bypass the trusted registry
- mutate unrelated components

Use declared actions for system work. Allowed V1 action kinds are defined by `@ai-workflow-kit/component-sdk`.

## Validation

Run focused validation first:

```bash
pnpm --filter @ai-workflow-kit/components typecheck
pnpm --filter @ai-workflow-kit/components test
pnpm --filter @ai-workflow-kit/components lint
```

Then run workspace validation when the registry or shared SDK surface changed:

```bash
pnpm typecheck
pnpm test
pnpm lint
```

Only mark a task `DONE` after validation passes. If security, runtime, dependency, or product decisions are missing, mark the task `BLOCKED` and record the reason in `progress.md`.
