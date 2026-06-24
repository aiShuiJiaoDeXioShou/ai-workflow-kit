# Testing

## Purpose

Testing keeps the execution loop honest. A task can only become `DONE` after relevant validation passes.

## Validation Layers

### Documentation Tasks

Use static validation:

- expected files exist
- required sections are present
- `progress.md` contains only allowed statuses
- no task is accidentally left `DOING`

### Scaffold Tasks

Expected validation:

```txt
pnpm install
pnpm typecheck
pnpm lint
pnpm tauri dev
cargo check
```

Only run commands that exist for the current task. If the scaffold does not yet define a command, validate the created files and document the missing command as a future task.

### SDK Tasks

Expected validation:

```txt
pnpm test
pnpm typecheck
```

Checks should cover:

- manifest validation
- duplicate type detection
- action result types
- config JSON serializability

### Canvas Tasks

Expected validation:

- root canvas renders
- workflow component shape can be created
- shape can move and resize
- shape can be deleted
- unknown component fallback renders
- save and restore preserve placement

Automated browser tests are preferred once the app shell exists.

### Persistence Tasks

Expected validation:

- fresh database migration succeeds
- canvas snapshot can be inserted and loaded
- component instance can be inserted, updated, and loaded
- agent logs append in order
- failed save does not delete last valid snapshot

### Agent Runtime Tasks

Expected validation:

- registered adapter can start
- stdout streams
- stderr streams
- exit code is captured
- stop terminates a running process
- run history persists
- arbitrary unregistered command is rejected

## Acceptance Scenarios

V1 is complete when these scenarios pass:

1. Open app and land directly on root canvas.
2. Drag HTTP health monitor from palette to canvas.
3. Move and resize the component.
4. Edit URL, interval, and timeout config in inspector.
5. Save and restart app.
6. Confirm canvas, component, config, runtime state, and camera position restore.
7. Drag quota tracker and configure manual quota values.
8. Switch quota tracker to file mode and refresh from an approved local JSON file.
9. Drag Agent adapter launcher.
10. Start an allowlisted adapter.
11. Watch stdout or stderr stream to log drawer.
12. Stop or complete the run.
13. Confirm run history and logs persist.
14. Use workflow component skill to generate a new trusted component through interview flow.
15. Register generated component and repeat drag, config, save, and restore.

## Progress Validation

Before ending any implementation loop, run a status check equivalent to:

```txt
rg '^- (TODO|DOING|DONE|BLOCKED): ' progress.md
rg '^- (?!TODO|DOING|DONE|BLOCKED): ' progress.md
```

The second command should return no invalid status lines.
