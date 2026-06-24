# Execution Loop

## Purpose

This project is designed to be implemented through repeated Agent loops. Each loop must be recoverable from repository files alone. Chat history can provide context, but it must not be required to continue the project.

## Main Agent Loop

1. Read `goal.md`.
2. Read `progress.md`.
3. Read all relevant files in `specs/`.
4. Pick exactly one `TODO`.
5. Change that item to `DOING` immediately.
6. Decide whether the task should be delegated according to `rules/subagents.md`.
7. If delegation is useful, assign concrete subagent tasks with file scope, acceptance criteria, and validation commands.
8. Integrate subagent results without expanding the task boundary.
9. Run the task's final validation command.
10. Mark `DONE` only if validation passes.
11. Mark `BLOCKED` if validation fails or required information is missing.
12. Repeat until no `TODO` items remain.

## Status Rules

Only these statuses are allowed:

- TODO
- DOING
- DONE
- BLOCKED

At most one task may be `DOING` for the main Agent. Parallel work is allowed only when explicitly split into subagent assignments. Subagent work does not create extra top-level `DOING` lines unless those subtasks already exist as top-level TODO items.

## Task Shape

Each task in `progress.md` must be small enough to complete and validate in one loop. A task should describe one durable outcome, not a broad theme.

Good tasks:

- Add component SDK package
- Add FlowGram root workflow canvas
- Add allowlisted CLI runner

Bad tasks:

- Build the app
- Improve UI
- Add all persistence

## Sub Agent Rule

Default posture: use subagents for non-trivial work when the task can be safely scoped. The main Agent should stay focused on orchestration, integration, and final validation.

A sub Agent may receive only:

- one task
- relevant files
- acceptance criteria
- validation command

A sub Agent may return only:

- change summary
- validation result
- failure reason
- next-step recommendation

The main Agent is responsible for reading the sub Agent result, checking the repository, running final validation, and updating `progress.md`.

Use subagents especially for:

- independent research questions
- independent file slices
- frontend/backend/test/CI slices
- verification passes that can run in parallel
- security or migration review

Do not use subagents for vague tasks. If a task cannot be expressed with a clear file scope and validation command, the main Agent should first refine the spec or mark the task `BLOCKED`.

## Blocking Rules

Mark a task `BLOCKED` when:

- required product behavior is undefined
- required package or platform capability is unavailable
- validation fails and the failure cannot be resolved within the task boundary
- a previous task was expected to create an interface but did not

When marking `BLOCKED`, append a concise reason on the same line:

```md
- BLOCKED: Add SQLite persistence - database migration strategy is not defined
```

If the blocker can be solved by a new planning or design task, add a new `TODO` immediately after the blocked item.

## Validation Rule

Never mark `DONE` based only on file changes. Every task needs at least one validation action. Validation can be a command, static inspection, documented manual acceptance, or a combination of these.

If the task is documentation-only, validation is:

- files exist at the expected paths
- required sections are present
- `progress.md` uses only allowed statuses
