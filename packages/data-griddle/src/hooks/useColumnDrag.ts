import { useEffect, useRef } from "react";

import {
  dragBounds,
  dropIndexAtX,
  reorderWithinZone,
} from "../core/selection/geometry";
import { gridCellId } from "../internal/accessibility";
import { edgeScrollDelta } from "../internal/auto-scroll";
import { resolveColumnCapabilities } from "../internal/column-capabilities";
import { createColumnDragGhost } from "../internal/column-drag-ghost";
import { DRAG_THRESHOLD } from "../internal/constants";
import { useIsomorphicLayoutEffect as useLayoutEffect } from "../internal/use-isomorphic-layout-effect";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { Zone } from "../core/selection/geometry";
import type { DragStore } from "../core/store/drag-store";
import type { ColumnId } from "../core/types";
import type { ColumnDragGhost } from "../internal/column-drag-ghost";
import type { GridGeometryHelpers } from "./useGridGeometryHelpers";
import type { GridLayout } from "./useGridLayout";

export interface ColumnDragHandlers {
  /** Returns true when the gesture consumed the event (a header-drag is in progress). */
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  onLostPointerCapture: () => void;
  /** Includes a claimed press before the visual gesture starts. */
  isActive: () => boolean;
}

// Handles within-zone column dragging. Store updates redraw only the indicator, and each handler
// reports whether it consumed the pointer event so gestures can be composed safely.
export function useColumnDrag<T>(args: {
  gridId: string;
  reorderable: boolean;
  dragStore: DragStore;
  scrollRef: RefObject<HTMLDivElement | null>;
  layout: GridLayout<T>;
  helpers: GridGeometryHelpers<T>;
  onColumnOrderChange: (order: readonly ColumnId[]) => void;
}): ColumnDragHandlers {
  const {
    gridId,
    reorderable,
    dragStore,
    scrollRef,
    layout,
    helpers,
    onColumnOrderChange,
  } = args;
  const { leftBand, right, columnOrder, placementMap } = layout;
  const { headerHitTest, zoneColsFor, layoutFor, zoneLocalXFor } = helpers;

  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const ghostRef = useRef<ColumnDragGhost | null>(null);
  const ghostSourceRef = useRef<{
    element: HTMLElement;
    label: string;
    x: number;
    y: number;
    touch: boolean;
  } | null>(null);
  const showGhost = () => {
    const source = ghostSourceRef.current;
    if (source && !ghostRef.current)
      ghostRef.current = createColumnDragGhost(
        source.element,
        source.label,
        source,
        source.touch
      );
  };
  const clearGhost = () => {
    ghostRef.current?.remove();
    ghostRef.current = null;
    ghostSourceRef.current = null;
  };
  // Column drag uses its own horizontal auto-scroll loop.
  const dragScrollRef = useRef<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPressRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
    active: boolean;
    moved: boolean;
  } | null>(null);
  const touchListenersRef = useRef<{
    target: EventTarget;
    move: (event: TouchEvent) => void;
    cancel: () => void;
  } | null>(null);
  // The header captured on pointerdown. Mouse movement crosses DRAG_THRESHOLD; touch waits for
  // a hold before showing the guide. `bounds` prevents crossing a reorder barrier.
  const dragSourceRef = useRef<{
    columnId: ColumnId;
    zone: Zone;
    sourceIndex: number;
    bounds: [number, number];
  } | null>(null);

  // Recompute the target after each center-zone scroll because the pointer maps to a new column.
  const dragScrollTick = () => {
    const src = dragSourceRef.current;
    const el = scrollRef.current;
    const pt = pointerRef.current;
    if (
      !src ||
      src.zone !== "center" ||
      !el ||
      !pt ||
      dragStore.getSnapshot().status !== "dragging"
    ) {
      dragScrollRef.current = null;
      return;
    }
    // Frozen zones are fully rendered and never need horizontal auto-scroll.
    const { dx } = edgeScrollDelta(pt, el, {
      left: leftBand,
      right: right.total,
    });
    if (dx) {
      el.scrollLeft += dx;
      const zl = layoutFor("center");
      const zoneX = zoneLocalXFor("center", pt.x);
      const { index, indicatorX } = dropIndexAtX(
        zl.offsets,
        zl.widths,
        zoneX,
        src.bounds
      );
      dragStore.updateTarget(index, indicatorX);
    }
    dragScrollRef.current = requestAnimationFrame(dragScrollTick);
  };

  const clearTouch = () => {
    if (holdTimerRef.current != null) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    touchPressRef.current = null;
    const listeners = touchListenersRef.current;
    if (listeners) {
      listeners.target.removeEventListener(
        "touchmove",
        listeners.move as EventListener
      );
      listeners.target.removeEventListener("touchcancel", listeners.cancel);
      touchListenersRef.current = null;
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>): boolean => {
    // Capture the source, but wait for the threshold before starting a drag.
    const header = reorderable ? headerHitTest(e.clientX, e.clientY) : null;
    if (!header) return false;
    // Barrier bounds remain constant because the source and zone cannot change during a drag.
    const zoneColumns = zoneColsFor(header.zone);
    const isBarrier = zoneColumns.map(
      (c) => resolveColumnCapabilities(c).reorderBarrier
    );
    const bounds = dragBounds(isBarrier, header.sourceIndex);
    dragSourceRef.current = { ...header, bounds };
    pointerRef.current = { x: e.clientX, y: e.clientY };
    const element = scrollRef.current?.ownerDocument.getElementById(
      gridCellId(gridId, null, header.columnId)
    );
    if (element)
      ghostSourceRef.current = {
        element,
        label: zoneColumns[header.sourceIndex].name,
        x: e.clientX,
        y: e.clientY,
        touch: e.pointerType === "touch",
      };
    if (e.pointerType === "touch") {
      const el = scrollRef.current;
      if (!el) return false;
      touchPressRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        active: false,
        moved: false,
      };
      // Keep listeners on the original target even when horizontal virtualization removes it.
      const target = e.target;
      const move = (event: TouchEvent) => touchHandlersRef.current.move(event);
      const cancel = () => touchHandlersRef.current.cancel();
      target.addEventListener("touchmove", move as EventListener, {
        passive: false,
      });
      target.addEventListener("touchcancel", cancel);
      touchListenersRef.current = { target, move, cancel };
      el.setPointerCapture(e.pointerId);
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        touchHandlersRef.current.activate();
      }, 500);
      return true;
    }
    // While the pointer is captured the cursor follows the CAPTURE TARGET (this container), not the
    // header under it — so the header's `grab` would vanish. Force `grabbing` on the container for
    // the gesture; reset on pointerup. One write covers the whole drag (capture redirects it).
    if (scrollRef.current) scrollRef.current.style.cursor = "grabbing";
    scrollRef.current?.setPointerCapture(e.pointerId);
    return true;
  };

  const updateTarget = (x: number, y: number) => {
    const src = dragSourceRef.current;
    if (!src) return;
    const dragging = dragStore.getSnapshot().status === "dragging";
    // Past the threshold: track the LIVE pointer so the auto-scroll tick reads the current edge.
    pointerRef.current = { x, y };
    showGhost();
    ghostRef.current?.move(x, y);
    const zl = layoutFor(src.zone);
    const zoneX = zoneLocalXFor(src.zone, x);
    const { index, indicatorX } = dropIndexAtX(
      zl.offsets,
      zl.widths,
      zoneX,
      src.bounds
    );
    if (dragging) dragStore.updateTarget(index, indicatorX);
    else {
      dragStore.start({
        sourceColumnId: src.columnId,
        sourceZone: src.zone,
        sourceIndex: src.sourceIndex,
        targetIndex: index,
        indicatorX,
      });
    }
    // Only center columns can reach off-screen targets. Touch activation alone never scrolls.
    if (src.zone === "center" && dragScrollRef.current == null)
      dragScrollRef.current = requestAnimationFrame(dragScrollTick);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): boolean => {
    if (!dragSourceRef.current) return false;
    const press = touchPressRef.current;
    if (press) {
      if (
        !press.active &&
        Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8
      )
        onLostPointerCapture();
      return true; // Native non-passive touchmove owns movement after a hold.
    }
    const origin = pointerRef.current?.x ?? e.clientX;
    if (
      dragStore.getSnapshot().status !== "dragging" &&
      Math.abs(e.clientX - origin) < DRAG_THRESHOLD
    )
      return true;
    updateTarget(e.clientX, e.clientY);
    return true;
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>): boolean => {
    // On drop, emit the new order within the source zone. A short press stays idle; a stationary
    // touch hold previews its source position and therefore does not reorder.
    const src = dragSourceRef.current;
    if (!src) return false;
    const press = touchPressRef.current;
    if (
      press?.active &&
      (press.moved ||
        Math.hypot(e.clientX - press.x, e.clientY - press.y) >= DRAG_THRESHOLD)
    )
      updateTarget(e.clientX, e.clientY);
    clearTouch();
    clearGhost();
    dragSourceRef.current = null;
    if (dragScrollRef.current != null) {
      cancelAnimationFrame(dragScrollRef.current);
      dragScrollRef.current = null;
    }
    scrollRef.current?.releasePointerCapture(e.pointerId);
    if (scrollRef.current) scrollRef.current.style.cursor = ""; // restore hover grab
    const snap = dragStore.getSnapshot();
    if (snap.status === "dragging") {
      const next = reorderWithinZone(
        columnOrder,
        snap.sourceColumnId,
        snap.targetIndex,
        (id) => placementMap.get(id)?.zone
      );
      dragStore.end();
      if (next !== columnOrder) onColumnOrderChange(next); // same ref ⇒ drop onto self ⇒ no-op
    }
    return true;
  };

  // Safety net: if pointer capture is lost WITHOUT a pointerup — e.g. a pointercancel, or the OS
  // stealing the pointer — make sure the imperative `grabbing` cursor and the drag state don't get
  // stuck. Idempotent on the normal release path (state already cleared).
  const onLostPointerCapture = () => {
    clearTouch();
    clearGhost();
    if (scrollRef.current) scrollRef.current.style.cursor = "";
    if (dragScrollRef.current != null) {
      cancelAnimationFrame(dragScrollRef.current);
      dragScrollRef.current = null;
    }
    if (dragSourceRef.current) {
      dragSourceRef.current = null;
      dragStore.end();
    }
  };

  const activateTouch = () => {
    const press = touchPressRef.current;
    const src = dragSourceRef.current;
    const el = scrollRef.current;
    if (!press || !src || !el) return;
    if (
      el.scrollLeft !== press.scrollLeft ||
      el.scrollTop !== press.scrollTop
    ) {
      onLostPointerCapture();
      return;
    }
    press.active = true;
    showGhost();
    el.style.cursor = "grabbing";
    dragStore.start({
      sourceColumnId: src.columnId,
      sourceZone: src.zone,
      sourceIndex: src.sourceIndex,
      targetIndex: src.sourceIndex,
      indicatorX: layoutFor(src.zone).offsets[src.sourceIndex],
    });
  };

  const onTouchMove = (event: TouchEvent) => {
    const press = touchPressRef.current;
    if (!press) return;
    if (event.touches.length !== 1) {
      onLostPointerCapture();
      return;
    }
    const touch = event.touches[0];
    const distance = Math.hypot(
      touch.clientX - press.x,
      touch.clientY - press.y
    );
    if (!press.active) {
      if (distance > 8) onLostPointerCapture();
      return; // An early swipe keeps native panning/pinching.
    }
    if (!event.cancelable) {
      onLostPointerCapture();
      return;
    }
    event.preventDefault();
    ghostRef.current?.move(touch.clientX, touch.clientY);
    if (distance >= DRAG_THRESHOLD) press.moved = true;
    if (press.moved) updateTarget(touch.clientX, touch.clientY);
  };

  const touchHandlersRef = useRef({
    move: onTouchMove,
    activate: activateTouch,
    cancel: onLostPointerCapture,
  });
  useLayoutEffect(() => {
    touchHandlersRef.current = {
      move: onTouchMove,
      activate: activateTouch,
      cancel: onLostPointerCapture,
    };
  });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cancel = () => touchHandlersRef.current.cancel();
    const scroll = (event: Event) => {
      const press = touchPressRef.current;
      if (
        press &&
        (!press.active ||
          event.target !== el ||
          el.scrollTop !== press.scrollTop)
      )
        cancel();
    };
    const contextMenu = (event: Event) => {
      if (touchPressRef.current) event.preventDefault();
    };
    document.addEventListener("scroll", scroll, true);
    el.addEventListener("contextmenu", contextMenu);
    return () => {
      cancel();
      document.removeEventListener("scroll", scroll, true);
      el.removeEventListener("contextmenu", contextMenu);
    };
  }, [scrollRef]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onLostPointerCapture,
    isActive: () => Boolean(dragSourceRef.current),
  };
}
