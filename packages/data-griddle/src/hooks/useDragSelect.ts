import { useEffect, useRef } from "react";

import { edgeScrollDelta } from "../internal/auto-scroll";
import { useIsomorphicLayoutEffect as useLayoutEffect } from "../internal/use-isomorphic-layout-effect";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { GridStore } from "../core/store/grid-store";
import type { CellCoord } from "../core/types";
import type { GridGeometryHelpers } from "./useGridGeometryHelpers";
import type { GridLayout } from "./useGridLayout";

export interface DragSelectHandlers {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onLostPointerCapture: () => void;
  /** Includes a claimed press before the visual gesture starts. */
  isActive: () => boolean;
}

// Handles cell focus, drag selection, edge auto-scroll, and click-to-edit. Updates go through the
// selection store so pointer movement does not re-render cells.
export function useDragSelect<T>(args: {
  store: GridStore;
  scrollRef: RefObject<HTMLDivElement | null>;
  layout: GridLayout<T>;
  rowHeight: number;
  helpers: GridGeometryHelpers<T>;
  beginEdit: (cell: CellCoord, initialDraft?: unknown) => boolean;
}): DragSelectHandlers {
  const { store, scrollRef, layout, rowHeight, helpers, beginEdit } = args;
  const { leftBand, right } = layout;
  const { hitTest } = helpers;

  const tapRef = useRef<{
    x: number;
    y: number;
    scrollTop: number;
    scrollLeft: number;
    cell: CellCoord;
  } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchRangeRef = useRef(false);
  const touchListenersRef = useRef<{
    target: EventTarget;
    move: (event: TouchEvent) => void;
    cancel: () => void;
  } | null>(null);
  const draggingRef = useRef(false);
  const lastHitRef = useRef<CellCoord | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  // Open an already-focused cell only if the pointer never crosses into another cell.
  const pendingEditRef = useRef<CellCoord | null>(null);
  const movedRef = useRef(false);

  const extendDrag = (cell: CellCoord | null) => {
    if (!cell) return;
    const last = lastHitRef.current;
    if (
      last &&
      last.rowIndex === cell.rowIndex &&
      last.columnId === cell.columnId
    ) {
      return; // same cell — skip the redundant store update
    }
    lastHitRef.current = cell;
    movedRef.current = true; // crossed into another cell → this is a drag-select, not a click
    store.extendTo(cell);
  };

  // Start edge auto-scroll only after crossing a cell. Without this guard, a stationary click in a
  // frozen band would be mistaken for a pointer beyond the scrolling region.
  const autoScrollTick = () => {
    if (!draggingRef.current) {
      autoScrollRef.current = null;
      return;
    }
    const el = scrollRef.current;
    const pt = pointerRef.current;
    if (el && pt && movedRef.current) {
      const { dx, dy } = edgeScrollDelta(pt, el, {
        top: rowHeight,
        left: leftBand,
        right: right.total,
      });
      if (dy) el.scrollTop += dy;
      if (dx) el.scrollLeft += dx;
      if (dx || dy) extendDrag(hitTest(pt.x, pt.y, true));
    }
    autoScrollRef.current = requestAnimationFrame(autoScrollTick);
  };

  const detachTouchListeners = () => {
    const listeners = touchListenersRef.current;
    if (!listeners) return;
    listeners.target.removeEventListener(
      "touchmove",
      listeners.move as EventListener
    );
    listeners.target.removeEventListener("touchcancel", listeners.cancel);
    touchListenersRef.current = null;
  };

  const clearTap = () => {
    detachTouchListeners();
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    tapRef.current = null;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const cell = hitTest(e.clientX, e.clientY);
    if (!cell) return; // header / gutter / outside — let native handlers (e.g. checkboxes) run
    if (e.pointerType === "touch") {
      // Touch events retain their original target even if virtualization removes it. Keep
      // listeners on that target until release; stable grid capture owns pointerup/cancel.
      const target = e.target;
      const move = (event: TouchEvent) =>
        touchHandlersRef.current.onTouchMove(event);
      const cancel = () => touchHandlersRef.current.cancel();
      target.addEventListener("touchmove", move as EventListener, {
        passive: false,
      });
      target.addEventListener("touchcancel", cancel);
      touchListenersRef.current = { target, move, cancel };
      scrollRef.current?.setPointerCapture(e.pointerId);
      tapRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollTop: scrollRef.current?.scrollTop ?? 0,
        scrollLeft: scrollRef.current?.scrollLeft ?? 0,
        cell,
      };
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        const tap = tapRef.current;
        const el = scrollRef.current;
        if (!tap || !el) return;
        if (
          el.scrollTop !== tap.scrollTop ||
          el.scrollLeft !== tap.scrollLeft
        ) {
          clearTap();
          return;
        }
        tapRef.current = null;
        touchRangeRef.current = true;
        draggingRef.current = true;
        movedRef.current = false;
        pendingEditRef.current = null;
        lastHitRef.current = tap.cell;
        pointerRef.current = { x: tap.x, y: tap.y };
        store.focusCell(tap.cell);
        store.extendTo(tap.cell); // Show a one-cell range as the hold activation cue.
        el.focus({ preventScroll: true });
        autoScrollRef.current = requestAnimationFrame(autoScrollTick);
      }, 500);
      return;
    }
    // Was this exact cell already the (single) focus before this press? If so, a plain click on it
    // should open the editor (resolved on pointer-up, if the pointer didn't drag).
    const prev = store.getSnapshot();
    const alreadyFocused =
      !e.shiftKey &&
      prev.range == null &&
      prev.focusedCell != null &&
      prev.focusedCell.rowIndex === cell.rowIndex &&
      prev.focusedCell.columnId === cell.columnId;
    scrollRef.current?.focus({ preventScroll: true });
    pendingEditRef.current = alreadyFocused ? cell : null;
    movedRef.current = false;
    if (e.shiftKey) store.extendTo(cell);
    else store.focusCell(cell);
    draggingRef.current = true;
    lastHitRef.current = cell;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    scrollRef.current?.setPointerCapture(e.pointerId);
    if (autoScrollRef.current == null) {
      autoScrollRef.current = requestAnimationFrame(autoScrollTick);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (
      tapRef.current &&
      Math.hypot(e.clientX - tapRef.current.x, e.clientY - tapRef.current.y) > 8
    )
      clearTap();
    // Touch movement is consumed by the non-passive native listener below, after it has
    // prevented browser scrolling. Pointer cancellation still uses the shell's cleanup path.
    if (e.pointerType === "touch" || !draggingRef.current) return;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    extendDrag(hitTest(e.clientX, e.clientY, true));
  };

  // End the drag and its auto-scroll loop. Shared by a clean pointer-up and an interrupted
  // lost-pointer-capture so the gesture can never be left "live".
  const stopDrag = () => {
    detachTouchListeners();
    draggingRef.current = false;
    touchRangeRef.current = false;
    if (autoScrollRef.current != null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const tap = tapRef.current;
    clearTap();
    if (
      tap &&
      Math.hypot(e.clientX - tap.x, e.clientY - tap.y) <= 8 &&
      tap.scrollTop === scrollRef.current?.scrollTop &&
      tap.scrollLeft === scrollRef.current?.scrollLeft
    ) {
      store.focusCell(tap.cell);
      scrollRef.current?.focus({ preventScroll: true });
    }
    stopDrag();
    if (scrollRef.current?.hasPointerCapture(e.pointerId))
      scrollRef.current.releasePointerCapture(e.pointerId);
    // A click (no drag) on the already-focused cell enters edit mode.
    const editCell = pendingEditRef.current;
    pendingEditRef.current = null;
    const releasedCell = hitTest(e.clientX, e.clientY);
    if (
      editCell &&
      !movedRef.current &&
      releasedCell?.rowIndex === editCell.rowIndex &&
      releasedCell.columnId === editCell.columnId
    )
      beginEdit(editCell);
  };

  // Pointer capture was lost WITHOUT a pointer-up — touch `pointercancel`, the captured node
  // re-rendering out, or another gesture stealing capture. Without this the drag would never
  // end: `draggingRef` stays true, so the auto-scroll RAF keeps rescheduling (scrolling every
  // frame if the pointer sat in an edge band) and `onPointerMove` keeps extending the range on
  // plain hover. An interrupted gesture is an abort, so we drop the pending click-to-edit.
  const onLostPointerCapture = () => {
    stopDrag();
    clearTap();
    pendingEditRef.current = null;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      onLostPointerCapture();
      return;
    }
    const touch = event.touches[0];
    if (!touchRangeRef.current) {
      const tap = tapRef.current;
      if (tap && Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 8)
        clearTap();
      return; // A swipe before the hold stays native, including pinch/page scrolling.
    }
    if (!event.cancelable) {
      onLostPointerCapture(); // The browser already owns the gesture; never fight its scroll.
      return;
    }
    event.preventDefault();
    pointerRef.current = { x: touch.clientX, y: touch.clientY };
    extendDrag(hitTest(touch.clientX, touch.clientY, true));
  };

  // React's delegated touch listeners can be passive. Install a native listener on pointerdown
  // (before touchstart), so an activated hold can prevent the first scrolling move.
  // Changing touch-action after the timer fires cannot change an ongoing browser gesture.
  const touchHandlersRef = useRef({
    onTouchMove,
    cancel: onLostPointerCapture,
  });
  useLayoutEffect(() => {
    touchHandlersRef.current = { onTouchMove, cancel: onLostPointerCapture };
  });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cancel = () => touchHandlersRef.current.cancel();
    const scroll = (event: Event) => {
      // Grid scrolling during an active range is our edge auto-scroll. Any scrolling
      // before activation, or an ancestor moving under the finger, cancels the claim.
      if (tapRef.current || (touchRangeRef.current && event.target !== el))
        cancel();
    };
    const contextMenu = (event: Event) => {
      if (tapRef.current || touchRangeRef.current) event.preventDefault();
    };
    el.addEventListener("contextmenu", contextMenu);
    document.addEventListener("scroll", scroll, true);
    return () => {
      cancel();
      el.removeEventListener("contextmenu", contextMenu);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [scrollRef]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onLostPointerCapture,
    isActive: () => Boolean(draggingRef.current || tapRef.current),
  };
}
