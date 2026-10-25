// Column schema and rendering contract. React imports are type-only.

import type { ReactNode } from "react";
import type { CellCommit, EditStatus } from "./editing";
import type { ColumnId, RowId } from "./ids";

/**
 * Built-in cell behavior. `action` cells handle their own clicks and can't be selected or
 * edited
 */
export type CellType = "text" | "select" | "action";

/** Edge a frozen column is pinned to */
export type FrozenZone = "left" | "right";

/** Option of a `select` column */
export interface SelectOption {
  /** Text shown for the option */
  label: string;
  /** Value written to the draft */
  value: string;
}

/** Context passed to `renderCell`, `cellClassName`, and `editable` */
export interface CellRenderContext<T> {
  row: T;
  rowId: RowId;
  /** Current row index. Changes when rows move */
  rowIndex: number;
  column: Column<T>;
  columnId: ColumnId;
  /** Result of `column.accessor(row)` */
  value: unknown;
  /** Cell width in px */
  width: number;
  /** Cell height in px */
  height: number;
}

/** Context passed to `renderHeader` and `headerClassName` */
export interface HeaderRenderContext<T> {
  column: Column<T>;
  columnId: ColumnId;
  /** Position in visual order */
  columnIndex: number;
  frozen?: FrozenZone;
  /** Column width in px */
  width: number;
  /** Whether the column can be resized */
  resizable: boolean;
  /** Whether the column can be reordered */
  reorderable: boolean;
}

/** Context passed to `renderEditor`, `parseValue`, and `validate` */
export interface CellEditContext<T> extends CellRenderContext<T> {
  /** Current editor value */
  draft: unknown;
  /** Update the draft */
  setDraft: (next: unknown) => void;
  /** Validate and save the draft */
  commit: () => void;
  /** Discard the draft */
  cancel: () => void;
  status: EditStatus;
  /** Message from `validate` */
  error?: unknown;
  /** Cell width in px */
  width: number;
  /** Cell height in px */
  height: number;
}

/** Column definition */
export interface Column<T> {
  /** Unique, stable column key */
  id: ColumnId;
  /** Header text and accessible name */
  name: string;

  /** Reads the cell value from a row */
  accessor: (row: T) => unknown;

  /** Width in px. Columns without one get 140px, and the last fills the remaining space */
  width?: number;
  /**
   * Minimum width in px
   * @defaultValue 48
   */
  minWidth?: number;
  /** Maximum width in px */
  maxWidth?: number;
  /**
   * Whether the column can be resized
   * @defaultValue true
   */
  resizable?: boolean;
  /**
   * Whether the column can be reordered by dragging
   * @defaultValue true
   */
  reorderable?: boolean;
  /** Whether to stop other columns moving past this one */
  reorderBarrier?: boolean;
  /** Pin the column to the left or right edge */
  frozen?: FrozenZone;

  // Type and editing
  /**
   * Built-in cell behavior
   * @defaultValue "text"
   */
  type?: CellType;
  /** Options of a `select` column */
  options?: SelectOption[];
  /**
   * Whether cells can be selected
   * @defaultValue true
   */
  selectable?: boolean;
  /**
   * Whether cells can be edited, for every cell or per cell
   * @defaultValue false
   */
  editable?: boolean | ((ctx: CellRenderContext<T>) => boolean);
  /** Converts the draft before validation, such as a string to a number. Must not throw */
  parseValue?: (next: unknown, ctx: CellEditContext<T>) => unknown;
  /** Validates the new value. Return a message to reject it */
  validate?: (
    value: unknown,
    ctx: CellEditContext<T>
  ) => string | null | undefined;
  /** Called to save an edit in this column. Overrides `onCellCommit` */
  onCommit?: (update: CellCommit<T>) => Promise<void> | void;

  /** Cell class. Must not change the cell's size */
  cellClassName?: string | ((ctx: CellRenderContext<T>) => string | undefined);
  /** Header class. Must not change the header's size */
  headerClassName?:
    string | ((ctx: HeaderRenderContext<T>) => string | undefined);

  // Render hooks. Defaults coerce values to strings; applications own truncation styling.
  /** Custom cell content */
  renderCell?: (ctx: CellRenderContext<T>) => ReactNode;
  /** Custom header content */
  renderHeader?: (ctx: HeaderRenderContext<T>) => ReactNode;
  /** Custom editor content */
  renderEditor?: (ctx: CellEditContext<T>) => ReactNode;
}
