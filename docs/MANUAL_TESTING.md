# Manual testing

This is the maintainer side of the docs site's accessibility, loading, and integration pages: what
the automated checks cover, what they don't, and the manual matrix a release still needs. The
user-facing behavior lives in the docs site (`apps/docs/content/docs`).

## Automated coverage

### Touch

`e2e/specs/touch.spec.ts` runs Chromium touch emulation (`pnpm test:e2e`) against the `people`
scenario in `e2e/scenarios/`. This is emulation, not a physical device.
`e2e/specs/reorder-indicator.spec.ts` runs standalone Chromium pages
that check the guide's painted pixels and the drop results next to the checkbox gutter and at both
ends of each zone. The checkbox gutter never moves, and the first drop position for a data column
is directly after it.

### Loading and empty results

The [packed-consumer example](../fixtures/shared/Example.tsx) has an initial-loading grid, a
refresh toggle, and an empty-results button. The [consumer checks](./PACKAGE_VERIFICATION.md) run
those scenarios. The checks don't cover custom indicators or a delayed refresh during editing.
Loading states haven't been tested on physical mobile devices or with assistive technology.

### Integration and styling

The packed-consumer example adds offscreen focus, a frozen column, native row-selection
checkboxes, loading and empty states, and a custom Status editor with a popup. It uses the default
styles without the docs app's CSS. Run it with the
[consumer verification workflow](./PACKAGE_VERIFICATION.md). The source integration tests check
that choosing from a popup doesn't save early.

The docs site has demos for custom checkboxes and imperative focus, but no automated check runs
them. Nothing covers controlled or read-only selection, row reversal, two grids with different
themes, density changes, or theme changes while an editor is open. Browsers other than Chromium,
physical mobile devices, and assistive technology are untested.

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

Run `pnpm dev` and open `/docs/` to test basic navigation, row selection, and text editing. The
feature pages under `/docs/features/` add demos for custom checkboxes, validation, and saves that
fail. For more scenarios, use the [packed-consumer workflow](./PACKAGE_VERIFICATION.md) and the
[manual fixture instructions](../fixtures/README.md#running-a-generated-consumer-manually). The
shared example has a frozen Name column, buttons that focus offscreen cells, native checkboxes, a
custom Status editor, initial loading, a refresh toggle, and an empty-results button.

Neither the docs app nor the packed example covers the whole matrix. Before testing, build these
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

The docs site's guide and feature pages describe the APIs to use.

Record the consumer's revision and configuration with each result. If a scenario's fixture or
interaction is missing, mark it blocked. A smoke check of the docs app doesn't count as a pass. To
test on a physical device, serve the consumer at an address the device can reach. The automated
runner binds to localhost, and its Chromium checks don't count as device testing.

### Desktop steps

1. Tab into and out of the grid from outside, in both directions. Check that focus is visible
   before any cell is selected. Try every key in the keyboard table on the docs site's
   accessibility page, with empty data, with only non-selectable columns, at the first and last cells, on offscreen rows and columns, with several
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
