import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataGrid } from "../index";

import type { Column, DataGridProps } from "../index";

const rows = Array.from({ length: 100 }, (_, id) => ({
  id,
  value: `Row ${id}`,
}));
type Row = (typeof rows)[number];
const columns: Column<Row>[] = ["a", "b", "c"].map((id) => ({
  id,
  name: id.toUpperCase(),
  width: 100,
  accessor: (row) => row.value,
}));
const getRowId = (row: Row) => row.id;
function setup(extra: Partial<DataGridProps<Row>> = {}) {
  const onColumnOrderChange = vi.fn();
  const onColumnWidthsChange = vi.fn();
  const props = {
    rows,
    columns,
    getRowId,
    onColumnOrderChange,
    onColumnWidthsChange,
    ...extra,
  };
  const view = render(<DataGrid {...props} />);
  const grid = screen.getByRole("grid");
  return { ...view, props, grid, onColumnOrderChange, onColumnWidthsChange };
}
function pointer(
  target: HTMLElement,
  kind: "pointerDown" | "pointerMove" | "pointerUp",
  x = 40,
  y = 16,
  extra = {}
) {
  return fireEvent[kind](target, {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    ...extra,
  });
}
function advance(ms = 500) {
  act(() => vi.advanceTimersByTime(ms));
}
function hold(target: HTMLElement, x = 40) {
  pointer(target, "pointerDown", x);
  advance();
}
function move(target: HTMLElement, x: number, y = 16, cancelable = true) {
  pointer(target, "pointerMove", x, y);
  return fireEvent.touchMove(target, {
    cancelable,
    touches: [{ identifier: 0, clientX: x, clientY: y }],
  });
}
function guide(grid: HTMLElement) {
  return grid.querySelector(".dgr-reorder-indicator");
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("touch column reordering", () => {
  it("updates preview size limits only when viewport dimensions change", () => {
    const viewport = {
      width: 400,
      height: 300,
      offsetLeft: 0,
      offsetTop: 0,
    };
    vi.stubGlobal("visualViewport", viewport);
    const { grid } = setup();
    hold(grid);
    const ghost = document.querySelector<HTMLElement>(".dgr-drag-ghost")!;
    expect(ghost.style.maxWidth).toBe("392px");
    expect(ghost.style.maxHeight).toBe("292px");
    const widthWrites = vi.spyOn(ghost.style, "maxWidth", "set");
    const heightWrites = vi.spyOn(ghost.style, "maxHeight", "set");

    const before = ghost.style.transform;
    move(grid, 160, 120);
    move(grid, 170, 130);
    expect(ghost.style.transform).not.toBe(before);
    expect(widthWrites).not.toHaveBeenCalled();
    expect(heightWrites).not.toHaveBeenCalled();

    viewport.width = 300;
    move(grid, 180, 140);
    expect(ghost.style.maxWidth).toBe("292px");
    expect(widthWrites).toHaveBeenCalledTimes(1);
    expect(heightWrites).not.toHaveBeenCalled();

    viewport.height = 200;
    move(grid, 190, 150);
    expect(ghost.style.maxHeight).toBe("192px");
    expect(widthWrites).toHaveBeenCalledTimes(1);
    expect(heightWrites).toHaveBeenCalledTimes(1);
  });

  it("previews the column name without custom header controls and follows movement within one drop target", () => {
    const renderHeader = vi.fn(() => (
      <span style={{ color: "red" }}>
        <b id="custom-title">Custom A</b>
        <button>Action</button>
      </span>
    ));
    const { grid, onColumnOrderChange } = setup({
      columns: [{ ...columns[0], renderHeader }, ...columns.slice(1)],
    });
    const header = screen.getByRole("columnheader", {
      name: "Custom A Action",
    });
    Object.assign(header.style, {
      color: "rgb(20, 30, 40)",
      backgroundColor: "rgb(230, 240, 250)",
      fontFamily: "monospace",
      fontSize: "16px",
      fontWeight: "600",
    });
    header.getBoundingClientRect = () => ({
      x: 0,
      y: 100,
      left: 0,
      top: 100,
      right: 100,
      bottom: 132,
      width: 100,
      height: 32,
      toJSON() {},
    });
    const count = renderHeader.mock.calls.length;
    pointer(header, "pointerDown");
    advance(499);
    expect(document.querySelector(".dgr-drag-ghost")).toBeNull();
    advance(1);
    const ghost = document.querySelector<HTMLElement>(".dgr-drag-ghost")!;
    expect(ghost).not.toBeNull();
    expect(ghost).toHaveTextContent(/^A$/);
    expect(ghost).toHaveAttribute("aria-hidden", "true");
    expect(ghost).toHaveAttribute("inert");
    expect(ghost.querySelector("#custom-title")).toBeNull();
    expect(ghost.querySelector("button")).toBeNull();
    expect(ghost).toHaveStyle({
      color: "rgb(20, 30, 40)",
      backgroundColor: "rgb(230, 240, 250)",
      fontFamily: "monospace",
      fontSize: "16px",
      fontWeight: "600",
    });
    move(header, 160, 120);
    const before = ghost.style.transform;
    move(header, 170, 130);
    expect(ghost.style.transform).not.toBe(before);
    expect(renderHeader).toHaveBeenCalledTimes(count);
    expect(onColumnOrderChange).not.toHaveBeenCalled();
    pointer(grid, "pointerUp", 170, 130);
    expect(document.querySelector(".dgr-drag-ghost")).toBeNull();
  });

  it.each(["cancel", "unmount"])(
    "removes the floating ghost on %s",
    (reason) => {
      const { grid, unmount, onColumnOrderChange } = setup();
      hold(grid);
      expect(document.querySelector(".dgr-drag-ghost")).not.toBeNull();
      if (reason === "unmount") unmount();
      else fireEvent.pointerCancel(grid, { pointerId: 1 });
      expect(document.querySelector(".dgr-drag-ghost")).toBeNull();
      expect(onColumnOrderChange).not.toHaveBeenCalled();
    }
  );

  it("shows the same ghost for mouse dragging only after the movement threshold", () => {
    const { grid } = setup();
    pointer(grid, "pointerDown", 40, 16, { pointerType: "mouse" });
    expect(document.querySelector(".dgr-drag-ghost")).toBeNull();
    pointer(grid, "pointerMove", 170, 16, { pointerType: "mouse" });
    expect(document.querySelector(".dgr-drag-ghost")).toHaveTextContent("A");
    pointer(grid, "pointerUp", 170, 16, { pointerType: "mouse" });
    expect(document.querySelector(".dgr-drag-ghost")).toBeNull();
  });

  it("activates after a hold, previews without rerendering cells, then commits one order on release", () => {
    const renderCell = vi.fn(() => "Cell");
    const { grid, onColumnOrderChange, onColumnWidthsChange } = setup({
      columns: columns.map((c) => ({ ...c, renderCell })),
    });
    const count = renderCell.mock.calls.length;
    pointer(screen.getByRole("columnheader", { name: "A" }), "pointerDown");
    advance(499);
    expect(guide(grid)).toBeNull();
    advance(1);
    expect(guide(grid)).not.toBeNull();
    // Real native touch events stay on the original header, pointer capture stays on the grid.
    expect(move(screen.getByRole("columnheader", { name: "A" }), 270)).toBe(
      false
    );
    expect(onColumnOrderChange).not.toHaveBeenCalled();
    expect(renderCell).toHaveBeenCalledTimes(count);
    pointer(grid, "pointerUp", 270);
    expect(onColumnOrderChange).toHaveBeenCalledExactlyOnceWith([
      "b",
      "c",
      "a",
    ]);
    expect(onColumnWidthsChange).not.toHaveBeenCalled();
    expect(guide(grid)).toBeNull();
  });

  it("keeps short taps and immediate swipes native even if the finger returns", () => {
    const { grid, onColumnOrderChange } = setup();
    pointer(grid, "pointerDown");
    pointer(grid, "pointerUp");
    pointer(grid, "pointerDown");
    expect(move(grid, 40, 40)).toBe(true);
    move(grid, 40);
    advance(600);
    pointer(grid, "pointerUp");
    expect(guide(grid)).toBeNull();
    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });

  it("does not reorder or edge-scroll from a stationary hold", () => {
    const { grid, onColumnOrderChange } = setup();
    hold(grid, 5);
    expect(guide(grid)).not.toBeNull();
    advance(100);
    expect(grid.scrollLeft).toBe(0);
    pointer(grid, "pointerUp", 5);
    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });

  it("leaves empty header space native", () => {
    const { grid, onColumnOrderChange } = setup();
    hold(grid, 600);
    expect(guide(grid)).toBeNull();
    expect(move(grid, 40)).toBe(true);
    pointer(grid, "pointerUp", 40);
    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });

  it("honors the final release position", () => {
    const { grid, onColumnOrderChange } = setup();
    hold(grid);
    move(grid, 170);
    pointer(grid, "pointerUp", 270);
    expect(onColumnOrderChange).toHaveBeenCalledExactlyOnceWith([
      "b",
      "c",
      "a",
    ]);
  });

  it.each([false, true])(
    "aborts pending/active drag (active=%s) on interruption",
    (active) => {
      for (const kind of [
        "cancel",
        "lost-capture",
        "second-contact",
        "blur",
        "resize",
        "escape",
        "ancestor-scroll",
      ]) {
        const { grid, onColumnOrderChange, unmount } = setup();
        pointer(grid, "pointerDown");
        if (active) {
          advance();
          expect(guide(grid)).not.toBeNull();
          move(grid, 270);
        }
        if (kind === "cancel") fireEvent.pointerCancel(grid, { pointerId: 1 });
        if (kind === "lost-capture")
          fireEvent.lostPointerCapture(grid, { pointerId: 1 });
        if (kind === "second-contact")
          pointer(document.body, "pointerDown", 80, 16, {
            pointerId: 2,
            isPrimary: false,
          });
        if (kind === "blur" || kind === "resize")
          fireEvent(window, new Event(kind));
        if (kind === "escape") fireEvent.keyDown(grid, { key: "Escape" });
        if (kind === "ancestor-scroll") fireEvent.scroll(document);
        advance(600);
        expect(move(grid, 270)).toBe(true);
        pointer(grid, "pointerUp", 270);
        expect(guide(grid)).toBeNull();
        expect(onColumnOrderChange).not.toHaveBeenCalled();
        expect(grid.style.cursor).toBe("");
        unmount();
      }
    }
  );

  it("cancels a pending hold if the grid scrolls", () => {
    const { grid, onColumnOrderChange } = setup();
    pointer(grid, "pointerDown");
    grid.scrollLeft = 20;
    fireEvent.scroll(grid);
    advance();
    move(grid, 270);
    pointer(grid, "pointerUp", 270);
    expect(guide(grid)).toBeNull();
    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });

  it.each(["loading", "rows", "columns"])(
    "aborts an active drag when %s changes",
    (kind) => {
      const { grid, props, rerender, onColumnOrderChange } = setup();
      hold(grid);
      move(grid, 270);
      expect(guide(grid)).not.toBeNull();
      rerender(
        <DataGrid
          {...props}
          {...(kind === "loading"
            ? { loading: true }
            : kind === "rows"
              ? { rows: [...rows].reverse() }
              : { columns: columns.slice(1) })}
        />
      );
      pointer(grid, "pointerUp", 270);
      expect(guide(grid)).toBeNull();
      expect(onColumnOrderChange).not.toHaveBeenCalled();
    }
  );

  it.each(["disabled", "readonly", "capability", "action", "control"])(
    "does not start from %s headers",
    (kind) => {
      const { grid, onColumnOrderChange } = setup({
        ...(kind === "disabled"
          ? { reorderable: false }
          : kind === "readonly"
            ? { columnOrder: ["a", "b", "c"], onColumnOrderChange: undefined }
            : {}),
        columns: [
          {
            ...columns[0],
            ...(kind === "capability"
              ? { reorderable: false }
              : kind === "action"
                ? { type: "action" as const }
                : kind === "control"
                  ? { renderHeader: () => <button>Action</button> }
                  : {}),
          },
          ...columns.slice(1),
        ],
      });
      const target =
        kind === "control"
          ? screen.getByRole("button", { name: "Action" })
          : grid;
      hold(target);
      expect(move(target, 270)).toBe(true);
      pointer(grid, "pointerUp", 270);
      expect(guide(grid)).toBeNull();
      expect(onColumnOrderChange).not.toHaveBeenCalled();
    }
  );

  it.each(["action", "explicit"])("stops at an %s reorder barrier", (kind) => {
    const { grid, onColumnOrderChange } = setup({
      columns: [
        ...columns.slice(0, 2),
        {
          ...columns[2],
          ...(kind === "action"
            ? { type: "action" as const }
            : { reorderBarrier: true }),
        },
        { ...columns[0], id: "d", name: "D" },
      ],
    });
    hold(grid);
    move(grid, 390);
    pointer(grid, "pointerUp", 390);
    expect(onColumnOrderChange).toHaveBeenCalledExactlyOnceWith([
      "b",
      "a",
      "c",
      "d",
    ]);
  });

  it.each(["left", "right"] as const)(
    "reorders within the %s frozen band only",
    (frozen) => {
      const frozenColumns = columns.map((c) => ({ ...c, frozen }));
      const center = { ...columns[0], id: "d", name: "D" };
      const { grid, onColumnOrderChange } = setup({
        columns:
          frozen === "left"
            ? [...frozenColumns, center]
            : [center, ...frozenColumns],
      });
      const start = frozen === "left" ? 40 : 740;
      const end = frozen === "left" ? 600 : 990;
      hold(grid, start);
      move(grid, end);
      pointer(grid, "pointerUp", end);
      expect(onColumnOrderChange).toHaveBeenCalledExactlyOnceWith(
        frozen === "left" ? ["b", "c", "a", "d"] : ["d", "b", "c", "a"]
      );
    }
  );

  it("keeps resize handles ahead of header hold gestures", () => {
    const { grid, onColumnOrderChange, onColumnWidthsChange } = setup();
    const handle = screen
      .getByRole("columnheader", { name: "A" })
      .querySelector('[data-resize-handle="right"]') as HTMLElement;
    // jsdom's global rectangle has viewport width; model the actual handle width instead.
    handle.getBoundingClientRect = () => ({ width: 5 }) as DOMRect;
    hold(handle, 100);
    pointer(grid, "pointerMove", 150);
    pointer(grid, "pointerUp", 150);
    expect(onColumnWidthsChange).toHaveBeenCalledExactlyOnceWith({ a: 150 });
    expect(onColumnOrderChange).not.toHaveBeenCalled();
    expect(guide(grid)).toBeNull();
  });

  it("treats returning to the source in a frozen band as a no-op", () => {
    const { grid, onColumnOrderChange } = setup({
      columns: columns.map((c) => ({ ...c, frozen: "left" })),
    });
    hold(grid);
    move(grid, 270);
    move(grid, 40);
    pointer(grid, "pointerUp", 40);
    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });

  it("auto-scrolls to offscreen targets and retains native events on a virtualized-away source", () => {
    const wideColumns = Array.from({ length: 40 }, (_, index) => ({
      ...columns[0],
      id: `col${index}`,
      name: `Col ${index}`,
    }));
    const { grid, onColumnOrderChange } = setup({ columns: wideColumns });
    const target = screen.getByRole("columnheader", { name: "Col 0" });
    hold(target);
    expect(move(target, 995)).toBe(false);
    advance(1600);
    expect(grid.scrollLeft).toBeGreaterThan(1200);
    fireEvent.scroll(grid);
    expect(target.isConnected).toBe(false);
    expect(document.querySelector(".dgr-drag-ghost")).toHaveTextContent(
      "Col 0"
    );
    expect(
      fireEvent.touchMove(target, { touches: [{ clientX: 500, clientY: 16 }] })
    ).toBe(false);
    const scrollLeft = grid.scrollLeft;
    advance(100);
    expect(grid.scrollLeft).toBe(scrollLeft);
    fireEvent.pointerCancel(grid, { pointerId: 1 });
    expect(document.querySelector(".dgr-drag-ghost")).toBeNull();
    expect(
      fireEvent.touchMove(target, { touches: [{ clientX: 995, clientY: 16 }] })
    ).toBe(true);
    advance(100);
    expect(grid.scrollLeft).toBe(scrollLeft);
    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });

  it("suppresses the hold menu only during a claimed header contact and cleans up on unmount", () => {
    const { grid, unmount, onColumnOrderChange } = setup();
    expect(fireEvent.contextMenu(grid)).toBe(true);
    hold(grid);
    expect(fireEvent.contextMenu(grid)).toBe(false);
    pointer(grid, "pointerUp");
    expect(fireEvent.contextMenu(grid)).toBe(true);
    pointer(grid, "pointerDown");
    unmount();
    advance(1000);
    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });
});
