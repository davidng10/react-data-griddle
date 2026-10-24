# Data grid internals

This guide covers constraints in `packages/data-griddle/src` that are easy to break by accident.
Public usage goes in `README.md` and `docs/`. Implementation history goes in neither.

## Structure

```text
packages/data-griddle/src/data-grid.tsx              React shell and interaction composition
packages/data-griddle/src/components/                headers, cells, zones, and overlays
packages/data-griddle/src/hooks/                     layout, editing, keyboard, and pointer gestures
packages/data-griddle/src/core/store/                plain TypeScript observable stores
packages/data-griddle/src/core/selection/geometry.ts pure navigation and overlay geometry
packages/data-griddle/src/core/types/                public data and column contracts
packages/data-griddle/src/editors/                   portal host and built-in editors
packages/data-griddle/src/internal/                  shared layout, styling, and utility code
```

`apps/docs/examples/BasicExample.tsx` is the single editable grid at `/`. The dev app doesn't render
the Markdown guides. `fixtures/shared/Example.tsx` holds the public-API scenarios that the
consumer checks copy into packed consumers. Neither example ships in the package. See the
[package verification guide](./docs/PACKAGE_VERIFICATION.md) for what the checks cover and how to
run them.

## Rendering model

The grid has one native scroll container. Inside it, a flex row holds the optional checkbox gutter
and three column zones:

```text
stationary frame
├── scroll container    isolated stacking context
│   └── flex body
│       ├── row gutter       sticky left
│       ├── left zone        sticky left
│       ├── center zone      horizontally virtualized
│       └── right zone       sticky right
└── status layers       empty content / initial skeleton / refresh overlay
```

Each zone has its own sticky header. Frozen zones are opaque and stack above the center zone so
scrolled cells don't show through.

All rows have the same height, and rows are virtualized vertically. Only center columns are
virtualized horizontally. Frozen columns are always rendered for every visible row, which is why
there should be few of them. Cells are absolutely positioned inside their zone with transforms.

The frame takes the public `id`, `className`, and `style`, and doesn't move when the grid scrolls.
The inner scroller holds `scrollRef`, the accessible name, and keyboard focus. The refresh overlay
covers the headers and frozen zones without using their scroll coordinates. The initial skeleton
fills the visible body without adding fake rows. `DataGrid` records whether `rows` was supplied,
then replaces `null` or `undefined` with a shared empty array, so internal hooks and row renderers
can keep assuming a non-null array.

While loading, the content is `inert`, and capture-phase guards also block React events that
bubble up from the editor portal in `document.body`. A layout effect cancels gestures and releases
pointer capture. A cancelled resize and a lost capture both discard the guide. Only a clean
`pointerup` commits a width. `EmptyRowsLayer`, the static skeleton behind virtualized cells, must
not depend on `loading`.

## Coordinate spaces

Interactions convert between four coordinate spaces:

| Space          | Origin                   | Used by                                |
| -------------- | ------------------------ | -------------------------------------- |
| Viewport       | Visible scroll box       | Pointer events and sticky regions      |
| Scroll content | Full scrollable body     | Conceptual grid layout                 |
| Zone local     | Start of one column zone | Cell and overlay transforms            |
| Cell address   | `{ rowIndex, columnId }` | Selection, editing, and keyboard state |

Converting a viewport point to a zone-local x adds `scrollLeft` in the center zone. Frozen zones
don't add it because they don't scroll horizontally. Vertical hit testing subtracts the sticky
header height, then adds `scrollTop`.

Keep these conversions in `useGridGeometryHelpers.ts` or the pure geometry module. Copies of this
math inside gesture code tend to get the frozen-zone boundaries wrong.

## State and overlays

Interaction state lives in small observable stores:

| Store         | Subscriber                        | Purpose                                  |
| ------------- | --------------------------------- | ---------------------------------------- |
| Grid store    | Selection overlays and row gutter | Focus, range, and selected rows          |
| Edit store    | Editor portal                     | Active cell, draft, and validation error |
| Pending store | Pending overlays                  | Optimistic values and commit failures    |
| Drag store    | Drag overlays                     | Column source and drop indicator         |
| Resize store  | Resize overlays                   | Active resize guide                      |

`DataGrid` writes to these stores but never subscribes to them. That way pointer movement, draft
changes, and overlay updates don't re-render the virtualized cells.

Selection is stored as an anchor and a focus coordinate, and drawn as at most one rectangle per
zone. Don't add a `selected` prop to cells. That would re-render cells on every drag-selection move.

## Gesture order

Pointer gestures overlap in the header, so they run in this order:

1. Column resize takes presses on the narrow boundary hit area.
2. Column reorder takes presses on the rest of an eligible header.
3. Cell selection handles the body.

Each handler reports whether it consumed the event. Keep this order when you add or change a
gesture.

Column reorder stays inside the source zone and can't cross an action column or a column with
`reorderBarrier`. Only drags in the center zone auto-scroll at the edges. Column resize moves a
guide while dragging and commits the width once on release.

## Editing and commits

The active editor renders in a portal under `document.body`, so virtualization can't unmount it
and the scroll container can't clip it. The portal doesn't move with the grid, so `EditorPortal`
repositions its host directly in the DOM on scroll and resize.

A commit runs these steps:

1. Parse the draft with `parseValue`, if the column has one.
2. Validate the value synchronously if it changed.
3. If validation fails, keep the editor open for an explicit save, or discard the draft for an
   implicit one.
4. Close the editor and show the accepted value in the pending overlay.
5. Call the column's or the grid's commit handler.
6. On success, clear the overlay. On failure, remove the pending value and flash the cell.

The grid never mutates row data. Consumers save accepted values and pass updated rows back in.

Custom editor popups must render inside the editor host. The grid treats a press on a popup
mounted anywhere else as an outside click, which saves the edit.

An active edit stores its row ID, not its index. Lookups go through the current row-index map, so
a refetch or reorder can't move a draft onto a different row. The callbacks given to custom
editors call through to the latest editing API, so a callback an editor kept from before a refresh
still works. Loading hides and disables the portal without clearing the draft or starting a
commit, and pending commits carry on. If the target row or column disappears, the draft stays, with
a notice and a discard button. When restoring focus, the grid leaves it alone if the user has moved
it to a control outside the grid.

## Performance constraints

- Keep scroll, hover, and pointer-move state out of cell props and cell rendering.
- Subscribe in the smallest overlay or control that needs the state.
- Keep geometry functions pure, and free of DOM access where possible.
- Pass primitive cell props where possible so memoization works.
- Reset virtualizer measurements when the row height or resolved column widths change.
- Keep frozen column counts small, because frozen zones aren't virtualized horizontally.

After a change, run `pnpm test`, `pnpm lint`, and `pnpm build`. Keep unit tests for geometry and
stores free of the DOM.

## Styling boundaries

`internal/grid.css` and `internal/loading.css` hold the static layout and visual defaults for
grid-owned classes. Structural rules use plain class selectors, and visual defaults use `:where()`
where possible so they have zero specificity. Inline styles hold calculated positions and sizes,
the shared hit-area widths, the generated mask geometry, and runtime state. The root also sets
`position`, `isolation`, and `box-sizing` inline, after consumer styles, because the layout breaks
without them. Cells and headers set `box-sizing` explicitly so their measurements hold without a
global reset. Frozen dividers are shadows, so they take up no width. Skeletons repeat three
alpha-mask tiles over a background color set in CSS, so the DOM size is the same for any row count.
The tiles are SVG data URLs, and those can't read page CSS variables, which is why the color lives
in the backing instead.

`GridZone` builds one cell context and accessor result and passes it to both the class callback and
the renderer. Memoized cell components only receive the resolved class string. Selection and focus
stay in overlay subscriptions.

`useEditorTheme` runs only in the editor component. It copies the token list in `internal/theme.ts`,
plus the computed font family, font size, text color, and direction, from a ref to the outer frame.
It watches theme attributes on the root and its ancestors, and listens for resizes and system color
scheme changes. It batches reads into one animation frame and doesn't poll. Cleanup cancels queued
work and removes listeners. When you change the token list, update the token table in
[docs/STYLING.md](./docs/STYLING.md) too. An editor hidden by loading stops watching. When it
shows again or remounts, it recopies the theme and remeasures without discarding the draft.

## Public customization and commands

`DataGrid` wraps `forwardRef` in a way that keeps its generic row type. `useImperativeHandle`
exposes only `focusCell`. It looks up the row by ID, then the column, and checks that the column is
selectable. Then it checks loading, edit state, and each gesture's `isActive` query, all before
changing anything. The reorder query also returns true for a press that hasn't yet moved far enough
to start a drag. On success, `focusCell` uses the same store and scroll helper as keyboard
navigation. Selection is adjusted for data changes in a layout effect that runs before the new
handle is exposed. Otherwise a parent's layout effect could call the command and later have it
remapped against old row indices. No cell subscribes to the handle.

`RowGutter` renders custom and native checkboxes. Control callbacks go through a dispatcher that a
layout effect keeps current, and read the latest store snapshot, so a control that kept an old
callback still acts on current state. The dispatcher checks loading, read-only state, and whether
the row ID still exists. The gutter stops keyboard and pointer-down events so a checkbox press
doesn't start cell navigation or editing. The grid decides what selection means, not the control.
What consumers must handle is in [docs/INTEGRATION.md](./docs/INTEGRATION.md).

## Accessibility

`GridAccessibility` renders the logical ARIA rows, which use `aria-owns` to point at the real
mounted cells in every zone. It sets `aria-activedescendant` and `aria-selected` straight from the
store, and only writes the cell attributes that changed, so cells don't re-render. IDs are scoped to
the grid instance and keyed by row ID. Controls keep their native `tabindex`. There is no
interaction mode, tab-stop cache, or F6 handler. The ARIA row elements have no size and never
duplicate content. Whether screen readers follow `aria-owns` here is untested. See the
[manual release matrix](./docs/ACCESSIBILITY.md#manual-release-matrix).

The application reports async save errors through `onCellCommitError`. The grid has no live region
for commits. The default editor still links its own validation error to its input. Pending values
are `aria-hidden` so they aren't read as extra cells.

## Touch input

The outer frame contains only the scroller and its sibling status layer. Pointer movement,
selection, and the resize and reorder guides live in stores.

### Range selection

A touch starts a tap-or-hold candidate with a 500 ms timer and an 8px movement limit. Moving before
the timer fires leaves native scrolling alone. Once the hold activates, the grid creates a one-cell
range, then uses the same hit testing and edge auto-scroll as the mouse. The shell tracks the
pointer ID, sets pointer capture on the scroller, and cancels on a second contact or on changes to
row IDs or geometry.

A non-passive native `touchmove` listener is added during `pointerdown`, before `touchstart`, and
only prevents scrolling once a range is active. It stays on the original touch target even if
virtualization removes that element from the DOM, and pointer capture keeps the release and
cancel events on the scroller. Release, cancellation, and unmount all remove the listeners, timers,
and animation frames. Handlers read geometry through refs updated after each commit, so native
events never see stale values. Don't change `touch-action` after a hold activates, because browsers
read it when contact begins.

### Column resizing

Touch resizing uses the same resize guide as the mouse and commits once on release. Only resize
handles take touch input, and they set `touch-action: none` before contact. CSS widens each handle
from 5px to 12px on coarse pointers, and hit testing reads the rendered width at `pointerdown`. The
rest of the header scrolls natively. The shell's existing cancellation paths discard the preview
without committing a width.

### Double-tap editing

The first completed tap is recorded in a ref. The next press consumes it, and counts as a double
tap only on the same cell within 300 ms and 24px. Swipes, holds, and cancellations can't start a
pair, and scrolling or other input clears the record. A valid second release calls `beginEdit`
inside `flushSync` so the editor mounts and focuses within the user gesture, which mobile browsers
require before they open the keyboard. Cells set `touch-action: manipulation` to stop double-tap
zoom while keeping native pan and pinch. Recognition doesn't subscribe cells to gesture state or
re-render them.

The scroller also has a non-passive native `touchend` listener that calls `preventDefault` only
for a completed single-finger tap on a cell. This covers Safari versions that still zoom on double
tap despite `touch-action: manipulation`. It works whichever order the release events arrive in.
Interrupted gestures, swipes, holds, pinches, and taps on controls inside cells are left alone.

Built-in text and select editors focus with `preventScroll: true` so the browser's focus scroll
doesn't fight the portal's positioning. They use the grid's font with no minimum size on mobile.

### Column reordering

Touch reordering takes eligible headers after resize hit testing. A 500 ms hold within 8px shows the
insertion guide and the floating column label. Moving or scrolling before that leaves native
panning alone. Non-passive native move and cancel listeners stay on the original touch target even
when horizontal virtualization removes it, and pointer capture keeps the release on the scroller.
Target updates reuse the zone and barrier geometry and only write to the drag store. Center-zone
edge auto-scroll starts after the finger moves, never during a still hold. Release commits once.
Cancellation discards the preview and clears listeners, timers, and frames.

The ghost shows the column name. When the drag starts, it copies the source header's basic
typography, colors, and text direction once. It doesn't copy or remount custom header content or
decorations. It is mounted in `document.body`, and is `inert` and `aria-hidden`. It follows client
coordinates, sits above the touch point, and stays inside the visual viewport. Moving updates its
transform and size limits, and the source column doesn't move. Release, cancellation, and unmount
remove it, even if the source header has been virtualized away.

## Not implemented

There is no built-in actions panel. Column resizing and reordering don't work from the keyboard.
Keyboard cell navigation, selection, and editing do. The Chromium touch checks emulate touch input
and don't replace testing on physical devices.
