// Editor state machine. Parent rows remain authoritative; the grid keeps only transient edit state.

import type { CellCoord, ColumnId, RowId } from "./ids";

/** Editor state. `submitting` while a save is pending, `error` after validation fails */
export type EditStatus = "editing" | "submitting" | "error";

export type EditState =
  | { status: "idle" }
  | ({ cell: CellCoord; draft: unknown; rowId?: RowId } & (
      | { status: "editing" }
      | { status: "submitting" }
      | { status: "error"; error: unknown }
    ));

/** Edit passed to `onCommit` and `onCellCommit` */
export interface CellCommit<T> {
  rowId: RowId;
  /** Current row */
  row: T;
  columnId: ColumnId;
  /** Value before the edit */
  previousValue: unknown;
  /** Parsed, validated value to save */
  nextValue: unknown;
}

/** Failed save passed to `onCellCommitError` */
export interface CellCommitFailure<T> {
  /** The failed edit */
  update: CellCommit<T>;
  /** Thrown or rejected value */
  error: unknown;
}
