# Component Blueprint

Use this reference after the interview has produced a concrete component contract.

## Naming

- Manifest type: `local.<domain>.<name>` unless the repository spec explicitly authorizes another namespace.
- Directory name: replace dots with hyphens, for example `local.usage.timer` -> `local-usage-timer`.
- Export names should be stable and specific, for example `usageTimerComponent`, `usageTimerManifest`, `usageTimerConfigSchema`.

## Manifest

`manifest.ts` must define:

- `type`
- `title`
- `description`
- `version`
- `category`
- `icon`
- `defaultSize`
- optional `minSize`
- `configSchema`
- `defaultConfig`
- optional `actions`

The default config must be created by parsing through the Zod schema.

## Schema

`schema.ts` owns:

- Zod config schema
- config TypeScript type
- default config
- small exported enums or option arrays used by the inspector

Keep config JSON-serializable. Do not include callbacks, class instances, symbols, `undefined`, or secrets.

## Runtime State

Create `runtimeState.ts` when the component consumes runtime state.

Runtime parsers must:

- accept `unknown`
- return safe defaults for missing or malformed input
- cap arrays used for recent history or logs
- tolerate future fields
- avoid throwing during canvas render

## Canvas View

`CanvasView.tsx` must:

- render compactly at `defaultSize` and `minSize`
- tolerate missing runtime state
- call only `invokeAction(actionId, input?)` for declared actions
- avoid Tauri, SQLite, filesystem, process, or direct runtime API imports
- keep text from overflowing with `minWidth: 0`, ellipsis, or wrapping where appropriate

## Inspector View

`InspectorView.tsx` must:

- update config through `updateConfig`
- keep config JSON-serializable
- display `validationErrors`
- use native controls or existing project UI primitives
- call only declared actions through `invokeAction`

## Actions

`actions.ts` must use `defineWorkflowAction`.

Allowed V1 action kinds:

- `monitor.http.check`
- `quota.file.refresh`
- `agent.adapter.start`
- `agent.adapter.stop`

If a desired behavior does not map to an allowed action kind, stop and request a runtime/spec decision before implementation.

## Registry

Update `packages/components/src/registry.ts`:

- import the component module
- append it to `trustedComponentModules`
- preserve stable ordering by category then title when practical
- rely on SDK validation for duplicate type detection

Update `packages/components/src/index.ts` if the new directory is not already exported.

## Tests

Create or update component tests to cover:

- manifest passes SDK validation
- default config passes schema
- actions match expected action kinds
- CanvasView and InspectorView satisfy the SDK module contract
- runtime state parser handles `undefined` and malformed input
- custom schema refinements reject invalid config

Use focused validation before workspace validation.
