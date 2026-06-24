# Product Scope

## Product Boundary

AI Workflow Kit is a local-first desktop workbench for arranging, observing, and lightly orchestrating AI work. The root experience is an infinite canvas, not a dashboard page or command list.

The user should be able to keep the app open while working and use the canvas as a spatial map of active tools, monitors, quotas, runs, and future automations.

## Primary User

The v1 user is a technical operator building personal AI infrastructure. They are comfortable with local tools, CLI agents, config files, and iterative workflows, but they need a visual workbench to make these moving parts easier to inspect and reuse.

## Core Workflows

### Create a Working Surface

1. Open the desktop app.
2. Land directly on the root canvas.
3. Pan and zoom freely.
4. Drag components onto the canvas.
5. Arrange components spatially by workflow, project, or agent.

### Configure a Component

1. Select a component on the canvas.
2. Edit its config in the inspector.
3. Save or auto-save the config.
4. See the canvas component update without losing position or size.

### Run a Local Command or Agent

1. Place a command or agent component on the canvas.
2. Choose an allowlisted adapter.
3. Provide validated arguments.
4. Start the run.
5. Watch streamed stdout and stderr in the run log drawer.
6. Stop the run if needed.
7. Reopen run history later.

### Generate a New Component

1. Ask Codex to create a new workflow component.
2. Codex reads the SDK and component skill.
3. Codex adds a trusted local component package.
4. The component appears in the palette after registration.
5. The component can be dragged, configured, saved, and restored.

## V1 Behavior

V1 must prove the loop from component definition to canvas instance to persistence:

- component registry loads trusted components
- palette displays available components
- canvas accepts dropped components
- inspector edits component config
- SQLite persists canvas and component state
- runtime can run allowlisted CLI commands
- logs stream to UI and persist locally

## Non-V1 Behavior

V1 must not attempt:

- multi-user collaboration
- remote plugin marketplace
- cloud sync
- full workflow scheduler
- automatic dependency graph execution
- arbitrary shell command execution from UI
- third-party component sandboxing

## Product Principles

- Canvas first: the app opens into the work surface.
- Local first: the app works offline and stores state locally.
- Trusted extension first: initial components are local code reviewed by the user.
- Observable by default: runs, logs, and component status should be visible.
- Small loops: each new capability should become a component or adapter with clear validation.

