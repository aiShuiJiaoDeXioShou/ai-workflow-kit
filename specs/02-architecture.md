# Architecture

## Target Structure

```txt
apps/desktop
packages/component-sdk
packages/components
packages/agent-runtime
skills/workflow-component
```

## Responsibilities

### `apps/desktop`

Owns the desktop app:

- Tauri shell
- React UI
- FlowGram free layout workflow canvas
- component palette
- inspector panel
- run log drawer
- frontend state orchestration
- bridge calls to Tauri commands

### `packages/component-sdk`

Owns public component contracts:

- manifest types
- canvas view props
- inspector props
- declarative action definitions
- action input schema helpers
- runtime status values
- validation helpers

All components and the desktop app must import shared contracts from this package.

### `packages/components`

Owns trusted first-party components:

- HTTP health monitor component
- quota tracker component
- Agent adapter launcher component
- local trusted registry

V1 components are statically imported and explicitly registered.

### `packages/agent-runtime`

Owns agent and CLI process abstractions:

- adapter definition
- argument validation
- lifecycle model
- run status model
- stdout and stderr event shape
- stop behavior

The frontend must not start shell commands directly.

### `skills/workflow-component`

Owns Codex instructions for generating new trusted components:

- read SDK first
- run an interview before generation
- create manifest
- create Zod schema
- create canvas view
- optionally create inspector
- declare actions when needed
- add tests
- update trusted registry
- validate drag, config, save, and restore

## Frontend and Backend Boundary

The frontend may:

- render UI
- render FlowGram workflow nodes and edges
- dispatch declared component actions through the app/runtime dispatcher
- call Tauri commands
- subscribe to Tauri events

The frontend must not:

- execute arbitrary shell strings
- write SQLite directly
- store secrets in component config
- dynamically import remote code

The Tauri backend may:

- read and write SQLite
- manage allowlisted processes
- emit runtime events
- enforce filesystem and shell permissions
- validate adapter execution requests

## Dependency Direction

The dependency direction should stay simple:

```txt
apps/desktop -> packages/component-sdk
apps/desktop -> packages/components
apps/desktop -> packages/agent-runtime
packages/components -> packages/component-sdk
packages/agent-runtime -> packages/component-sdk only if shared runtime types are needed
```

Avoid circular dependencies between packages.

## Integration Style

- Use TypeScript types for UI and component contracts.
- Use Tauri commands for durable local operations.
- Use Tauri events for streaming runtime updates.
- Use SQLite as the local source of truth after persistence is added.
- Use FlowGram only for workflow node, edge, viewport, and interaction state, not component business config.
- Keep component modules declarative. System work such as HTTP checks, quota file refresh, and Agent start/stop belongs to app/runtime and Tauri services.
