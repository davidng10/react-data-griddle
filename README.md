# Data Griddle

A virtualized, DOM-based data grid for React. Selection, editing, and pointer state live in stores
outside the cell-rendering path, so large datasets stay responsive while you interact with them.

## Features

- Virtualized rows and center columns
- Left and right frozen columns
- Cell focus, range selection, and checkbox row selection
- Touch hold-and-drag range selection with edge scrolling
- Double-tap to edit on touch
- Keyboard navigation and type-to-edit
- Custom cell, header, editor, and selection-checkbox renderers
- Imperative cell focus by row and column ID
- Synchronous validation and asynchronous commits
- Column reordering within a zone by mouse or touch (hold a header, drag, release)
- Column resizing by mouse or touch, with optional persistence callbacks

## Usage

Version 0.1.0 is experimental. APIs, styling contracts, and behavior may change between `0.x`
releases, so pin an exact version and read the release notes before upgrading.

```bash
npm install --save-exact data-griddle@0.1.0
```

The package needs matching `react` and `react-dom` versions in `^18.3.1 || ^19.2.6`. It ships ESM
only, targets ES2022, and has no CommonJS build. The packed tarball is tested in desktop Chromium with
React 18.3.1 and 19.2.6 in Vite and the Next.js Pages Router, and with React 19 in the App Router.
No minimum browser or OS versions, mobile browsers, or screen readers are verified yet. To test
local changes, use the tarball workflow in the [package verification guide](./docs/PACKAGE_VERIFICATION.md).

Import `data-griddle/styles.css` once in your application entry, because the JavaScript entry does
not inject CSS. In Next.js, import it in the root layout (App Router) or `pages/_app.tsx`.

```tsx
"use client";

import "data-griddle/styles.css";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import type { CellCommit, Column } from "data-griddle";

type Person = {
  id: number;
  name: string;
  role: string;
};

const columns: Column<Person>[] = [
  {
    id: "name",
    name: "Name",
    width: 220,
    frozen: "left",
    accessor: (row) => row.name,
    editable: true,
  },
  {
    id: "role",
    name: "Role",
    width: 180,
    accessor: (row) => row.role,
    editable: true,
  },
];

export function PeopleGrid() {
  const [rows, setRows] = useState<Person[]>([
    { id: 1, name: "Ada", role: "Engineer" },
  ]);
  const [columnOrder, setColumnOrder] = useState(
    columns.map((column) => column.id)
  );

  const commit = ({ rowId, columnId, nextValue }: CellCommit<Person>) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, [columnId]: nextValue } : row
      )
    );
  };

  return (
    <div style={{ height: 480 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        onCellCommit={commit}
        enableRowSelection
      />
    </div>
  );
}
```

The grid fills its parent, so give the container a height. The grid does not store row data. Your
commit handler must write accepted values back into `rows`.

## Loading and empty results

Pass your request state through `loading`. `rows` accepts `null` or `undefined` when no result exists
yet. An empty array means the request finished with no rows, so don't substitute `[]` for missing
data.

```tsx
<DataGrid
  rows={data}
  loading={isFetching}
  columns={columns}
  getRowId={(row) => row.id}
  aria-label="People"
  loadingLabel="Updating people"
  emptyContent={<span>No matching people</span>}
/>
```

Your application supplies `data` and `isFetching`. The grid does not fetch or cache data. To keep the
current rows visible during a sort, filter, or page request, keep passing them with `loading` set.
While loading, the grid ignores input inside itself and pauses any open editor without losing its
draft. The [loading guide](./docs/LOADING.md) has the full state table and interaction rules.

## Columns

- `accessor` reads the displayed value from a row.
- `editable` enables editing. `renderEditor` supplies a custom editor.
- `renderCell` and `renderHeader` customize read-mode cells and headers.
- `parseValue` converts a draft before validation and commit.
- `validate` returns an error message to reject a value.
- `onCommit` overrides the grid-level `onCellCommit` for one column.
- `frozen` pins a column to the left or right zone.
- `selectable`, `resizable`, `reorderable`, and `reorderBarrier` change a normal column's behavior.
- `type: 'action'` columns are never selectable, editable, resizable, or reorderable, and always act
  as a reorder barrier. Setting those props on an action column has no effect.

Row selection, column order, and column widths each accept a controlled value, a default value, and a
change callback. Reordering and resizing work without any props. If you pass a controlled value
without its change callback, the grid treats it as read-only and disables the matching UI.

Columns without a `width` get 140px, except the last one in visual order, which fills the remaining
width. The [column guide](./docs/COLUMNS.md) covers fill width, resizing, and frozen-column costs.

## Styling and themes

The default styles in `data-griddle/styles.css` only target grid-owned classes. `id`, `className`,
and `style` go on the outer frame, which does not scroll. `aria-label` and other accessible names go
on the inner scroll container, which takes focus. Set `--dgr-*` variables on the frame or an
ancestor. Editors mounted in `document.body` copy the theme of the grid
that opened them. Columns accept `cellClassName` and `headerClassName` as strings or callbacks that
receive the cell or header context.

Cells and headers clip overflow but don't add an ellipsis. To truncate, add CSS through those
classes or style the content inside a custom renderer. Set geometry with `rowHeight` and column
widths, and appearance with CSS.

The [styling contract](./docs/STYLING.md) lists tokens, defaults, parts, callback contexts, and the
limits of portal theme syncing, with theme and conditional-class examples.

## Integration APIs

The [integration guide](./docs/INTEGRATION.md) covers controlled, uncontrolled, and read-only state,
stable identity, editing and persistence, custom selection controls, and
`DataGridHandle.focusCell`. Stores and geometry helpers are private. The
[package verification guide](./docs/PACKAGE_VERIFICATION.md) lists the exact tested versions and
known gaps.

## Accessibility and interaction

The [keyboard, touch, and accessibility guide](./docs/ACCESSIBILITY.md) covers navigation, tab
order for native controls, editor behavior, known touch and column interaction gaps, and the manual
test matrix. The grid implements ARIA semantics and keyboard navigation, but nobody has tested it on
target browsers, physical devices, or screen readers yet. The grid doesn't unpin frozen columns on
narrow screens, so your application has to adjust frozen widths and columns itself.

## Workspace and releases

To work on the grid itself, see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, commands, and pull
request conventions.

- `packages/data-griddle/`: library source, styles, tests, ESM build, and declarations.
- `apps/docs/`: Next.js App Router dev app with one grid.
- `fixtures/`: packed-consumer templates that the verification scripts copy outside the workspace.
- `docs/`: Markdown guides. There is no documentation site.

The dev app imports only public package exports. `pnpm dev` builds the library, then watches it
alongside Next.js. Restart it after changing the package's `exports` map.

npm publishes 0.1.0 under the `latest` tag. That makes it the default install, not a stable API.

GitHub Actions opens release PRs and publishes the tested package when a maintainer merges one. Only
the library is published. The workspace root and dev app are private. See the
[release checklist](./docs/RELEASING.md) for the workflow, manual checks, and publish recovery, and
the [changelog](./CHANGELOG.md) for the initial feature scope and limitations.
