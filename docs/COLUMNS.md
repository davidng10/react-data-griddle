# Column widths and frozen columns

For controlled, uncontrolled, and read-only column state, see the
[integration guide](./INTEGRATION.md#state-ownership-and-defaults).

## Width and fill

The grid keeps explicit column widths even when they leave unused space. The last column in visual
order with no `width` and no width override fills the remaining viewport width. Earlier columns
without a width get the 140px default.

The fill width is what's left after the checkbox gutter and every other column, frozen ones
included. It stays within `minWidth` (default 48px) and `maxWidth`. If there isn't enough room the
grid scrolls horizontally, and a `maxWidth` can leave a gap.

## Resizing

Resizing an automatic column by hand gives it an explicit width for the session, and the last
remaining column without a width takes over filling the space. Values in `columnWidths` and
`defaultColumnWidths` also count as explicit widths. Removing a controlled width makes the column
automatic again if its definition has no `width`. Fill resizing caused by the container does not
call `onColumnWidthsChange`.

## Action columns

`type: 'action'` columns are never selectable, editable, resizable, or reorderable, and always act as
a reorder barrier. Setting those props on an action column has no effect.

## Frozen columns

The grid always renders frozen columns and does not virtualize them horizontally, so keep few frozen
columns on each side in large grids. It doesn't unpin frozen columns on narrow screens, so your
application has to adjust frozen widths and columns itself.
