# Loading and empty results

The application owns fetching. Pass `loading` explicitly and retain previous rows during refresh.

| Rows                  | Loading | Display                                              |
| --------------------- | ------- | ---------------------------------------------------- |
| `null` or `undefined` | true    | Initial skeletons                                    |
| `null` or `undefined` | false   | Blank body; application supplies instructions/errors |
| Any array             | true    | Retained result with a refresh overlay               |
| `[]`                  | false   | Empty content (default: “No rows”)                   |
| Populated array       | false   | Interactive grid                                     |

```tsx
<DataGrid
  rows={data}
  loading={isFetching}
  columns={columns}
  getRowId={(row) => row.id}
  loadingLabel="Updating people"
  emptyContent={<span>No matching people</span>}
/>
```

`loadingIndicator` replaces the refresh indicator; `loadingLabel` supplies its accessible name.
Keep custom indicators noninteractive. Loading pauses editing and pointer gestures without discarding
drafts. Pending commits may settle. The grid never fetches data or infers loading from an empty array.

The [packed-consumer example](../fixtures/shared/Example.tsx) includes an initial-loading grid, a
refresh toggle and an empty-results button. Run the [consumer checks](./PACKAGE_VERIFICATION.md)
for those scenarios. Custom indicators and delayed background refresh while editing need additional
consumer setup; they are not controls in the basic local app. Physical mobile and
assistive-technology verification remain outstanding.
