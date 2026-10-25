// Canonical public grid contract.

import type { CSSProperties, ReactNode } from "react";
import type { Column } from "./column";
import type { CellCommit, CellCommitFailure } from "./editing";
import type { ColumnId, RowId } from "./ids";
import type { GridSelection } from "./selection";

/** Result of `focusCell`. `ok: true` doesn't mean the cell has rendered yet */
export type FocusCellResult =
  | { ok: true }
  | {
      ok: false;
      reason: "row-not-found" | "column-not-found" | "not-selectable" | "busy";
    };

/** Grid commands, accessed through a ref */
export interface DataGridHandle {
  /** Focus a cell and scroll it into view. Changes nothing on failure */
  focusCell: (target: { rowId: RowId; columnId: ColumnId }) => FocusCellResult;
}

/** Props passed to `renderSelectionCheckbox` */
export type SelectionCheckboxProps = {
  /** Whether the row is selected, or every row for the header */
  checked: boolean;
  /** Whether some but not all rows are selected. Header only */
  indeterminate: boolean;
  /** Whether the control is disabled, such as while loading */
  disabled: boolean;
  /** Whether selection is controlled without a change callback */
  readOnly: boolean;
  "aria-label": string;
  /** Toggle the selection. Takes no arguments */
  onChange: () => void;
} & (
  | { kind: "all" }
  | {
      kind: "row";
      rowId: RowId;
      /** Index in the current `rows` */
      rowIndex: number;
    }
);

export interface DataGridProps<T> {
  /** Row data, never mutated by the grid. `null` or `undefined` means no result yet */
  rows: readonly T[] | null | undefined;
  /** Whether rows are loading. Keep passing the previous rows during a refresh */
  loading?: boolean;
  /** Indicator shown while refreshing. The first load always shows skeletons */
  loadingIndicator?: ReactNode;
  /**
   * Screen reader text while loading
   * @defaultValue "Loading data"
   */
  loadingLabel?: string;
  /**
   * Content shown when `rows` is empty. `null` hides it
   * @defaultValue "No rows"
   */
  emptyContent?: ReactNode;
  /** Columns of the grid */
  columns: readonly Column<T>[];
  /** Returns the row's unique, stable key */
  getRowId: (row: T, index: number) => RowId;

  /**
   * Height of every row and the header, in px
   * @defaultValue 32
   */
  rowHeight?: number;
  /**
   * Rows rendered outside the viewport, per side
   * @defaultValue 6
   */
  overscanRows?: number;
  /**
   * Center columns rendered outside the viewport, per side
   * @defaultValue 2
   */
  overscanColumns?: number;

  /**
   * Whether to show row selection checkboxes
   * @defaultValue false
   */
  enableRowSelection?: boolean;
  /** Custom row and select-all checkbox */
  renderSelectionCheckbox?: (props: SelectionCheckboxProps) => ReactNode;
  /** Selected row ids (controlled). Read-only without `onSelectedRowIdsChange` */
  selectedRowIds?: ReadonlySet<RowId>;
  /** Initially selected row ids */
  defaultSelectedRowIds?: ReadonlySet<RowId>;
  /** Called when the user changes the row selection */
  onSelectedRowIdsChange?: (rowIds: ReadonlySet<RowId>) => void;
  /** Called when focus, the range, or the row selection changes */
  onSelectionChange?: (next: GridSelection) => void;

  /**
   * Whether columns can be reordered by dragging
   * @defaultValue true
   */
  reorderable?: boolean;
  /** Column order by id (controlled). Read-only without `onColumnOrderChange` */
  columnOrder?: readonly ColumnId[];
  /** Initial column order */
  defaultColumnOrder?: readonly ColumnId[];
  /** Called when the user reorders columns */
  onColumnOrderChange?: (order: readonly ColumnId[]) => void;

  /**
   * Whether columns can be resized
   * @defaultValue true
   */
  resizable?: boolean;
  /** Column widths in px by id (controlled). Read-only without `onColumnWidthsChange` */
  columnWidths?: Readonly<Record<ColumnId, number>>;
  /** Initial column widths in px by id */
  defaultColumnWidths?: Readonly<Record<ColumnId, number>>;
  /** Called when the user resizes a column */
  onColumnWidthsChange?: (widths: Readonly<Record<ColumnId, number>>) => void;

  /** Called to save an edited cell. Write `nextValue` into `rows` */
  onCellCommit?: (update: CellCommit<T>) => Promise<void> | void;
  /** Called when a save throws or rejects */
  onCellCommitError?: (failure: CellCommitFailure<T>) => void;

  /** Id of the root element */
  id?: string;
  /** Class of the root element */
  className?: string;
  /** Style of the root element */
  style?: CSSProperties;
  /**
   * Accessible name of the grid
   * @defaultValue "Data grid"
   */
  "aria-label"?: string;
  /** Id of the element that labels the grid */
  "aria-labelledby"?: string;
}
