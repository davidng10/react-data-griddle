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
    id: "a",
    name: "A",
    width: 100,
    accessor: (row) => row.value,
    editable: true,
  },
  {
    id: "b",
    name: "B",
    width: 100,
    accessor: (row) => row.value,
    editable: true,
  },
];
const getRowId = (row: Row) => row.id;
function setup(extra: Partial<DataGridProps<Row>> = {}) {
  const onCellCommit = vi.fn();
  const props = { rows, columns, getRowId, onCellCommit, ...extra };
  const view = render(<DataGrid {...props} />);
  return { ...view, props, grid: screen.getByRole("grid"), onCellCommit };
}
function pointer(
  target: HTMLElement,
  kind: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel",
  x = 40,
  y = 48,
  extra = {}
) {
  fireEvent[kind](target, {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    ...extra,
  });
}
function tap(grid: HTMLElement, x = 40, y = 48) {
  pointer(grid, "pointerDown", x, y);
  pointer(grid, "pointerUp", x, y);
}
function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("touch editing", () => {
  it.each(["pointer-first", "touch-first"])(
    "claims completed taps from browser double-tap zoom with %s release order",
    (order) => {
      const { grid } = setup();
      for (let i = 0; i < 2; i++) {
        pointer(grid, "pointerDown");
        if (order === "pointer-first") pointer(grid, "pointerUp");
        expect(
          fireEvent.touchEnd(grid, {
            cancelable: true,
            touches: [],
            changedTouches: [{ clientX: 40, clientY: 48 }],
          })
        ).toBe(false);
        if (order === "touch-first") pointer(grid, "pointerUp");
      }
      expect(screen.getByRole("textbox")).toHaveFocus();
    }
  );

  it.each(["swipe", "hold", "cancel", "pinch", "control", "header"])(
    "does not claim native touch-end after %s",
    (kind) => {
      const { grid } = setup({
        columns: [{ ...columns[0], renderCell: () => <button>Action</button> }],
      });
      const target =
        kind === "control"
          ? screen.getAllByRole("button", { name: "Action" })[0]
          : grid;
      const y = kind === "header" ? 16 : 48;
      pointer(target, "pointerDown", 40, y);
      if (kind === "swipe") pointer(grid, "pointerMove", 40, 80);
      if (kind === "hold") advance(500);
      if (kind === "cancel") pointer(grid, "pointerCancel");
      if (kind === "pinch")
        pointer(grid, "pointerDown", 80, 48, {
          pointerId: 2,
          isPrimary: false,
        });
      pointer(grid, "pointerUp", 40, y);
      expect(
        fireEvent.touchEnd(target, {
          cancelable: true,
          touches: [],
          changedTouches: [{ clientX: 40, clientY: y }],
        })
      ).toBe(true);
      expect(screen.queryByRole("textbox")).toBeNull();
    }
  );

  it.each(["text", "select"] as const)(
    "focuses the %s editor without requesting browser viewport movement",
    (type) => {
      // Keep real focus behavior; inspect the browser API boundary that jsdom cannot render.
      const focus = vi.spyOn(HTMLElement.prototype, "focus");
      const { grid } = setup({
        columns: [
          {
            ...columns[0],
            type,
            options: [{ value: "Row 0", label: "First" }],
          },
        ],
      });
      tap(grid);
      tap(grid);
      const editor = screen.getByRole(type === "text" ? "textbox" : "combobox");
      expect(editor).toHaveFocus();
      const calls = focus.mock.calls.filter(
        (_, index) => focus.mock.contexts[index] === editor
      );
      expect(calls).toEqual([[{ preventScroll: true }]]);
    }
  );
  it("focuses on the first tap and opens a focused editor on a nearby second tap without rerendering cells", () => {
    const renderCell = vi.fn(({ value }) => String(value));
    const { grid } = setup({
      columns: columns.map((c) => ({ ...c, renderCell })),
    });
    const renders = renderCell.mock.calls.length;
    tap(grid);
    expect(grid).toHaveFocus();
    expect(screen.queryByRole("textbox")).toBeNull();
    advance(100);
    tap(grid, 48, 50);
    const editor = screen.getByRole("textbox", { name: "A, row 1" });
    expect(editor).toHaveFocus();
    expect(editor).toHaveValue("Row 0");
    expect(renderCell).toHaveBeenCalledTimes(renders);
  });

  it("saves through the existing editor action", () => {
    const { grid, onCellCommit } = setup();
    tap(grid);
    tap(grid);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Edited" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save edit" }));
    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellCommit.mock.calls[0][0]).toMatchObject({
      rowId: 0,
      columnId: "a",
      nextValue: "Edited",
    });
  });

  it("requires a fresh double-tap after cancel", () => {
    const { grid, onCellCommit } = setup();
    tap(grid);
    tap(grid);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Discard" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
    tap(grid);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onCellCommit).not.toHaveBeenCalled();
    tap(grid);
    expect(screen.getByRole("textbox")).toHaveValue("Row 0");
  });

  it("does not reopen a cell while its commit is pending", () => {
    const { grid } = setup({ onCellCommit: () => new Promise<void>(() => {}) });
    tap(grid);
    tap(grid);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Pending" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save edit" }));
    tap(grid);
    tap(grid);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it.each(["left", "right"] as const)(
    "opens an editor in the %s frozen band",
    (frozen) => {
      const { grid } = setup({
        columns: [{ ...columns[0], frozen }, columns[1]],
      });
      const x = frozen === "left" ? 40 : 950;
      tap(grid, x);
      tap(grid, x);
      expect(screen.getByRole("textbox", { name: "A, row 1" })).toHaveFocus();
    }
  );

  it.each(["timeout", "different-cell", "distant-position"])(
    "does not edit after %s, but the next nearby tap starts a new pair",
    (kind) => {
      const { grid } = setup();
      tap(grid);
      if (kind === "timeout") advance(400);
      const x =
        kind === "different-cell" ? 140 : kind === "distant-position" ? 80 : 40;
      tap(grid, x);
      expect(screen.queryByRole("textbox")).toBeNull();
      tap(grid, x);
      expect(screen.getByRole("textbox")).toHaveAccessibleName(
        kind === "different-cell" ? "B, row 1" : "A, row 1"
      );
    }
  );

  it.each(["swipe", "hold", "cancel", "lost-capture", "second-contact"])(
    "does not edit during or immediately after a second contact that becomes %s",
    (kind) => {
      const { grid } = setup();
      tap(grid);
      pointer(grid, "pointerDown");
      if (kind === "swipe") {
        pointer(grid, "pointerMove", 40, 80);
        pointer(grid, "pointerMove");
      }
      if (kind === "hold") advance(500);
      if (kind === "cancel") pointer(grid, "pointerCancel");
      if (kind === "lost-capture")
        fireEvent.lostPointerCapture(grid, { pointerId: 1 });
      if (kind === "second-contact")
        pointer(document.body, "pointerDown", 60, 48, {
          pointerId: 2,
          isPrimary: false,
        });
      pointer(grid, "pointerUp");
      expect(screen.queryByRole("textbox")).toBeNull();
      tap(grid);
      expect(screen.queryByRole("textbox")).toBeNull();
      tap(grid);
      expect(screen.getByRole("textbox")).toHaveFocus();
    }
  );

  it.each([
    "scroll",
    "ancestor-scroll",
    "blur",
    "resize",
    "keyboard",
    "outside",
    "header",
    "control",
    "mouse",
    "pen",
  ])("breaks the tap sequence after %s between taps", (kind) => {
    const { grid } = setup({
      columns: [
        { ...columns[0], renderCell: () => <button>Action</button> },
        columns[1],
      ],
    });
    tap(grid);
    if (kind === "scroll") fireEvent.scroll(grid);
    if (kind === "ancestor-scroll") fireEvent.scroll(document);
    if (kind === "blur" || kind === "resize")
      fireEvent(window, new Event(kind));
    if (kind === "keyboard") fireEvent.keyDown(grid, { key: "ArrowDown" });
    if (kind === "outside") tap(document.body);
    if (kind === "header") tap(grid, 40, 16);
    if (kind === "control")
      tap(screen.getAllByRole("button", { name: "Action" })[0]);
    if (kind === "mouse" || kind === "pen") {
      pointer(grid, "pointerDown", 140, 48, { pointerType: kind });
      pointer(grid, "pointerUp", 140, 48, { pointerType: kind });
    }
    tap(grid);
    expect(screen.queryByRole("textbox")).toBeNull();
    tap(grid);
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it.each(["loading", "rows", "columns"])(
    "breaks the tap sequence when %s changes between taps",
    (kind) => {
      const { grid, props, rerender } = setup();
      tap(grid);
      const next = {
        ...props,
        ...(kind === "loading"
          ? { loading: true }
          : kind === "rows"
            ? { rows: [...rows].reverse() }
            : { columns: [{ ...columns[0], name: "Renamed" }, columns[1]] }),
      };
      rerender(<DataGrid {...next} />);
      if (kind === "loading") rerender(<DataGrid {...next} loading={false} />);
      tap(grid);
      expect(screen.queryByRole("textbox")).toBeNull();
      tap(grid);
      expect(screen.getByRole("textbox")).toHaveFocus();
    }
  );

  it("keeps a pending pair through unrelated rerenders", () => {
    const { grid, props, rerender } = setup();
    tap(grid);
    rerender(<DataGrid {...props} aria-label="Updated" />);
    tap(grid);
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it.each([false, () => false])(
    "honors static and row-dependent editability",
    (editable) => {
      const { grid } = setup({ columns: [{ ...columns[0], editable }] });
      tap(grid);
      tap(grid);
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(grid).toHaveFocus();
    }
  );

  it("opens the native select editor through the same touch gesture", () => {
    const { grid } = setup({
      columns: [
        {
          ...columns[0],
          type: "select",
          options: [{ value: "Row 0", label: "First" }],
        },
      ],
    });
    tap(grid);
    tap(grid);
    expect(screen.getByRole("combobox", { name: "A, row 1" })).toHaveFocus();
  });
});
