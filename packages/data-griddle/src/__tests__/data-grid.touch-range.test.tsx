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
const columns: Column<Row>[] = [
  {
    id: "left",
    name: "Left",
    width: 100,
    frozen: "left",
    accessor: (r) => r.value,
    editable: true,
  },
  { id: "center", name: "Center", width: 1200, accessor: (r) => r.value },
  {
    id: "right",
    name: "Right",
    width: 100,
    frozen: "right",
    accessor: (r) => r.value,
  },
];
const getRowId = (r: Row) => r.id;
function setup(extra: Partial<DataGridProps<Row>> = {}) {
  const onSelectionChange = vi.fn();
  const props = { rows, columns, getRowId, onSelectionChange, ...extra };
  const view = render(<DataGrid {...props} />);
  return { ...view, grid: screen.getByRole("grid"), onSelectionChange, props };
}
function pointer(
  grid: HTMLElement,
  kind: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel",
  x = 40,
  y = 48,
  extra = {}
) {
  return fireEvent[kind](grid, {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    ...extra,
  });
}
function move(grid: HTMLElement, x: number, y: number, cancelable = true) {
  pointer(grid, "pointerMove", x, y);
  return fireEvent.touchMove(grid, {
    cancelable,
    touches: [{ identifier: 0, clientX: x, clientY: y }],
  });
}
function hold(grid: HTMLElement) {
  pointer(grid, "pointerDown");
  act(() => vi.advanceTimersByTime(500));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("touch hold range selection", () => {
  it("arms only after holding, highlights the anchor, extends across frozen zones and retains the range on release", () => {
    const { grid, onSelectionChange } = setup();
    pointer(grid, "pointerDown");
    act(() => vi.advanceTimersByTime(499));
    expect(onSelectionChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(grid.querySelector(".dgr-selection-range")).not.toBeNull();
    expect(move(grid, 950, 112)).toBe(false); // claimed touch move must block browser pan
    expect(onSelectionChange.mock.lastCall?.[0].range).toEqual({
      anchor: { rowIndex: 0, columnId: "left" },
      focus: { rowIndex: 2, columnId: "right" },
    });
    pointer(grid, "pointerUp", 950, 112);
    const retained = onSelectionChange.mock.lastCall?.[0];
    pointer(grid, "pointerDown", 160, 48);
    expect(move(grid, 180, 160)).toBe(true);
    pointer(grid, "pointerUp", 180, 160);
    expect(onSelectionChange.mock.lastCall?.[0]).toEqual(retained);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("never activates after early movement, even when the finger returns to its origin", () => {
    const { grid, onSelectionChange } = setup();
    pointer(grid, "pointerDown");
    expect(move(grid, 40, 60)).toBe(true);
    move(grid, 40, 48);
    act(() => vi.advanceTimersByTime(700));
    pointer(grid, "pointerUp");
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("does not prevent touch pan or context menus on custom controls", () => {
    const { grid, onSelectionChange } = setup({
      columns: [{ ...columns[0], renderCell: () => <button>Action</button> }],
    });
    const button = screen.getAllByRole("button", { name: "Action" })[0];
    pointer(button, "pointerDown");
    act(() => vi.advanceTimersByTime(600));
    expect(move(button, 60, 112)).toBe(true);
    expect(fireEvent.contextMenu(button)).toBe(true);
    pointer(grid, "pointerUp");
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("suppresses the native hold menu only for a claimed cell touch", () => {
    const { grid } = setup();
    expect(fireEvent.contextMenu(grid)).toBe(true);
    hold(grid);
    expect(fireEvent.contextMenu(grid)).toBe(false);
    pointer(grid, "pointerUp");
    expect(fireEvent.contextMenu(grid)).toBe(true);
  });

  it.each([
    "scroll",
    "ancestor-scroll",
    "cancel",
    "second-contact",
    "blur",
    "resize",
    "escape",
  ])("cancels a pending hold on %s", (kind) => {
    const { grid, onSelectionChange } = setup();
    pointer(grid, "pointerDown");
    if (kind === "scroll") {
      grid.scrollTop = 10;
      fireEvent.scroll(grid);
    }
    if (kind === "ancestor-scroll") fireEvent.scroll(document);
    if (kind === "cancel") pointer(grid, "pointerCancel");
    if (kind === "second-contact")
      pointer(document.body, "pointerDown", 70, 90, {
        pointerId: 2,
        isPrimary: false,
      });
    if (kind === "blur") fireEvent(window, new Event("blur"));
    if (kind === "resize") fireEvent(window, new Event("resize"));
    if (kind === "escape") fireEvent.keyDown(grid, { key: "Escape" });
    act(() => vi.advanceTimersByTime(700));
    pointer(grid, "pointerUp");
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it.each(["loading", "rows", "columns"])(
    "cancels a pending hold when %s changes",
    (kind) => {
      const { grid, props, rerender, onSelectionChange } = setup();
      pointer(grid, "pointerDown");
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
      act(() => vi.advanceTimersByTime(700));
      pointer(grid, "pointerUp");
      expect(onSelectionChange).not.toHaveBeenCalled();
    }
  );

  it("auto-scrolls at the edge after activation and stops on cancellation without rerendering cell content", () => {
    const renderCell = vi.fn(() => "Cell");
    const { grid, onSelectionChange } = setup({
      columns: columns.map((c) => ({ ...c, renderCell })),
    });
    const count = renderCell.mock.calls.length;
    hold(grid);
    move(grid, 160, 112);
    expect(renderCell).toHaveBeenCalledTimes(count);
    move(grid, 160, 599);
    act(() => vi.advanceTimersByTime(64));
    expect(grid.scrollTop).toBeGreaterThan(0);
    pointer(grid, "pointerCancel");
    const scrollTop = grid.scrollTop;
    const calls = onSelectionChange.mock.calls.length;
    act(() => vi.advanceTimersByTime(100));
    expect(grid.scrollTop).toBe(scrollTop);
    expect(move(grid, 950, 200)).toBe(true);
    expect(onSelectionChange).toHaveBeenCalledTimes(calls);
  });

  it.each([
    "cancel",
    "lost-capture",
    "second-contact",
    "ancestor-scroll",
    "blur",
    "resize",
    "escape",
    "native-cancel",
    "noncancelable-move",
  ])("releases active touch ownership on %s", (kind) => {
    const { grid, onSelectionChange } = setup();
    hold(grid);
    expect(move(grid, 160, 112)).toBe(false);
    if (kind === "cancel") pointer(grid, "pointerCancel");
    if (kind === "lost-capture")
      fireEvent.lostPointerCapture(grid, { pointerId: 1 });
    if (kind === "second-contact")
      pointer(document.body, "pointerDown", 70, 90, {
        pointerId: 2,
        isPrimary: false,
      });
    if (kind === "ancestor-scroll") fireEvent.scroll(document);
    if (kind === "blur") fireEvent(window, new Event("blur"));
    if (kind === "resize") fireEvent(window, new Event("resize"));
    if (kind === "escape") fireEvent.keyDown(grid, { key: "Escape" });
    if (kind === "native-cancel") fireEvent.touchCancel(grid);
    if (kind === "noncancelable-move") move(grid, 160, 140, false);
    const count = onSelectionChange.mock.calls.length;
    expect(move(grid, 950, 200)).toBe(true);
    pointer(grid, "pointerUp", 950, 200);
    act(() => vi.advanceTimersByTime(100));
    expect(onSelectionChange).toHaveBeenCalledTimes(count);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it.each(["loading", "rows", "columns"])(
    "stops an active touch range when %s changes",
    (kind) => {
      const { grid, props, rerender, onSelectionChange } = setup();
      hold(grid);
      expect(move(grid, 160, 112)).toBe(false);
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
      const count = onSelectionChange.mock.calls.length;
      expect(
        fireEvent.touchMove(grid, {
          touches: [{ identifier: 0, clientX: 950, clientY: 200 }],
        })
      ).toBe(true);
      act(() => vi.advanceTimersByTime(100));
      expect(onSelectionChange).toHaveBeenCalledTimes(count);
    }
  );

  it("preserves an active range through unrelated renders without restarting the gesture", () => {
    const { grid, props, rerender, onSelectionChange } = setup();
    hold(grid);
    expect(move(grid, 160, 112)).toBe(false);
    rerender(<DataGrid {...props} aria-label="Updated label" />);
    expect(move(grid, 950, 144)).toBe(false);
    expect(onSelectionChange.mock.lastCall?.[0].range).toEqual({
      anchor: { rowIndex: 0, columnId: "left" },
      focus: { rowIndex: 3, columnId: "right" },
    });
    pointer(grid, "pointerUp", 950, 144);
  });

  it("keeps receiving touch movement after virtualization removes the original target", () => {
    const { grid, onSelectionChange } = setup();
    const target = grid.querySelector('[role="gridcell"]') as HTMLElement;
    pointer(target, "pointerDown");
    act(() => vi.advanceTimersByTime(500));
    grid.scrollTop = 2000;
    fireEvent.scroll(grid);
    expect(target.isConnected).toBe(false);
    expect(
      fireEvent.touchMove(target, {
        touches: [{ identifier: 0, clientX: 160, clientY: 112 }],
      })
    ).toBe(false);
    expect(onSelectionChange.mock.lastCall?.[0].range.focus).toEqual({
      rowIndex: 65,
      columnId: "center",
    });
    pointer(grid, "pointerUp", 160, 112);
    expect(
      fireEvent.touchMove(target, {
        touches: [{ identifier: 0, clientX: 160, clientY: 144 }],
      })
    ).toBe(true);
  });

  it("cleans up a pending hold on unmount", () => {
    const { grid, unmount, onSelectionChange } = setup();
    pointer(grid, "pointerDown");
    unmount();
    act(() => vi.advanceTimersByTime(700));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
