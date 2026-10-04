import { memo } from "react";

import { classNames } from "../internal/class-names";

import type { ReactNode } from "react";
import type { FrozenZone } from "../core/types";

export const HeaderCell = memo(function HeaderCell(props: {
  id: string;
  columnIndex: number;
  className?: string;
  content: ReactNode;
  x: number;
  width: number;
  height: number;
  frozen?: FrozenZone;
  /** Show the column-drag affordance. */
  draggable?: boolean;
  /** Show the resize handle at the right edge. */
  resizable?: boolean;
  /** Continue the previous column's resize cursor into this cell's left edge. */
  resizeFromLeft?: boolean;
}) {
  const {
    content,
    x,
    width,
    height,
    frozen,
    draggable,
    resizable,
    resizeFromLeft,
  } = props;
  return (
    <div
      id={props.id}
      role="columnheader"
      aria-colindex={props.columnIndex}
      className={classNames("dgr-header-cell", props.className)}
      data-frozen={frozen}
      style={{
        width,
        height,
        lineHeight: `${height}px`,
        transform: `translateX(${x}px)`,
        cursor: draggable ? "grab" : undefined,
      }}
    >
      {content}
      {/* Handles reserve touch dragging before contact. The container keeps ownership
          with the column on the left and hit-tests using the rendered handle width. */}
      {resizeFromLeft && (
        <div
          data-resize-handle="left"
          onContextMenu={(event) => event.preventDefault()}
          style={{ height }}
        />
      )}
      {resizable && (
        <div
          data-resize-handle="right"
          onContextMenu={(event) => event.preventDefault()}
          style={{ height }}
        />
      )}
    </div>
  );
});
