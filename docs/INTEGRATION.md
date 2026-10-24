# Integrating Data Griddle

Import components and types from `data-griddle` and styles from `data-griddle/styles.css`. Stores,
geometry helpers, and deep imports into the package aren't public API. The API may change before
1.0.

## State ownership and defaults

Your application owns `rows`, `columns`, `loading`, and saving data. When data or columns change,
pass new arrays and objects instead of mutating the old ones. The grid owns focus, ranges, drafts,
and gesture state. Checkbox row selection is separate from cell focus and ranges.

| State group   | Controlled value | Initial uncontrolled value | Change callback          |
| ------------- | ---------------- | -------------------------- | ------------------------ |
| Selected rows | `selectedRowIds` | `defaultSelectedRowIds`    | `onSelectedRowIdsChange` |
| Column order  | `columnOrder`    | `defaultColumnOrder`       | `onColumnOrderChange`    |
| Column widths | `columnWidths`   | `defaultColumnWidths`      | `onColumnWidthsChange`   |

Leave out the controlled value and the grid keeps that state itself. The grid reads a default only
on mount, so changing it later doesn't reset anything. In uncontrolled mode the change callback is
optional and reports user changes. In controlled mode, the callback passes the complete next set,
order array, or width map, and the change only happens when you pass that value back. The grid never
updates a controlled value ahead of you. A controlled value without its callback is read-only, and
the grid disables the matching controls. Don't switch a group between controlled and uncontrolled
while the grid is mounted.

Row selection is off by default (`enableRowSelection={false}`). Reordering and resizing are on by
default. All three are disabled while loading. Normal columns are selectable, resizable, and
reorderable by default, and editing is opt-in. Action columns can't do any of these and act as
reorder barriers. `rowHeight` defaults to 32px. Overscan defaults to 6 rows and 2 center columns.
The [column guide](./COLUMNS.md) describes column sizing defaults and limits.

`onSelectionChange` receives a snapshot of focus, range, and selected rows whenever they change,
including when the grid adjusts them after a data change. It doesn't fire on mount unless that
adjustment changes something. In controlled row selection, it also fires with the requested row
set, which only takes effect once you update `selectedRowIds`. Don't mutate snapshots or their sets.
Focus and range coordinates use `rowIndex`. Use `rowId` for anything you store, and for the
`focusCell` command. There are no controlled focus or range props, and no API to select a range
from code yet.

## Stable identity and reconciliation

`getRowId(row, index)` must return a unique, stable string or number. If rows can be reordered,
filtered, or paginated, use a key from the data, not the index. Keep each `column.id` unique and
stable when columns change. An ID names a record or field, so a new ID is a new target. The grid
only knows about the rows you currently pass. It doesn't fetch or paginate, and it doesn't keep
selections for rows that are gone.

When data changes, focus and both range ends follow their row IDs to the new indices. Removing the
focused row or column clears focus, and removing the row or column at either end of the range
clears the range. Selected row IDs that are no longer in `rows` stop showing as selected. The grid
doesn't call `onSelectedRowIdsChange` to remove them from a controlled set. If the ID is still in
your set when its row comes back, it shows as checked again. In uncontrolled mode, the grid forgets
those IDs. Changing a column's options doesn't clear existing focus, but later focus commands check
whether the column is selectable.

Column order skips removed and duplicate IDs and adds new columns at the end in schema order.
Frozen zones still decide where a column appears. Reordering stays within a zone and can't cross a
barrier. Width overrides apply by column ID and are clamped to the column's current limits. The grid
keeps overrides for missing columns, so a column that comes back gets its old width. None of these
adjustments, and no automatic fill sizing, call the order or width callbacks.

A draft and a pending save follow their row ID. If the edited row or column disappears, the grid
keeps the draft and shows a notice with a discard button until the target comes back or the user
discards it. Loading pauses the editor and its callbacks without saving. Pending saves continue.

## Replaceable selection checkboxes

`renderSelectionCheckbox(props: SelectionCheckboxProps)` replaces the row checkboxes and the header
checkbox. Without it, the grid uses native checkboxes. The renderer runs inside the selection gutter,
so selection changes don't re-render cells. Keep the renderer pure and call the callbacks from event
handlers.

```tsx
import type { SelectionCheckboxProps } from "data-griddle";

function SelectionControl(props: SelectionCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-label={props["aria-label"]}
      aria-checked={props.indeterminate ? "mixed" : props.checked}
      aria-readonly={props.readOnly}
      disabled={props.disabled}
      onClick={props.onChange}
      style={{ width: 32, height: 32 }}
    >
      <span aria-hidden="true">
        {props.indeterminate ? "−" : props.checked ? "✓" : ""}
      </span>
    </button>
  );
}

// On your grid (a 40px row fits this control):
// enableRowSelection
// rowHeight={40}
// renderSelectionCheckbox={(props) => <SelectionControl {...props} />}
```

`SelectionCheckboxProps` is a discriminated union with:

- `kind: "row"` with `rowId` and current zero-based `rowIndex`, or `kind: "all"` without a row.
- `checked`, `indeterminate`, `disabled`, `readOnly`, and `"aria-label"`.
- `onChange(): void`, which asks the grid to toggle selection. It takes no event and no checked
  value.

`disabled` is true while loading, when selection is read-only, and when there are no rows for the
header to select. `readOnly` is true when selection is controlled without a callback. A row
control's `indeterminate` is always false. The default accessible names are "Select all rows" and
"Select row N", where N is the one-based current row position. You can use `rowId` to look up a more
descriptive name, as long as the label still makes sense on its own.

The header checkbox acts on every row you pass, including offscreen rows that aren't rendered. An
unchecked header selects all rows, and a checked or mixed header clears them. A row checkbox
toggles that row's ID. `onChange` always reads the latest rows and state, and does nothing while
loading, when selection is read-only, or when the row is gone, even if your control kept an old
callback. You still need to pass `disabled` through to your control.

A custom control must reflect every state, expose checkbox semantics including the mixed state,
show a visible focus indicator, and activate from the keyboard with at least Space. A native button
already handles Space and Enter. If you render a native checkbox, set its DOM `indeterminate`
property. If a component library calls back with an event or a value, call `props.onChange()` from
it exactly once, and don't compute the next selection yourself. The gutter stops keyboard and
pointer-down events from reaching cell gestures.

Keep controls inside the gutter, which stays 40px wide, and make their pointer and touch targets
large enough. The example uses a 32px button in 40px rows. Choose the row height and target size for
your users, leave space between targets, and test with zoom, touch, and assistive technology. A
small checkmark is not a large enough target on its own. A disabled or read-only control must not
activate. Rendering the control into another portal takes it out of the gutter and isn't supported.
All of this applies to any nested elements inside your control too. Checking the accessibility tree
is not the same as testing with a screen reader.

## Imperative cell focus

```tsx
import { useRef } from "react";
import { DataGrid } from "data-griddle";

import type { Column, DataGridHandle } from "data-griddle";

type Person = { id: string; name: string };
function People({
  rows,
  columns,
}: {
  rows: readonly Person[];
  columns: readonly Column<Person>[];
}) {
  const grid = useRef<DataGridHandle>(null);
  const jump = () => {
    const result = grid.current?.focusCell({
      rowId: "person-42",
      columnId: "name",
    });
    if (result?.ok === false) console.log(result.reason);
  };
  return (
    <>
      <button onClick={jump}>Jump to person 42</button>
      <div style={{ height: 480 }}>
        <DataGrid
          ref={grid}
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
        />
      </div>
    </>
  );
}
```

`DataGrid` still infers the row type when you pass an object ref or a callback ref. The handle uses
`forwardRef` and `useImperativeHandle` and works with React 18 and 19. See
[package verification](./PACKAGE_VERIFICATION.md) for the tested versions. Read `ref.current` when
you call the command, because the handle can change after a render. The ref is `null` while the grid
is unmounted.

`focusCell` returns a `FocusCellResult`. It looks up the row in the current `rows` with `getRowId`,
then the column, and returns the first failure in this order:

| Order | Result                                      | Condition                                                                        |
| ----- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| 1     | `{ ok: false, reason: "row-not-found" }`    | No currently supplied row has that ID                                            |
| 2     | `{ ok: false, reason: "column-not-found" }` | No current column has that ID                                                    |
| 3     | `{ ok: false, reason: "not-selectable" }`   | Action column or `selectable: false`                                             |
| 4     | `{ ok: false, reason: "busy" }`             | Loading; any active/preserved editor draft; selection, resize or reorder gesture |
| 5     | `{ ok: true }`                              | Accepted                                                                         |

A pointer held down on a header counts as busy even before it has moved far enough to start a
reorder. A pending async save doesn't block focus, even on the cell being saved, but that cell can't
be edited until the save finishes. A failed call doesn't change selection, focus, or scroll position,
and never saves or discards a draft.

On success, the grid focuses its scroll container on the target cell, clears the range, keeps the
checkbox selection, and asks the browser to scroll the cell into view. This works for offscreen rows
and center columns. Targeting a frozen column doesn't change the horizontal scroll position. The
cell may not be rendered yet when the call returns, and it can't be fully visible if the viewport is
smaller than the cell plus the frozen zones. `focusCell` never fetches or paginates. Use
`onSelectionChange` to track focus, not the internal stores.

Pressing a toolbar button outside the grid can save an open editor before the button's click handler
calls `focusCell`. `focusCell` itself never saves. To check focus while editing without that save,
call it from a keyboard handler without moving focus out of the editor.

## Editing, validation and persistence

`accessor` reads the value from your row. Set `editable` to `true` or to a function of the cell
context to enable editing. Action columns can't be edited. The built-in text editor opens on Enter,
F2, typing, or a second click on the focused cell. `type: "select"` shows `options`, and
`renderEditor` replaces the editor's content.

The grid holds the draft in `ctx.draft`, and `ctx.setDraft(next)` changes it. When the user saves:

1. If you supplied `parseValue(draft, ctx)`, it converts the draft synchronously.
2. If the parsed value is `Object.is` equal to the current accessor value, the editor closes without
   validating or calling a commit callback.
3. Otherwise `validate(parsedValue, ctx)` runs. Return a non-empty message to reject the value, or
   `null`, `undefined`, or an empty string to accept it. Keep parsers and validators pure, and don't
   throw from them. Turn bad input into a value your validator rejects instead. An exception there
   is not a save error and doesn't call `onCellCommitError`.
4. If an explicit save is rejected, the editor stays open with its draft, and `ctx.error` and
   `ctx.status` show the error. After an error, the draft is revalidated 200ms after the user stops
   typing, and saving validates the latest draft immediately. If an implicit save is rejected, the
   grid discards the draft so the user isn't stuck in the editor.
5. If the value is accepted, the editor closes and the grid calls the column's `onCommit`, or the
   grid's `onCellCommit` if the column has none. The payload has the row and column IDs, the current
   row, the previous value, and the parsed new value.

Explicit saves are `ctx.commit()`, Enter or Tab in the built-in text editor, and picking a native
select option. In the built-in text editor, Enter moves down, Tab moves right, Shift+Enter inserts a
newline, and Escape cancels. `ctx.commit()` saves without moving. `ctx.cancel()` discards the draft
and returns focus to the grid. Blurring the built-in text editor and pressing outside the editor host
are implicit saves. Custom editors decide what blur does, and `ctx.commit()` always validates as an
explicit save.

If the commit callback returns a promise, the cell shows the new value and a spinner until it
settles. If the callback throws or the promise rejects, the grid clears the pending value, flashes
the cell, and calls `onCellCommitError({ update, error })`. The draft isn't reopened, and focus may
have moved on. Show failure or retry UI yourself, and undo any optimistic change you made to your
rows. The grid never changes or rolls back your rows.

On success, update `rows` with the saved value before your promise resolves. Otherwise the cell goes
back to showing the old accessor value. Without a commit callback, an accepted value just closes the
editor and leaves `rows` unchanged. Loading doesn't cancel pending saves.

## Application-owned save-error feedback

The grid doesn't announce save errors. Use `onCellCommitError` to show an accessible message. Keep
the live region mounted outside the grid and outside anything that becomes inert during loading.
Localize the wording, and don't announce twice if you already have a notification system. For
example, in a component that already defines `rows` and `columns`:

```tsx
const [saveError, setSaveError] = useState("");

return (
  <>
    <DataGrid
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      onCellCommit={async (update) => {
        setSaveError("");
        await saveCell(update); // Update authoritative rows before resolving.
      }}
      onCellCommitError={({ update }) => {
        setSaveError(
          `Could not save ${update.columnId} in row ${update.rowId}. Please retry.`
        );
      }}
    />
    <p role="alert" aria-atomic="true">
      {saveError}
    </p>
  </>
);
```

`saveCell` is your own save function. The example doesn't roll anything back, so undo any
optimistic row update yourself. Test the announcement with a real screen reader, including repeated
failures and failures that arrive while loading.

## Custom editor focus, keyboard and popups

The grid draws a themeable editor frame and positions it in a portal under `document.body`. See
[styling](./STYLING.md#editor-themes) for tokens and sizing limits. Your editor content receives
`CellEditContext<T>` and inherits the frame's theme. It must:

- Focus a sensible input on mount, move focus between its own controls, and use `ctx.status` and
  `ctx.error` to give labels, visible focus, and validation announcements.
- Decide which keys save and cancel, keep native input and IME behavior working, and call
  `preventDefault` on keys it handles. `ctx.commit()` doesn't move focus on Tab, so decide where Tab
  goes and don't trap focus. Escape should cancel. The open editor receives all keyboard input.
- Keep popups inside the editor host in the DOM, including a component library's popup container.
  Being a React child isn't enough. A popup rendered separately into `document.body` is outside the
  host, and clicking it saves the edit. A positioned element inside the host can extend past the
  frame and still count as inside.
- Not save on every blur, because focus moving to your own popup is a blur. Check whether
  `relatedTarget` is inside a wrapper around all your controls, or use explicit Save and Cancel
  buttons. The grid already ignores presses inside its host.
- Use the context callbacks, not internal stores, because the callbacks handle loading and row
  identity. Keep the draft in `ctx.draft` so it survives loading and a missing target.

Run `pnpm dev` and open `/` for the [basic editable grid](../apps/docs/examples/BasicExample.tsx).
The [packed-consumer example](../fixtures/shared/Example.tsx) adds offscreen focus, a frozen column,
native row-selection checkboxes, loading and empty states, and a custom Status editor with a popup.
Run it with the [consumer verification workflow](./PACKAGE_VERIFICATION.md). No example covers
custom checkboxes, controlled or read-only selection, or row reversal. The source integration tests
check that choosing from a popup doesn't save early. Browsers other than Chromium, physical mobile
devices, and assistive technology are untested.

## Accessibility and input integration

See [Accessibility and interaction](./ACCESSIBILITY.md) for keyboard and touch behavior, tab
order, and the manual test matrix. The sections above list what custom checkboxes, custom editors,
and save-error feedback must handle themselves.

## Next.js client boundary and stylesheet

Keep SSR enabled. Import the stylesheet in `app/layout.tsx` or `pages/_app.tsx`:

```tsx
import "data-griddle/styles.css";
```

Define accessors, renderers, ID functions, and event callbacks inside a Client Component. A Server
Component can pass in serializable row data:

```tsx
"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import type { Column } from "data-griddle";

type Person = { id: number; name: string };
export function People({ initialRows }: { initialRows: Person[] }) {
  const [rows, setRows] = useState(initialRows);
  const columns: Column<Person>[] = [
    { id: "name", name: "Name", accessor: (row) => row.name, editable: true },
  ];
  return (
    <div style={{ height: 320 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onCellCommit={({ rowId, nextValue }) =>
          setRows((current) =>
            current.map((row) =>
              row.id === rowId ? { ...row, name: String(nextValue) } : row
            )
          )
        }
      />
    </div>
  );
}
```

The library entry keeps its `"use client"` directive, which doesn't turn off server rendering. The
server renders a labeled grid shell. Rows and center headers depend on layout measurement, so they
may be missing from the initial HTML. Put content that must be indexed for search outside the grid.
Server Components can't pass column definitions that contain functions. The same component and
stylesheet work in the Pages Router, without an `ssr: false` wrapper.
