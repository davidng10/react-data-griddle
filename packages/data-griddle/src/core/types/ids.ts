// Layout uses row indices; persistent state uses stable row and column ids.

/** Row key returned by `getRowId` */
export type RowId = string | number;
/** Column key, from `column.id` */
export type ColumnId = string;

/** Cell address by row index and column id */
export interface CellCoord {
  rowIndex: number;
  columnId: ColumnId;
}

/** Stable per-cell key for overlay/edit-status maps (keyed by RowId, survives reorder). */
export type CellKey = `${RowId}:${ColumnId}`;

export function cellKey(rowId: RowId, columnId: ColumnId): CellKey {
  return `${rowId}:${columnId}`;
}
