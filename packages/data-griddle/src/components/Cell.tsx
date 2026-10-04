import { memo } from "react";

import { classNames } from "../internal/class-names";
import { resolveColumnCapabilities } from "../internal/column-capabilities";
import { readContent } from "../internal/read-content";

import type {
  CellRenderContext,
  Column,
  FrozenZone,
  RowId,
} from "../core/types";

// Keep consumer callbacks inside the memo boundary so unchanged rows/columns skip their work.
function CellInner<T>(props: {
  id: string;
  row: T;
  rowId: RowId;
  column: Column<T>;
  rowIndex: number;
  columnIndex: number;
  ariaColumnIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  frozen?: FrozenZone;
}) {
  const { row, rowId, column, rowIndex, x, y, width, height, frozen } = props;
  const context: CellRenderContext<T> = {
    row,
    rowId,
    rowIndex,
    column,
    columnId: column.id,
    value: column.accessor(row),
    width,
    height,
  };
  const editable = resolveColumnCapabilities(column).editable;
  const readOnly = !(typeof editable === "function"
    ? editable(context)
    : editable);
  const className =
    typeof column.cellClassName === "function"
      ? column.cellClassName(context)
      : column.cellClassName;
  return (
    <div
      id={props.id}
      role="gridcell"
      aria-colindex={props.ariaColumnIndex}
      aria-rowindex={props.rowIndex + 2}
      aria-readonly={readOnly}
      data-cell-row={props.rowIndex}
      data-cell-column={props.columnIndex}
      className={classNames("dgr-cell", className)}
      data-frozen={frozen}
      style={{
        width,
        height,
        lineHeight: `${height}px`,
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {readContent(context)}
    </div>
  );
}

export const Cell = memo(CellInner) as typeof CellInner;
