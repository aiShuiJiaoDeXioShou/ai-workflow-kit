# Canvas

## Purpose

The root view is a FlowGram free layout workflow canvas. All workflow capabilities appear as nodes that can be placed, connected, selected, and inspected.

V1 no longer uses tldraw as the root canvas. tldraw is a whiteboard/drawing surface, while this product needs workflow deployment and orchestration affordances closer to Coze-style node editing.

V1 starts with an empty canvas. The app must not create default Start/End nodes because the product model is a component workbench, not a pre-baked DAG template.

## Node Contract

V1 defines one app-level FlowGram node type for trusted components:

```ts
type FlowgramWorkflowNodeData = {
  nodeKind: 'component' | 'start' | 'end'
  title: string
  description: string
  status: 'idle' | 'running' | 'success' | 'warning' | 'error'
  category?: string
  componentType?: string
  instanceId?: string
  configJson?: unknown
  size?: { w: number; h: number }
}
```

Rules:

- `nodeKind` separates component nodes from legacy system start/end nodes when restoring older documents.
- `componentType` references the trusted component registry.
- `instanceId` references SQLite `component_instances`.
- `configJson` may be present as the initial snapshot used to create the node, but SQLite remains the durable source of component config.
- `size` is display metadata. FlowGram owns node position through node `meta.position`.
- New v1 canvases must only create component nodes from user actions. Start/End nodes are not part of the default document.

## State Split

FlowGram document stores:

- node id
- node type
- node position
- node lightweight data
- edges
- viewport/session state when persistence is wired

SQLite stores:

- component instance id
- component type
- component config
- component runtime state
- created and updated timestamps

Do not treat FlowGram node data as the business database. It is canvas/workflow document state.

## Drag To Canvas Flow

1. User starts dragging a component manifest from the palette.
2. Palette drag payload includes `componentType` and default size.
3. On canvas drop, app resolves the trusted manifest.
4. App validates the default config with the manifest Zod schema.
5. App creates a `component_instances` record.
6. App calls FlowGram `WorkflowDragService.dropCard` with component node data.
7. The new node is selected.
8. Inspector opens for configuration.

If component instance creation fails, no FlowGram node should remain on the canvas.

## Save Flow

V1 uses debounced autosave after FlowGram content changes.

1. Gather FlowGram document JSON through `ctx.document.toJSON()`.
2. Gather FlowGram viewport/session state separately when available.
3. Persist component instance config through the component repository.
4. Persist document and session through canvas persistence.
5. Show save failure as a non-blocking UI error.
6. Flush the latest document on browser `pagehide` / `visibilitychange hidden` and Tauri `closeRequested` before the window is destroyed.
7. The Tauri close path may use `core:window:allow-destroy` only after the save attempt completes.

The user should not lose in-memory canvas state if persistence fails once.

## Restore Flow

1. Load canvas metadata.
2. Load latest FlowGram document JSON.
3. Validate the document has `nodes` and `edges`; fall back to an empty document only when the snapshot is missing or malformed.
4. Mount FlowGram only after restore completes, because FlowGram consumes `initialData` at provider creation time.
5. Load latest viewport/session state when available.
6. Load component instances referenced by nodes.
7. Render known components through registry.
8. Render unknown component types through fallback.
9. Restore viewport position when available.

## Unknown Component Fallback

If a node references a missing component type, render a fallback component with:

- title from node data
- missing component type
- instance id
- warning status

The fallback must preserve the node so the canvas can still save and restore without data loss.

## Light Orchestration

FlowGram edges may express visual or contextual relationships between components. In v1, edges must not imply automatic DAG execution.

Allowed v1 behavior:

- manual action trigger
- explicit context passing
- visual relationship
- action result stored in runtime state
- declared component action routed through app/runtime dispatcher

Not allowed in v1:

- automatic dependency execution
- scheduler
- retry policy
- queue system
- compensation flow

## Action Dispatch Boundary

Canvas components may call the SDK-provided `invokeAction(actionId, input)` callback. The canvas must resolve the component instance, validate config and input with Zod, then route the declared action kind to the app/runtime dispatcher.

The canvas must not let component views call Tauri commands, HTTP clients, filesystem APIs, or process APIs directly.
