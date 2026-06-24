# Component SDK

## Purpose

The component SDK defines the stable contract between the desktop app and trusted local workflow components. Any component created by the workflow component skill must conform to this SDK.

V1 components are real first-party components, not examples. The first required components are defined in `specs/12-v1-components.md`.

## Package Boundary

The SDK lives in:

```txt
packages/component-sdk
```

It owns:

- component manifest types
- component module contract
- Zod schema helpers
- declarative action definitions
- canvas view props
- inspector props
- runtime status types
- registry validation helpers

It must not depend on:

- Tauri APIs
- SQLite APIs
- app runtime implementation
- any concrete component package

## Component Layout

Trusted components live under:

```txt
packages/components/src/<component-type>/
```

`<component-type>` uses the manifest type with dots converted to hyphens. For example:

```txt
core.monitor.http-health -> core-monitor-http-health
core.quota.tracker -> core-quota-tracker
core.agent.launcher -> core-agent-launcher
```

Each component directory should contain:

```txt
index.ts
manifest.ts
schema.ts
CanvasView.tsx
InspectorView.tsx
actions.ts
__tests__/
```

Files may be omitted only when the component does not need that capability. For example, a purely display-only component may omit `actions.ts`, but it still needs `manifest.ts`, `schema.ts`, and `CanvasView.tsx`.

## Manifest

Schemas are authored in Zod source code. The manifest stores schema objects, not raw JSON Schema.

```ts
import type { z } from 'zod'

type WorkflowComponentCategory = 'monitor' | 'quota' | 'agent' | 'utility' | 'custom'

type WorkflowComponentManifest<TConfigSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  type: string
  title: string
  description: string
  version: string
  category: WorkflowComponentCategory
  icon: string
  defaultSize: { w: number; h: number }
  minSize?: { w: number; h: number }
  configSchema: TConfigSchema
  defaultConfig: z.infer<TConfigSchema>
  actions?: WorkflowActionDefinition[]
}
```

Rules:

- `type` must be globally unique.
- First-party types use the `core.` prefix, for example `core.monitor.http-health`.
- Skill-generated trusted components should use `local.` unless the user chooses a more specific namespace.
- `version` must change when config shape, action shape, or runtime behavior changes.
- `configSchema` must be a Zod schema for JSON-serializable config.
- `defaultConfig` must pass `configSchema`.
- Zod schema objects exist only in TypeScript source and the runtime registry; persisted component config is plain JSON after validation.
- `icon` must refer to a known icon id, not emoji.
- `defaultSize` and `minSize` must fit normal laptop viewports.

## Module Contract

Components are rendered by the app, but they do not own system execution. They declare actions and request execution through SDK callbacks.

```ts
type WorkflowComponentModule<TConfigSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  manifest: WorkflowComponentManifest<TConfigSchema>
  CanvasView: React.ComponentType<ComponentViewProps<z.infer<TConfigSchema>>>
  InspectorView?: React.ComponentType<ComponentInspectorProps<z.infer<TConfigSchema>>>
}
```

The module contract intentionally does not expose `runAction`. V1 action execution is declarative and owned by the app/runtime.

## Declarative Actions

Actions describe what the runtime should do. Components do not execute arbitrary code for system capabilities.

```ts
type WorkflowActionKind =
  | 'monitor.http.check'
  | 'quota.file.refresh'
  | 'agent.adapter.start'
  | 'agent.adapter.stop'

type WorkflowActionDefinition<TInputSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  id: string
  title: string
  kind: WorkflowActionKind
  inputSchema?: TInputSchema
  confirm?: boolean
}
```

Rules:

- `id` is unique within one component type.
- `kind` maps to an app/runtime dispatcher.
- `inputSchema` is Zod when input is required.
- Action input must be JSON-serializable.
- Actions that start or stop local processes must go through agent runtime allowlists.
- Actions that perform HTTP checks or file refreshes must go through app/runtime dispatchers, not component code.
- Components must not call Tauri commands directly.

## Canvas View Props

```ts
type ComponentViewProps<TConfig> = {
  instanceId: string
  componentType: string
  config: TConfig
  runtimeState: unknown
  status: WorkflowRuntimeStatus
  size: { w: number; h: number }
  invokeAction: (actionId: string, input?: unknown) => Promise<void>
}
```

Rules:

- `CanvasView` renders compact status and primary controls.
- It must tolerate missing runtime state.
- It must not edit config directly.
- It must not access Tauri, SQLite, filesystem, network, or process APIs directly.
- It may call `invokeAction` for declared actions.

## Inspector Props

```ts
type ComponentInspectorProps<TConfig> = {
  instanceId: string
  componentType: string
  config: TConfig
  validationErrors: Array<{ path: string; message: string }>
  updateConfig: (nextConfig: TConfig) => void
  invokeAction: (actionId: string, input?: unknown) => Promise<void>
}
```

Rules:

- `InspectorView` edits config through `updateConfig`.
- It must keep config JSON-serializable.
- It must surface Zod validation errors.
- It must not store plaintext secrets.
- Destructive actions must be explicit.

## Registry

V1 uses a trusted local registry:

```ts
export const componentRegistry = [
  httpHealthMonitorComponent,
  quotaTrackerComponent,
  agentLauncherComponent,
]
```

Rules:

- every registered component must pass manifest validation
- duplicate component types are invalid
- every `defaultConfig` must pass its `configSchema`
- every action input schema must be valid Zod
- registry failure should fail fast during development
- missing component types at runtime should use canvas fallback rendering

## Compatibility

Future SDK changes must preserve existing component instances when possible. When breaking config changes are required, add a migration plan before implementation.

For V1, avoid SDK features that require dynamic remote loading, component sandboxing, or per-component dependency installation.
