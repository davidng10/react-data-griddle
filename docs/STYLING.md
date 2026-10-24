# Styling Data Griddle

You style the grid with four things: the default CSS, `--dgr-*` variables, part and state
selectors, and column class callbacks. All of them may change before 1.0. Import
`data-griddle/styles.css` once in your application entry. It includes the grid and loading styles.
In Next.js, import it in the root layout (App Router) or `pages/_app.tsx` (Pages Router).

Set tokens through the grid's `className`, its inline `style`, or an ancestor. In TypeScript, cast
custom properties in `style` to `CSSProperties`. The defaults are fallbacks written where each
token is used, so tokens set on an ancestor still inherit. `id`, `className`, and `style` go on the
`.dgr-root` frame, which does not scroll. `[data-grid-scroller]` is the inner element that scrolls
and takes focus. The grid fills its parent, so give the parent a fixed height.

To round the outer frame, set `style={{ borderRadius: 8 }}` on `DataGrid`, or set
`--dgr-border-radius: 8px` in a theme. The default is 4px. The inner scroller clips its content to
the rounded corners, but the outer frame doesn't clip overflow. Editors mounted in `document.body`
sit outside the scroller and aren't clipped.

```css
.accounts {
  --dgr-background: #111827;
  --dgr-text-color: #f3f4f6;
  --dgr-header-background: #1f2937;
  --dgr-cell-border-color: #374151;
  --dgr-header-border-color: #4b5563;
  --dgr-frozen-divider-color: #64748b;
  --dgr-focus-color: #93c5fd;
  --dgr-skeleton-bar-color: #374151;
  --dgr-empty-color: #d1d5db;
}
```

## Tokens and defaults

Each token takes the CSS value its property normally takes. When a token falls back to another
token, each element resolves that fallback on its own. Keep the body, header, skeleton backing, and
pending backgrounds opaque, or scrolled content shows through frozen columns. The grid doesn't check
contrast, so check your own color pairs.

| Token                              | Default                                                      | Purpose                                                         |
| ---------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `--dgr-background`                 | `#fff`                                                       | Frame, body, cells, pending values                              |
| `--dgr-border-radius`              | `4px`                                                        | Outer frame corner radius                                       |
| `--dgr-text-color`                 | `#1c1917`                                                    | Text; draft notice fallback is `#44403c`                        |
| `--dgr-font-family`                | `system-ui, sans-serif`                                      | Grid and editor typography                                      |
| `--dgr-font-size`                  | `13px`                                                       | Grid and editor type size                                       |
| `--dgr-cell-padding-inline`        | `10px`                                                       | Cell/header/pending horizontal padding                          |
| `--dgr-cell-border-color`          | `#f0efee`                                                    | Body cell/pending grid lines; discard-button fallback `#d6d3d1` |
| `--dgr-header-background`          | `#f5f5f4`                                                    | Headers and discard button                                      |
| `--dgr-header-font-weight`         | `600`                                                        | Column header weight                                            |
| `--dgr-header-border-color`        | `#e7e5e4`                                                    | Header/gutter right borders, pending spinner track              |
| `--dgr-frozen-divider-color`       | `#d6d3d1`                                                    | Frozen dividers, header-row bottom edge, draft notice border    |
| `--dgr-selection-background`       | `rgb(37 99 235 / 12%)`                                       | Range fill                                                      |
| `--dgr-selection-border-color`     | `#2563eb`                                                    | Range outline                                                   |
| `--dgr-focus-color`                | `#2563eb`                                                    | Focus ring and editor border                                    |
| `--dgr-resize-indicator-color`     | `#2563eb`                                                    | Resize guide                                                    |
| `--dgr-reorder-indicator-color`    | `#2563eb`                                                    | Column drop guide                                               |
| `--dgr-skeleton-background`        | `--dgr-background`, then `#fff`                              | Opaque skeleton backing                                         |
| `--dgr-skeleton-bar-color`         | `#f5f5f4`                                                    | Masked skeleton bars                                            |
| `--dgr-pending-color`              | Text `#78716c`; spinner arc `#2563eb`                        | Saving value and activity                                       |
| `--dgr-error-color`                | `#dc2626`; error-footer divider `#fecaca`                    | Editor/commit error border and text                             |
| `--dgr-error-background`           | Commit flash `rgb(220 38 38 / 10%)`; editor footer `#fef2f2` | Error fill                                                      |
| `--dgr-editor-background`          | `--dgr-background`, then `#fff`                              | Portal panel and native options                                 |
| `--dgr-editor-radius`              | `4px`                                                        | Panel corners                                                   |
| `--dgr-editor-shadow`              | `0 2px 12px rgb(0 0 0 / 12%)`                                | Panel shadow                                                    |
| `--dgr-editor-padding`             | Text `5px 9px`; select `4px 6px`                             | Built-in editor content padding                                 |
| `--dgr-loading-overlay-background` | `rgb(255 255 255 / 65%)`                                     | Retained-result refresh overlay                                 |
| `--dgr-loading-indicator-color`    | `#57534e`                                                    | Default refresh spinner                                         |
| `--dgr-empty-color`                | `#78716c`                                                    | Empty-result content                                            |

## Parts and states

The default selectors use only grid-owned classes and have low specificity. Resets on built-in
controls use a class selector, so they win over element selectors in your CSS. There is no global
reset. Scope custom read-mode styles under your own root class. The active editor is mounted in
`document.body`, outside that root, so style it with tokens or with `.dgr-editor-host`.

| Part or state                                                                            | Contract                                                   |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `.dgr-root[data-grid-frame]`                                                             | Stationary outer frame                                     |
| `[data-grid-scroller]`                                                                   | Native scroller; `aria-busy` tracks loading                |
| `.dgr-zone[data-zone="left\|center\|right"]`                                             | Column zone; match one value at a time                     |
| `.dgr-cell`, `.dgr-header-cell`                                                          | Rendered read-mode cell/header                             |
| `[data-frozen="left\|right"]`                                                            | Frozen cell/header; absent for center                      |
| `[data-resize-handle="left\|right"]`                                                     | Header hit-area affordance; geometry is grid-owned         |
| `.dgr-header-row`, `.dgr-body`                                                           | Zone header and opaque body surfaces                       |
| `.dgr-row-gutter`, `.dgr-gutter-header`, `.dgr-gutter-cell`, `.dgr-checkbox`             | Built-in row-selection parts                               |
| `.dgr-row-gutter[data-divider]`                                                          | Strong gutter divider when no left frozen zone supplies it |
| `.dgr-selection-range`, `.dgr-focus-ring`                                                | Store-driven selection/focus overlays                      |
| `.dgr-drag-ghost`                                                                        | Floating column-header preview (body-mounted)              |
| `.dgr-resize-indicator`, `.dgr-reorder-indicator`                                        | Gesture guides                                             |
| `.dgr-pending-cell`, `.dgr-pending-spinner`, `.dgr-pending-track`, `.dgr-pending-stroke` | Optimistic value and saving indicator                      |
| `.dgr-error-cell`                                                                        | Failed commit flash                                        |
| `.dgr-editor-host[data-editing]`, `.dgr-editor-host[data-invalid]`                       | Active portal and validation-error state                   |
| `.dgr-editor-input`, `.dgr-editor-error`                                                 | Built-in textarea/select and validation footer             |
| `.dgr-draft-notice`, `.dgr-draft-discard`                                                | Preserved draft with temporarily missing target            |
| `.dgr-skeleton`, `.dgr-skeleton-bars`                                                    | Opaque backing and constant-node tiled alpha mask          |
| `.dgr-loading-layer[data-grid-state="initial-loading"]`                                  | Initial skeleton presentation                              |
| `.dgr-loading-layer[data-grid-state="refreshing"]`                                       | Retained-result overlay                                    |
| `.dgr-loading-body`, `.dgr-loading-indicator`, `.dgr-loading-spinner`                    | Loading layout and default indicator                       |
| `.dgr-empty-content`, `.dgr-status-text`                                                 | Empty result and visually hidden accessible announcement   |

The drag ghost shows `column.name`. When the drag starts, it copies the source header's font
family, size, weight, and style, its text and background colors, and its text direction, and
nothing else. It is no wider than 240px or the visible viewport, and narrower headers keep their
own width. Long titles clip without an ellipsis, and the original column keeps its width and
header height. `.dgr-drag-ghost` sets the padding, opacity, shadow, and outline. The ghost is
mounted in `body`, so override these with a selector that isn't scoped to the grid. The ghost
doesn't show custom header components, controls, icons, or pseudo-element decorations.

Selection state is drawn by overlays, not set on each cell. Don't make `.dgr-status-text` visible,
and don't override the input blocking during loading. Skeleton bars pulse and the spinner rotates
even when the user prefers reduced motion. The skeleton cells shown while scrolling don't animate.

Resize handles set `touch-action: none` so touch drags resize instead of scrolling the header.
Their hit area is 5px wide, or 12px on coarse-pointer devices. Keep both if you restyle them.

Cells set `touch-action: manipulation` so a double tap opens the editor instead of zooming. If you
change this, keep native panning and pinch zoom working.

Built-in editor inputs use the grid's font on every device, with no minimum font size. They focus
with `preventScroll: true`, and the portal positions them in the viewport. Custom editors set their
own typography and focus behavior.

## Conditional classes

```tsx
const columns: Column<Entry>[] = [
  {
    id: "balance",
    name: "Balance",
    accessor: (row) => row.balance,
    cellClassName: (ctx) => (Number(ctx.value) < 0 ? "negative" : undefined),
    headerClassName: "numeric-heading",
  },
];
```

```ts
cellClassName?: string | ((ctx: CellRenderContext<T>) => string | undefined);
headerClassName?: string | ((ctx: HeaderRenderContext<T>) => string | undefined);
```

The cell context has `row`, `rowId`, `rowIndex`, `column`, `columnId`, `value`, `width`, and
`height`, and `renderCell` receives the same context and accessor result. The header context has
`column`, `columnId`, `columnIndex`, `frozen`, `width`, `resizable`, and `reorderable`.
The callbacks run during render, so keep them pure and cheap. They rerun when your data changes,
not when the selection changes. The returned class is added next to the grid's own part classes,
and `undefined` adds nothing.

Use these classes for text color, font weight, text decoration, and opaque cell backgrounds. Don't
override position, transforms, width or height, box sizing, scrolling, hit areas, or border width.
Some layout rules are in the grid's CSS and others are calculated inline, and neither kind is safe
to override. `dgr-scroller`, `dgr-content`, `dgr-overlay`, and `dgr-pending-value` are internal
classes, not styling hooks. Set density with `rowHeight` and horizontal size with column widths.
Larger fonts or padding don't make rows taller, so pick a `rowHeight` that fits your content.

## Content overflow

The grid sets cell sizes and clips content that overflows. Cells and headers show one line and
don't add an ellipsis. That applies to default values, pending values, and the drag ghost too. For
truncation, tooltips, or other layout, use `cellClassName`, `headerClassName`, `renderCell`, and
`renderHeader`.

To add an ellipsis to a plain value or heading, add a class:

```tsx
const columns: Column<Entry>[] = [
  {
    id: "name",
    name: "Name",
    accessor: (row) => row.name,
    cellClassName: "truncate",
    headerClassName: "truncate",
  },
];
```

```css
.truncate {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

For links or mixed content, truncate the element inside your custom renderer. For example, give a
link `display: block; max-width: 100%` plus the styles above. In a flex layout, give the label that
should shrink `min-width: 0` and leave room for buttons and icons. The grid doesn't add wrappers,
helper classes, or tooltips for truncation.

You can turn on wrapping with your own CSS, but rows don't grow, so the content has to fit
`rowHeight`. Size controls and columns to fit their content, including cell padding and borders.
Controls that inherit the cell font should set their own `line-height` instead of inheriting the
row's.

Column classes and custom renderers apply to normal cells and headers. They don't reach the
pending-value overlay or the drag ghost.

## Editor themes

The active editor is mounted in `document.body`. Its host copies every token in the table above
except `--dgr-border-radius`, as resolved on the grid frame that opened it, plus the computed font family, font size, text color,
and direction. Each grid keeps its own copy, so closing one grid's editor doesn't change another
grid's theme.

The grid recopies the theme when the editor mounts, when `class`, `style`, or `data-theme` changes
on the frame or an ancestor, when the viewport resizes, and when `prefers-color-scheme` changes. It
batches these into one animation frame and doesn't poll. Tokens you remove from the frame are
removed from the editor too. Built-in text editors remeasure after a theme or column-width change.
While loading hides the editor, the grid keeps the draft and stops watching the theme. When the
editor shows again, the grid recopies the theme and remeasures the built-in editor.

The grid doesn't notice stylesheet edits through the CSSOM, stylesheets finishing loading, changes
to other attributes, or DOM moves made outside React. If you change the theme while an editor is
open, use one of the triggers above. Selectors scoped to the grid root and custom properties other
than the documented tokens don't reach the editor, so use the tokens or put classes on your custom
editor content. The editor copies text direction for its own typography only. The grid layout
doesn't support RTL.

The grid draws the editor frame. `--dgr-editor-padding` applies to built-in controls only. Custom
editors handle their own padding, controls, focus, and contrast. Keep popups inside the editor host,
or clicking them counts as an outside click and commits the edit. Custom controls can use the
inherited tokens and `font: inherit`.

## Examples and selection controls

The [packed-consumer example](../fixtures/shared/Example.tsx) uses the default styles, a frozen
column, and a custom Status editor, without the dev app's CSS. See
[package verification](./PACKAGE_VERIFICATION.md). No example or test covers two grids with
different themes, density changes, or theme changes while an editor is open.

To replace the selection checkboxes, use `renderSelectionCheckbox`. See the
[integration guide](./INTEGRATION.md#replaceable-selection-checkboxes). `.dgr-checkbox` only styles
the default native checkbox. A replacement control draws its own visuals and focus indicator, and
the gutter keeps its size and selection behavior.
