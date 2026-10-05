# Accessibility and interaction

Data Griddle's source implementation includes grid semantics, keyboard navigation, touch tap/scroll,
hold-to-select, double-tap editing and touch column resizing/reordering. The full browser,
physical-device and screen-reader matrix is **not yet verified**. The first release remains
blocked on the manual matrix below. Automated tests and a browser accessibility tree do not establish
screen-reader usability.

## Semantics and virtualization

Give each grid an `aria-label` or `aria-labelledby`. The default name is “Data grid”. The scroller
has `role="grid"`, full supplied row/column counts, and multiselection semantics. Counts include one
header row and, when enabled, one row-selection column. The grid does not know server-side totals:
counts describe the supplied `rows` array. Cell and row indices use one-based positions in that
complete dataset and the resolved visual column order, including virtual-window gaps.

Logical ARIA rows own the real rendered header/cell elements across the gutter and frozen zones
using `aria-owns`. Custom content is not duplicated. Row `aria-selected` describes checkbox selection;
cell `aria-selected` describes the rectangular range. Active-cell focus is separate from selection.
`aria-readonly` reflects each cell's editing capability. The active descendant references a real,
mounted cell. Manually scrolling that cell out of the virtual window removes the reference; returning
it to the window restores it. Keyboard entry/navigation scrolls the active cell into view.

This ownership model needs manual testing for header association, row order and active-descendant
announcements on every chosen AT combination. If an engine/AT fails to follow ownership, a different
DOM layout is required before claiming support. The grid does not provide a complete, nonvirtualized
browse-mode table or export. Applications needing one must supply a separate view.

## Keyboard and focus

| Input                | Behavior                                                                   |
| -------------------- | -------------------------------------------------------------------------- |
| Tab / Shift+Tab      | Follow browser tab order through grid, controls and page                   |
| Arrows               | Move among selectable data cells; action/nonselectable columns are skipped |
| Shift+Arrows         | Extend the range                                                           |
| Ctrl/Meta+Arrows     | Move to an edge                                                            |
| Home / End           | First/last selectable column in the current row                            |
| Ctrl/Meta+Home / End | First/last selectable cell in the supplied dataset                         |
| PageUp / PageDown    | Move by the visible body row count                                         |
| Enter / F2           | Edit the active editable cell                                              |
| Printable character  | Replace the active editable cell's draft                                   |
| Escape               | Clear range and cancel an active pointer gesture                           |

The grid container is a tab stop for cell navigation. Rendered checkboxes and custom controls keep
normal browser tab order and their native keys; the grid does not rewrite `tabindex`, provide an
interaction mode, or handle F6. Tab/Shift+Tab pass through these controls before leaving the grid.
The cell-navigation shortcuts above apply when the grid container has focus, not inside a control.

Only mounted controls exist. Their tab sequence follows DOM order across frozen zones, which can
have more stops and differ from visual row order. This is a minimal native-tab implementation, not
the single-tab-stop composite-grid pattern. Custom content owns focusability, accessible names and
visible focus; avoid positive tabindex. There is no grid-level copy/paste, sorting or filtering shortcut.

The active cell border supplies the focus indicator. A keyboard-focused grid without a logical
active cell (for example, an empty grid) uses a container outline as a fallback. Scrolling a focused
cell outside the virtual window removes its ARIA reference, but does not enable the container
outline. Keyboard navigation brings the active cell back into view.

Keyboard-accessible column resizing/reordering remains pending. The grid does not render a built-in
actions panel. Mouse header resizing/reordering remains available within capability and zone bounds.

## Editing, validation and errors

Built-in editors are named “Column name, row N”. Text-editor Enter saves and moves down;
Shift+Enter inserts a newline; Tab/Shift+Tab save and move right/left; Escape cancels. Commit/cancel
keys are ignored during composition (including the key-code 229 fallback). Save edit and Cancel edit
buttons provide explicit touch actions. Native select changes retain their immediate-save behavior.

Explicit validation failures keep the editor open, associate the error with its input, and announce
it. Leaving the default editor host implicitly commits according to the existing validation policy:
an invalid implicit draft is discarded. Moving among its input and action buttons does not save.
Explicit save/cancel restores grid focus; leaving for an outside control does not steal that focus.

Asynchronous failures clear the pending display, briefly mark the failed cell and call
`onCellCommitError({ update, error })`. The editor has already closed; application rows are never
mutated or rolled back by the grid. **The application owns accessible save-error feedback**:
provide a visible message and an appropriate live region through that callback, outside any loading
or inert subtree. The grid does not announce save failures automatically. See the
[integration example](./INTEGRATION.md#application-owned-save-error-feedback).
Pending visual values are hidden from the accessibility tree to avoid duplicate cells;
authoritative row content remains exposed until the application updates.

The body-mounted editor follows ancestor scrolling, window/container resize and visual viewport
changes. Built-in editor frames clamp to the visible viewport and scroll internally when needed.
Custom popups remain inside their editor host and retain overflow behavior. Custom editors own
input labels, validation associations, composition handling, keyboard exit, popup sizing, explicit
save/cancel controls and focus. Test them independently, including with the on-screen keyboard.

## Touch and narrow layouts

Swipe immediately on cells or headers outside resize handles to scroll normally. A short tap within 8px without scrolling
focuses a cell. Native/custom controls retain their normal
activation and scrolling behavior.

Double-tap an editable cell to open its editor: start the second tap within 300 ms of the first
release, on the same cell and within 24px. Each contact must stay within 8px and end before the
500 ms hold activates. The editor opens and focuses on the second release. Use its Save/Cancel
buttons; native select changes save immediately. Read-only cells and cells awaiting a commit do
not open an editor. A swipe, hold, scroll, interruption or intervening input breaks the tap pair.
Cells reserve double-tap for editing while retaining native panning and pinch zoom.
Built-in text/select editors preserve the configured font size and focus with `preventScroll: true`.
The portal positions the editor within the visual viewport; native focus need not scroll or zoom
the page to reveal it. Confirm this behavior on the target iOS version when testing keyboard entry.

Hold a selectable cell for 500 ms, staying within 8px, to start a range. A one-cell highlight marks
activation. Keep the finger down and drag to extend across cells and frozen zones. After crossing a
cell, moving near the edges scrolls the grid automatically. Lift to retain the range; the next
ordinary swipe scrolls again without changing that selection. A short tap focuses a new cell and
clears the range. There is no control panel or persistent touch selection mode.

Moving more than 8px or scrolling before activation cancels the hold, even if the finger returns.
An extra contact, pointer cancellation/lost capture, Escape, loading, changed row identities/order
or column geometry, window blur/resize, or ancestor scrolling stops the gesture and its auto-scroll.
Updating row values with the same identities/order does not by itself cancel selection. Cancellation
retains the last range unless another operation clears or reconciles it (for example Escape or row
removal). Native browser menus are suppressed during the claimed cell hold; controls keep theirs.
If the browser has already taken over scrolling, the grid abandons selection instead of fighting it.

Drag a column-edge handle to resize immediately, without holding. A guide previews the width;
lifting commits once within the column's minimum/maximum limits. On coarse-pointer devices each
handle has a 12px invisible hit area inside the header. Only these handles reserve touch dragging;
the rest of the header permits native scrolling. Cancellation, lost capture, another contact,
Escape, loading, source identity changes, window blur or resize discard the preview. Read-only
widths and non-resizable/action columns do not expose resize handles.

Hold an eligible header for 500 ms, staying within 8px, until an insertion guide and floating header copy appear. The copy follows your finger,
offset upward where viewport space permits. Drag and release to reorder once within its frozen/center zone. Action columns and explicit reorder barriers
cannot be crossed. After dragging begins, the center zone scrolls horizontally near its edges to
reach offscreen columns; a stationary hold does not scroll or change order. Returning to the source
is a no-op. Immediate swipes keep native scrolling; embedded controls keep native activation.
Resize handles take priority and do not require a hold. Cancellation, an extra contact, lost capture,
Escape, loading, identity/geometry changes, window blur/resize or ancestor scrolling discard the
preview. Controlled read-only order and non-reorderable columns do not claim a header hold.

**Implementation gaps (2026-10-05):** keyboard column resizing and reordering still need direct
interactions. Hold-to-select, double-tap editing and touch resizing/reordering are implemented;
the full physical iOS/Android and assistive-technology matrix remains outstanding.
Run `pnpm check:touch` against a running `pnpm dev` app for the
Chromium touch-input smoke check; an optional URL selects a served production export, for example
`pnpm check:touch http://127.0.0.1:8080`. This is browser emulation, not physical-device evidence.
`pnpm check:reorder-indicator` runs standalone Chromium fixtures that check the guide's painted
pixels and drop results beside the checkbox gutter and at both ends of every frozen/center zone.
The checkbox gutter stays fixed; the first data-column drop position is immediately after it.

Default checkboxes are 16px controls inside labels covering their gutter cell (40px wide); choose
`rowHeight` 44 or larger for taller row targets. Replacement controls must provide usable targets.

Keep frozen widths plus gutter below container width, leaving useful center space. The grid never
silently unpins consumer columns. Use container-aware column props for narrow layouts/orientation.
For example, a consumer can use 44px rows and narrow or unpin columns below a chosen container
width. This responsive scenario is not included in the basic app or packed fixture. Test both
frozen bands at wider widths and transitions with an active editor/selection.

**Pen scope:** pen-driven grid drag manipulation is excluded from the current preview implementation
and is not a support claim. Native controls can receive pen activation. Decide and verify dedicated
pen gestures separately; do not infer them from mouse or touch results.

## Manual release matrix

Record date, commit, browser/OS/device versions, AT version/settings, input method, exact scenario,
observed result and pass/fail for each entry. No minimum supported versions are established yet.

| Environment             | Required checks                                    | Current status (2026-09-27)                           |
| ----------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Desktop Chrome          | All desktop steps; NVDA on Windows                 | Unverified; Brave smoke checks are not Chrome support |
| Desktop Edge            | All desktop steps; Narrator and/or NVDA on Windows | Unverified                                            |
| Desktop Firefox         | All desktop steps; NVDA on Windows                 | Unverified                                            |
| Desktop Safari          | All desktop steps; VoiceOver on macOS              | Unverified                                            |
| Physical iOS Safari     | All mobile steps; VoiceOver                        | Unverified                                            |
| Physical Android Chrome | All mobile steps; TalkBack                         | Unverified                                            |
| Windows forced colors   | Focus, selection, controls, errors and editing     | CSS implemented; manual verification pending          |

### Prepare a manual test consumer

Run `pnpm dev` and open `/` for basic navigation, native selection and text editing. For a broader
starting point, use the [packed-consumer workflow](./PACKAGE_VERIFICATION.md) and
[manual fixture instructions](../fixtures/README.md#running-a-generated-consumer-manually).
Its shared example includes a frozen Name column, offscreen focus buttons, native checkboxes,
a custom Status editor, initial loading, a refresh toggle and an empty-results button.

The former integration, styling and loading demo routes are removed. Neither the basic app nor the
packed example covers this entire matrix. Before testing, add the required scenarios to a consumer
using public APIs: both frozen bands and horizontal overflow, custom/mixed/read-only controls,
action/reorder barriers, native select and validation, delayed/rejected commits with accessible
feedback, row/column removal and reversal, multiple themes/grids, nested scrolling, responsive
unpinning and long editor content. The [integration](./INTEGRATION.md), [styling](./STYLING.md) and
[loading](./LOADING.md) guides describe the contracts to use.

Record the consumer revision/configuration with each result. Mark a scenario blocked when its
fixture or required interaction is missing; do not count the basic app smoke check as a matrix pass.
Physical-device testing also requires serving the consumer at a device-reachable address; the
automated runner binds localhost and its Chromium checks do not satisfy physical-device testing.

### Desktop steps

1. Tab from outside into/out of the grid in both directions. Check visible focus before any cell
   selection. Exercise every key above, empty data, all-nonselectable columns, first/last cells,
   offscreen rows/columns, multiple grids, and row reversal/removal. Verify active references never
   point to missing elements. Tab/Shift+Tab through default/custom controls and out to the page;
   confirm native keys work and focus remains visible as controls enter the virtual window.
2. With each AT, confirm grid name/counts; one logical row spanning both frozen bands; column header
   association; current cell value/position/read-only state; range and row selection. Scroll both
   axes through virtual-window gaps and navigate offscreen. Confirm no duplicate rows or content.
   Manually scroll the active cell away and back; confirm navigation remains understandable.
3. Test default **and custom** checkboxes: no selection, one row (mixed header), all rows, mixed→clear,
   Space/Enter as appropriate, Tab/Shift+Tab, read-only and loading. AT must announce name, checked/mixed,
   disabled/read-only state. Confirm one activation produces one selection update.
4. Edit text and native select values; cancel, unchanged save, invalid explicit save, corrected save,
   implicit invalid discard, rejected async save (including while loading) and row disappearance.
   Confirm field/error names, visible errors and correct focus destination. For async rejection,
   wire application feedback through `onCellCommitError` and verify its announcement, including while
   loading. Default editor validation announcements are separate and remain grid-provided.
   Open custom Status suggestions, choose Away, save/cancel; internal popup input must not commit early.
5. Resize from both sides of a seam; reorder in each frozen/center zone, including barriers and
   read-only columns. Keyboard equivalents are blocked on replacement interaction design. Verify sticky headers/bands during both
   scroll axes, capture outside grid, Escape, lost capture, loading, resize and unmount interruptions.
6. Use actual browser zoom at 200% and 400% plus OS text scaling; confirm no lost controls, readable
   errors and reachable horizontal overflow. Check default and custom light/dark themes and Windows
   forced colors: focus/ranges/errors must remain distinguishable without background color alone.
   Inspect long/multiline editor content and popup placement while page and nested ancestors scroll.

Physical mobile steps (desktop viewport emulation does not satisfy these):

1. On named iOS/Android devices, scroll the page, grid vertically and horizontally, start swipes in
   cells/headers/gutter, pinch zoom, tap and double-tap. No swipe should create a range or open an
   editor. Verify native/custom checkbox targets, mixed and read-only states with touch and AT.
2. Double-tap an editable cell and type with the on-screen keyboard. Confirm a single tap only
   focuses, distant/slow taps do not edit, and holds/swipes never open an editor. Test opening/closing/changing
   keyboard, predictive text, Japanese/Chinese/Korean IME candidates, dictation, emoji, select picker,
   native copy/paste, Save and Cancel. Candidate-confirmation Enter must not save prematurely.
3. Hold a cell for 500 ms until its range highlight appears, then drag across zones and beyond
   all edges; verify edge scrolling and range, including after the starting row is virtualized out. Release
   and immediately pan normally. Repeat with pointercancel, lost capture, a second finger both inside
   and outside the grid, app switch, loading, data changes and orientation changes. No stuck capture,
   continuing scroll loop, accidental editor or resize/reorder commit is acceptable.
4. Drag resize handles on both sides of boundaries and in frozen bands. Resize to limits and cancel
   mid-interaction without committing. Confirm header swipes outside handles still scroll. Repeat
   with controlled read-only state and action columns. Hold a header until the insertion guide appears,
   drag across columns in each zone, test barriers and return-to-source, then release or cancel.
   Drag toward the center edges to reach offscreen columns, including after the source header is
   virtualized out. Confirm the next immediate header swipe scrolls normally.
5. Test 320–430px portrait widths, landscape, device rotation, large fonts, both frozen bands and
   responsive unpinning. With AT active, use touch exploration and gesture navigation to complete
   selection, editing and column actions. Record usability findings, not only attribute inspection.

Implementation references: [ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/),
[virtual grid indices](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/),
[touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action),
[visual viewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).
