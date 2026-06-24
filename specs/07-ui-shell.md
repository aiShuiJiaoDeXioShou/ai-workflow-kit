# UI Shell

## Purpose

The UI shell frames the infinite canvas without turning the app into a traditional dashboard. The canvas remains the main surface, while panels provide tools, configuration, and runtime visibility.

## Layout

The app opens directly into:

- left component palette
- center full-bleed FlowGram workflow canvas
- right inspector panel
- bottom run log drawer
- compact toolbar in an edge or corner

No landing page is needed for v1.

## Left Component Palette

The palette lists trusted registered components.

It should show:

- icon
- title
- short type or category
- drag affordance

It should support:

- drag component to canvas
- search or filter later
- disabled state when registry has errors
- minimize to a narrow rail and restore without losing palette state

## Canvas

The canvas should occupy the largest surface area. It must support:

- pan
- zoom
- select
- move
- resize
- delete
- drop component as workflow node
- connect workflow nodes
- fallback rendering for unknown component types

## Inspector

The inspector edits the selected component. It should show:

- component title
- component type
- instance id
- config controls
- action controls when available
- validation errors

When nothing is selected, show a compact empty state, not onboarding copy.

The inspector can be minimized to a narrow rail and restored without clearing the current selection.

## Run Log Drawer

The bottom drawer shows runtime output:

- component action lifecycle events
- HTTP health check results
- quota refresh results
- active run status
- stdout lines
- stderr lines
- exit code
- stop action
- run history access

The drawer can be collapsed, but active errors should remain discoverable.

The collapsed drawer must keep a visible restore control.

## Toolbar

The compact toolbar may include:

- save status
- zoom controls
- canvas title
- command palette trigger
- runtime health indicator

Use familiar icons from one icon library. Do not use emoji icons.

## Visual Direction

The v1 aesthetic is industrial/utilitarian:

- dense but readable
- restrained color
- stable fixed tool surfaces
- technical typography for logs and metadata
- low-radius panels
- no decorative gradient backgrounds
- no marketing hero layout
- no nested cards

V1 palette:

- app background `#F7F7F5`
- panel surface `#FFFFFF`
- primary accent `#111111`
- selected/border neutral `#D8D8D2`
- body text `#171717`
- success green `#15803D`
- error red `#DC2626`

Suggested fonts:

- `IBM Plex Sans Condensed` for UI labels and headings
- `JetBrains Mono` for logs, quotas, process output, and technical metadata

## Responsive Target

V1 is desktop-first. The UI should remain usable on common laptop widths. Mobile layout is out of scope.
