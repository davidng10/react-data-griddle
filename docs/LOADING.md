# Loading and empty results

The grid doesn't fetch data. Set `loading` (default `false`) yourself, and keep passing the previous
rows during a refresh. `rows` is required but accepts `null` or `undefined` when no result exists
yet. An empty array means the request finished with no rows and never turns loading on.

| Rows                 | Loading | Display                                                     |
| -------------------- | ------- | ----------------------------------------------------------- |
| `null` / `undefined` | `true`  | Headers and pulsing skeleton rows, no spinner               |
| `null` / `undefined` | `false` | Headers and a blank body, for your own error or instruction |
| Any array            | `true`  | Current rows under an overlay with a spinner                |
| `[]`                 | `false` | `emptyContent`, defaulting to "No rows"                     |
| Populated array      | `false` | Normal grid                                                 |

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

Passing `null` during a refresh shows the skeleton instead of the current rows. The grid also draws
static skeleton cells for rows that virtualization hasn't rendered yet, regardless of `loading`.

## Custom indicators

`loadingIndicator` replaces the spinner, and `emptyContent` replaces the empty-result content. Pass
`null` to hide either one. The grid still positions the overlay and handles its behavior. Custom
indicators should not be interactive, and they don't replace `loadingLabel`, which sets the screen
reader announcement. The default spinner rotates even when the user prefers reduced motion. Custom
indicators handle their own animation.

The [styling contract](./STYLING.md) lists the loading and empty-result tokens and parts.

## Interaction while loading

While `loading` is true, the grid ignores pointer and keyboard input inside itself, including custom
cell and header controls and the editor portal. Controls outside the grid still work. When loading
starts:

- An in-progress resize or reorder is cancelled without committing.
- A range selection stops at its current extent.
- Pending saves finish normally.
- An open editor pauses with its draft intact and resumes on the same row ID afterwards.

If the edited row or column disappears in the refresh, a notice keeps the draft until the target
returns or the user discards it. After a refresh, the grid restores focus unless the user moved it to
another control. A click outside the grid before loading starts can still commit an edit.

## Test coverage

The [packed-consumer example](../fixtures/shared/Example.tsx) has an initial-loading grid, a
refresh toggle, and an empty-results button. The [consumer checks](./PACKAGE_VERIFICATION.md) run
those scenarios. The checks don't cover custom indicators or a delayed refresh during editing, and
the dev app has no controls for them. Loading states haven't been tested on physical mobile devices
or with assistive technology.
