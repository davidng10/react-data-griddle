import { memo, useSyncExternalStore } from "react";

import type { Zone } from "../core/selection/geometry";
import type { DragStore } from "../core/store/drag-store";

// Draws the drop indicator in the source zone's header coordinate space.
export const DragOverlay = memo(function DragOverlay(props: {
  zone: Zone;
  dragStore: DragStore;
  rowHeight: number;
  total: number;
}) {
  const { zone, dragStore, rowHeight, total } = props;
  const drag = useSyncExternalStore(
    dragStore.subscribe,
    dragStore.getSnapshot,
    dragStore.getSnapshot
  );
  if (drag.status !== "dragging" || drag.sourceZone !== zone) return null;
  // Frozen neighbors paint above this zone and their dividers extend one pixel into it.
  // Keep the full two-pixel guide inside either edge, clear of that divider and scroller clipping.
  const indicatorX = Math.max(1, Math.min(total - 3, drag.indicatorX - 1));
  return (
    <div className="dgr-overlay">
      <div
        className="dgr-reorder-indicator"
        style={{
          height: rowHeight,
          transform: `translateX(${indicatorX}px)`,
        }}
      />
    </div>
  );
});
