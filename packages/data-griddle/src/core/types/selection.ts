// Cell focus, range selection, and checkbox row selection are independent.

import type { CellCoord, RowId } from "./ids";

/** Rectangular cell range */
export interface CellRange {
  /** Corner where the range started */
  anchor: CellCoord;
  /** Moving corner, same as the focused cell */
  focus: CellCoord;
}

/** Selection passed to `onSelectionChange`. Don't mutate it */
export interface GridSelection {
  /** Focused cell */
  focusedCell: CellCoord | null;
  /** Selected range */
  range: CellRange | null;
  /** Checked row ids */
  selectedRows: Set<RowId>;
}

export const EMPTY_SELECTION: GridSelection = {
  focusedCell: null,
  range: null,
  selectedRows: new Set(),
};
