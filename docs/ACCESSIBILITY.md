# Accessibility and interaction

The grid implements ARIA grid semantics, keyboard navigation, touch tap and scroll, hold-to-select,
double-tap editing, and touch column resizing and reordering. None of this has been tested on the
full set of browsers, on physical devices, or with screen readers. The
[manual release matrix](#manual-release-matrix) below is the plan for that testing, and every entry
in it is still unverified. Automated tests and the browser's accessibility tree don't show whether
the grid works with a screen reader.

## Semantics and virtualization

Give each grid an `aria-label` or `aria-labelledby`. Without one, its name is "Data grid". The
scroller has `role="grid"`, row and column counts for all the data you pass in, and multiselect
semantics. The counts include the header row and, when row selection is on, the checkbox column.
The grid doesn't know about rows that exist only on your server, so the counts describe the `rows`
array you pass. Row and cell indices are one-based positions in that array and in the visual column
order, so rows and columns outside the rendered window still count.

Each logical ARIA row uses `aria-owns` to claim its rendered header or cell elements from the
gutter and every zone, without duplicating custom content. On a row, `aria-selected` means the row's
checkbox is checked. On a cell, it means the cell is inside the selected range. The active cell is
tracked separately from selection. `aria-readonly` is true on cells that can't be edited.
`aria-activedescendant` always points at a mounted cell. If you scroll the active cell out of the
rendered window, the reference is removed, and it comes back when the cell is rendered again.
Keyboard navigation scrolls the active cell into view.

This `aria-owns` approach needs manual testing with each browser and screen reader pair, checking
header association, row order, and active-cell announcements. If a pair doesn't follow `aria-owns`,
the grid's DOM layout has to change before that pair can be supported. The grid doesn't offer a
complete, non-virtualized table for browse mode, or an export. If you need one, render a separate
view.

## Keyboard and focus

| Input                | Behavior                                                                |
| -------------------- | ----------------------------------------------------------------------- |
| Tab / Shift+Tab      | Follow the browser's tab order through the grid, its controls, and page |
| Arrows               | Move between selectable data cells, skipping action and other columns   |
| Shift+Arrows         | Extend the range                                                        |
| Ctrl/Meta+Arrows     | Move to an edge                                                         |
| Home / End           | First or last selectable column in the current row                      |
| Ctrl/Meta+Home / End | First or last selectable cell in the data                               |
| PageUp / PageDown    | Move by the number of visible body rows                                 |
| Enter / F2           | Edit the active cell, if it is editable                                 |
| Printable character  | Start editing the active cell, replacing its value with the character   |
| Escape               | Clear the range and cancel any pointer gesture in progress              |

The grid container is one tab stop for moving between cells. Checkboxes and custom controls inside
cells keep the browser's normal tab order and their own keys. The grid doesn't change `tabindex`,
has no separate interaction mode, and doesn't handle F6. Tab and Shift+Tab visit each rendered
control before leaving the grid. The shortcuts above only work while the grid container itself has
focus, not while a control inside a cell does.

Only rendered controls can take focus. They are visited in DOM order, zone by zone, so the tab
order can have more stops than expected and can differ from the visual row order. The grid doesn't
implement the single-tab-stop composite grid pattern from the ARIA guide. Custom content must make
itself focusable, give itself an accessible name, and show its own focus. Don't use a positive
`tabindex`. The grid has no copy, paste, sort, or filter shortcuts.

The active cell's border is the focus indicator. If the grid has focus but no active cell, as in an
empty grid, the container shows an outline instead. Scrolling a focused cell out of the rendered
window removes its ARIA reference but doesn't show the container outline. The next arrow key brings
the active cell back into view.

Column resizing and reordering don't work from the keyboard yet. They need a mouse or touch.
Keyboard navigation, selection, and editing all work. The grid has no built-in actions menu.

## Editing, validation and errors

Built-in editors are named "Column name, row N". In the text editor, Enter saves and moves down,
Shift+Enter inserts a newline, Tab and Shift+Tab save and move right or left, and Escape cancels.
The editor ignores these keys while an IME composition is active, including the key-code 229
fallback. The Save edit and Cancel edit buttons give touch users an explicit way to finish. A
native select saves as soon as its value changes.

When an explicit save fails validation, the editor stays open, links the error message to its
input, and announces it. Leaving the default editor saves the draft, subject to validation, and an
invalid draft is discarded. Moving focus between the input and the editor's buttons doesn't save.
Saving or cancelling explicitly returns focus to the grid. Leaving for a control outside the grid
leaves focus on that control.

When an asynchronous save fails, the grid clears the pending value, briefly marks the cell, and
calls `onCellCommitError({ update, error })`. By then the editor has closed. The grid never changes
or rolls back your rows. The grid doesn't announce save failures, so your application has to: show
a visible message and update a live region from that callback, outside anything that becomes inert
during loading. See the
[integration example](./INTEGRATION.md#application-owned-save-error-feedback). Pending values are
hidden from the accessibility tree so cells aren't announced twice. Assistive technology reads the
current row value until your application updates it.

The editor is mounted in `document.body` and follows scrolling of any ancestor, window and
container resizes, and visual viewport changes. Built-in editor frames stay inside the visible
viewport and scroll internally if needed. Custom popups stay inside their editor host and keep
their own overflow behavior. Custom editors are responsible for input labels, linking validation
messages, IME composition, keyboard exit, popup sizing, save and cancel controls, and focus. Test
each one on its own, including with an on-screen keyboard.

## Touch and narrow layouts

### Scrolling and tapping

A swipe on a cell or header, outside the resize handles, scrolls normally. A tap that moves less
than 8px and doesn't scroll focuses the cell. Native and custom controls keep their normal
activation and scrolling.

### Double-tap editing

Double-tap an editable cell to open its editor. The second tap must start within 300 ms of the
first one ending, on the same cell, and within 24px of it. Each tap must move less than 8px and end
before the 500 ms hold starts. The editor opens and takes focus when the second tap ends. Use its
Save and Cancel buttons, or change a native select to save immediately. Double-tapping a read-only
cell or a cell waiting on a save does nothing. A swipe, a hold, a scroll, an interruption, or other
input between the taps cancels the double tap. Cells use double tap for editing but still allow
native panning and pinch zoom.

The built-in text and select editors keep the grid's font size and focus with
`preventScroll: true`. The portal positions the editor inside the visual viewport, so the browser
shouldn't need to scroll or zoom to show it. Check this on each iOS version you test with the
on-screen keyboard.

### Range selection

Hold a selectable cell for 500 ms, moving less than 8px, to start a range. A one-cell highlight
shows that the hold worked. Keep your finger down and drag to extend the range, including across
frozen zones. Once you've crossed into another cell, moving near an edge scrolls the grid. Lift
your finger to keep the range. The next normal swipe scrolls without changing it. A short tap on
another cell focuses it and clears the range. There is no persistent touch selection mode.

Moving more than 8px or scrolling before the hold completes cancels it, even if your finger moves
back. The following stop the gesture and its auto-scroll:

- A second finger
- `pointercancel` or lost pointer capture
- Escape
- Loading starting
- Changes to row IDs, row order, or column geometry
- The window losing focus or resizing
- An ancestor scrolling

Changing row values without changing row IDs or order doesn't cancel the selection. When a gesture
is cancelled, the range it reached stays selected until something else clears or adjusts it, such
as Escape or removing the row. During a cell hold, the grid suppresses the browser's context menu,
but controls keep theirs. If the browser has already started scrolling, the grid gives up on the
selection.

### Column resizing

Drag a column edge handle to resize straight away, without a hold. A guide shows the new width, and
lifting your finger applies it once, within the column's `minWidth` and `maxWidth`. On
coarse-pointer devices each handle has an invisible 12px hit area inside the header. Only the
handles block native scrolling, so swiping elsewhere on a header scrolls. Lost capture, a second
finger, Escape, loading, a change to the column, or the window losing focus or resizing discards
the resize. Columns with read-only widths, non-resizable columns, and action columns have no
handles.

### Column reordering

Hold a header for 500 ms, moving less than 8px, until an insertion guide and a floating copy of the
header appear. The copy follows your finger, shifted up when there's room. Drag and release to move
the column within its zone. A column can't move past an action column or a reorder barrier. While
dragging, moving near the edge of the center zone scrolls it horizontally to reach offscreen
columns. Holding still doesn't scroll or move anything. Dropping a column where it started does
nothing. Swiping without a hold scrolls normally, and controls in the header still respond to taps.
Resize handles take priority and don't need a hold. A second finger, lost capture, Escape, loading,
changes to IDs or geometry, the window losing focus or resizing, or an ancestor scrolling cancels
the reorder. Columns with a read-only order and non-reorderable columns don't respond to a hold.

### Automated touch checks

`pnpm check:touch` runs Chromium touch emulation against a running `pnpm dev` app. Pass a URL to
test a served production build instead, for example `pnpm check:touch http://127.0.0.1:8080`, or
`--export` to serve `apps/docs/out` itself, as CI does. This
is emulation, not a physical device. `pnpm check:reorder-indicator` runs standalone Chromium pages
that check the guide's painted pixels and the drop results next to the checkbox gutter and at both
ends of each zone. The checkbox gutter never moves, and the first drop position for a data column
is directly after it.

### Target sizes and narrow layouts

Default checkboxes are 16px, inside labels that cover their 40px-wide gutter cell. For taller touch
targets, set `rowHeight` to 44 or more. Replacement checkboxes need their own adequate targets.

Keep the total width of frozen columns and the gutter well below the container width, so the center
zone still has room. The grid never unpins your columns. For narrow layouts and orientation
changes, change the column props based on container width. For example, use 44px rows and narrow
or unpin columns below a width you choose. Neither the dev app nor the packed fixture shows this.
Test both frozen zones at wider widths, and test switching layouts while an editor or selection is
active.

### Pens

The grid doesn't support pen drag gestures. Native controls still respond to a pen tap. Mouse and
touch test results say nothing about pens, so pen gestures need their own design and testing.

## Manual release matrix

For each entry, record the date, commit, browser, OS, and device versions, the assistive technology
version and settings, the input method, the exact scenario, what happened, and whether it passed.
No minimum supported versions are set yet.

| Environment             | Required checks                                    | Status (2026-09-27)                                    |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Desktop Chrome          | All desktop steps; NVDA on Windows                 | Unverified. Brave smoke checks don't count for Chrome. |
| Desktop Edge            | All desktop steps; Narrator and/or NVDA on Windows | Unverified                                             |
| Desktop Firefox         | All desktop steps; NVDA on Windows                 | Unverified                                             |
| Desktop Safari          | All desktop steps; VoiceOver on macOS              | Unverified                                             |
| Physical iOS Safari     | All mobile steps; VoiceOver                        | Unverified                                             |
| Physical Android Chrome | All mobile steps; TalkBack                         | Unverified                                             |
| Windows forced colors   | Focus, selection, controls, errors and editing     | CSS written, not tested                                |

### Prepare a manual test consumer

Run `pnpm dev` and open `/` to test basic navigation, row selection, and text editing. For more
scenarios, use the [packed-consumer workflow](./PACKAGE_VERIFICATION.md) and the
[manual fixture instructions](../fixtures/README.md#running-a-generated-consumer-manually). The
shared example has a frozen Name column, buttons that focus offscreen cells, native checkboxes, a
custom Status editor, initial loading, a refresh toggle, and an empty-results button.

Neither the dev app nor the packed example covers the whole matrix. Before testing, build these
scenarios into a consumer with the public API:

- Both frozen zones, with horizontal overflow
- Custom, mixed, and read-only controls
- Action columns and reorder barriers
- A native select and validation
- Slow and rejected saves, with accessible error feedback
- Removing and reversing rows and columns
- Several grids with different themes
- Nested scrolling
- Unpinning columns on narrow screens
- Long editor content

The [integration](./INTEGRATION.md), [styling](./STYLING.md), and [loading](./LOADING.md) guides
describe the APIs to use.

Record the consumer's revision and configuration with each result. If a scenario's fixture or
interaction is missing, mark it blocked. A smoke check of the dev app doesn't count as a pass. To
test on a physical device, serve the consumer at an address the device can reach. The automated
runner binds to localhost, and its Chromium checks don't count as device testing.

### Desktop steps

1. Tab into and out of the grid from outside, in both directions. Check that focus is visible
   before any cell is selected. Try every key in the table above, with empty data, with only
   non-selectable columns, at the first and last cells, on offscreen rows and columns, with several
   grids, and after reversing or removing rows. Check that the active reference never points at a
   missing element. Tab and Shift+Tab through default and custom controls and out to the page.
   Check that native keys work and that focus stays visible as controls scroll into view.
2. With each screen reader, check the grid's name and counts, that one logical row spans both
   frozen zones, column header association, the current cell's value, position, and read-only
   state, and range and row selection. Scroll both axes through unrendered areas and navigate to
   offscreen cells. Check that no rows or content are read twice. Scroll the active cell away and
   back by hand, and check that navigation still makes sense.
3. Test both default and custom checkboxes with no rows selected, one row selected (header shows
   mixed), all rows selected, and clearing a mixed selection. Use Space or Enter as appropriate, Tab
   and Shift+Tab, read-only state, and loading. The screen reader must announce the name, the
   checked or mixed state, and the disabled or read-only state. Check that one activation causes
   one selection update.
4. Edit text and native select values. Try cancelling, saving with no change, saving an invalid
   value explicitly, then a corrected value, leaving with an invalid value so it's discarded, a
   rejected async save (also while loading), and the row disappearing. Check the field and error
   names, the visible errors, and where focus goes. For async rejection, report the error through
   `onCellCommitError` in your application and check that it's announced, also while loading. The
   grid announces the default editor's validation errors itself. Open the custom Status
   suggestions, choose Away, and save or cancel. Typing in the popup must not save early.
5. With a mouse, resize from both sides of a zone boundary, and reorder within each zone, including
   with barriers and read-only columns. Keyboard resizing and reordering aren't supported. Check
   that sticky headers and frozen zones hold while scrolling both axes. Interrupt gestures by
   releasing outside the grid, pressing Escape, losing capture, loading, resizing, and unmounting.
6. Use real browser zoom at 200% and 400%, and OS text scaling. Check that no controls are lost,
   errors are readable, and horizontal overflow can be reached. Check the default theme, custom
   light and dark themes, and Windows forced colors. Focus, ranges, and errors must be
   distinguishable without relying on background color. Check long and multiline editor content and
   popup placement while the page and nested ancestors scroll.

### Physical mobile steps

Desktop viewport emulation doesn't count for these.

1. On named iOS and Android devices, scroll the page and the grid in both directions. Start swipes
   on cells, headers, and the gutter, pinch zoom, tap, and double-tap. No swipe should create a
   range or open an editor. Check native and custom checkbox targets, and the mixed and read-only
   states, with touch and with a screen reader.
2. Double-tap an editable cell and type with the on-screen keyboard. Check that a single tap only
   focuses, that taps too far apart or too slow don't edit, and that holds and swipes never open an
   editor. Test opening, closing, and switching keyboards, predictive text, Japanese, Chinese, and
   Korean IME candidates, dictation, emoji, the select picker, native copy and paste, and Save and
   Cancel. Pressing Enter to confirm an IME candidate must not save.
3. Hold a cell for 500 ms until the highlight appears, then drag across zones and past every edge.
   Check edge scrolling and the range, including after the starting row scrolls out of the rendered
   window. Release and pan normally straight away. Repeat with `pointercancel`, lost capture, a
   second finger inside and outside the grid, switching apps, loading, data changes, and rotation.
   Capture must never get stuck, scrolling must stop, and no editor, resize, or reorder may happen
   by accident.
4. Drag resize handles on both sides of zone boundaries and in frozen zones. Resize to the limits,
   and cancel partway without applying the width. Check that swiping a header outside the handles
   still scrolls. Repeat with read-only widths and action columns. Hold a header until the guide
   appears, drag across columns in each zone, test barriers and dropping on the starting position,
   then release or cancel. Drag toward the center zone's edges to reach offscreen columns, including
   after the source header scrolls out of the rendered window. Check that the next header swipe
   scrolls normally.
5. Test portrait widths from 320px to 430px, landscape, rotating the device, large fonts, both
   frozen zones, and unpinning on narrow screens. With a screen reader on, use touch exploration and
   gesture navigation to select, edit, and resize and reorder columns. Record whether these tasks
   are usable, not only which attributes are present.

References: [ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/),
[virtual grid indices](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/),
[touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action),
[visual viewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).
