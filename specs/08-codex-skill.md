# Codex Workflow Component Skill

## Purpose

`skills/workflow-component/SKILL.md` teaches Codex how to create or update a trusted workflow component for AI Workflow Kit.

The skill uses an interview-first flow. It should not immediately generate files until it has enough answers to define the component's purpose, config schema, runtime state, actions, and acceptance criteria.

## Skill Location

```txt
skills/workflow-component/SKILL.md
```

## Required Reading

The skill must instruct Codex to read, in order:

1. `goal.md`
2. `progress.md`
3. `AGENTS.md`
4. `rules/comment-style.md`
5. `rules/dependency-policy.md`
6. `rules/react-ui.md`
7. `specs/03-canvas.md`
8. `specs/04-component-sdk.md`
9. `specs/12-v1-components.md`
10. existing files in `packages/components/src`

## Interview Flow

Before generating a component, Codex must ask or infer:

- component type namespace
- user-facing title and description
- component category
- default size and minimum size
- config fields and validation rules
- runtime state shape
- whether it needs actions
- which declared action kinds it needs
- inspector controls
- canvas display states
- persistence expectations
- tests and validation commands

Codex must complete this interview before generating or editing files.

If any answer changes runtime permissions, filesystem access, network access, or process execution, Codex must stop and point to the relevant security spec before implementation.

## Generated Component Layout

Generated components live under:

```txt
packages/components/src/<component-type>/
```

Expected files:

```txt
index.ts
manifest.ts
schema.ts
CanvasView.tsx
InspectorView.tsx
actions.ts
__tests__/manifest.test.ts
```

`actions.ts` may be omitted only when the component has no actions. `InspectorView.tsx` may be omitted only when the component has no editable config beyond defaults.

## Generated Component Requirements

Every generated component must include:

- unique manifest type
- title and description
- version
- category
- known icon id
- default size
- Zod config schema
- default config that passes the schema
- `CanvasView`
- manifest validation test
- registry export

When configurable:

- `InspectorView`
- validation error display
- config update path

When actionable:

- declarative action definitions
- Zod input schema when needed
- no direct Tauri command calls
- no direct shell/process calls

## Registry Update

The skill must update the trusted registry explicitly. Components do not auto-register by directory scan in V1.

Registry update requirements:

- import component module
- append to registry
- preserve stable ordering by category then title
- run duplicate type validation

## Prohibited Behavior

The skill must tell Codex not to:

- create example-only components for V1 validation
- execute arbitrary shell strings from component UI
- call Tauri commands from component modules
- store plaintext secrets in component config
- dynamically load remote code
- bypass the trusted registry
- mutate unrelated components
- add dependencies without checking `rules/dependency-policy.md`
- mark progress as `DONE` without validation

## Acceptance Criteria

A generated component is acceptable when:

- it appears in the component palette
- it can be dragged onto the canvas
- it renders without layout overflow at default and minimum size
- its config can be edited if it has config
- invalid config is surfaced through Zod validation
- its declared actions are routed through runtime dispatch
- it saves and restores with the canvas
- its tests pass
- unknown or failed runtime state does not crash the canvas
