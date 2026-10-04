import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataGrid } from "../index";

import type { Column, DataGridProps } from "../index";

const rows = Array.from({ length: 100 }, (_, id) => ({
  id,
  value: `Row ${id}`,
}));
type Row = (typeof rows)[number];
const getRowId = (r: Row) => r.id;
const columns: Column<Row>[] = [
  {
    id: "a",
    name: "A",
    width: 100,
    minWidth: 60,
    maxWidth: 180,
    accessor: (r) => r.value,
  },
  { id: "b", name: "B", width: 100, accessor: (r) => r.value },
];
function setup(extra: Partial<DataGridProps<Row>> = {}) {
  const onColumnWidthsChange = vi.fn();
  const onColumnOrderChange = vi.fn();
  const props = {
    rows,
    columns,
    getRowId,
    onColumnWidthsChange,
    onColumnOrderChange,
    ...extra,
  };
  const view = render(<DataGrid {...props} />);
  const grid = screen.getByRole("grid");
  const handle = (name: string, side = "right") => {
    const el = screen
      .getByRole("columnheader", { name })
      .querySelector(`[data-resize-handle="${side}"]`) as HTMLElement;
    // jsdom has no CSS/media-query layout. Model the coarse-pointer handle's real width.
    el.getBoundingClientRect = () => ({
      x: 88,
      y: 0,
      left: 88,
      right: 100,
      top: 0,
      bottom: 32,
      width: 12,
      height: 32,
      toJSON: () => ({}),
    });
    return el;
  };
  return {
    ...view,
    grid,
    handle,
    props,
    onColumnWidthsChange,
    onColumnOrderChange,
  };
}
function pointer(
  target: HTMLElement,
  kind: "pointerDown" | "pointerMove" | "pointerUp",
  x: number,
  extra = {}
) {
  return fireEvent[kind](target, {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: 16,
    ...extra,
  });
}

describe("touch column resizing", () => {
  it.each([
    ["A", "right", 90],
    ["B", "left", 110],
  ])(
    "resizes from the %s %s handle with guide-only moves and one release commit",
    (name, side, x) => {
      const renderCell = vi.fn(() => "Cell");
      const { grid, handle, onColumnWidthsChange, onColumnOrderChange } = setup(
        { columns: columns.map((c) => ({ ...c, renderCell })) }
      );
      const count = renderCell.mock.calls.length;
      pointer(handle(name, side), "pointerDown", x);
      pointer(grid, "pointerMove", x + 40);
      expect(grid.querySelector(".dgr-resize-indicator")).not.toBeNull();
      expect(screen.getByRole("columnheader", { name: "A" })).toHaveStyle({
        width: "100px",
      });
      expect(onColumnWidthsChange).not.toHaveBeenCalled();
      expect(renderCell).toHaveBeenCalledTimes(count);
      pointer(grid, "pointerUp", x + 50);
      expect(onColumnWidthsChange).toHaveBeenCalledExactlyOnceWith({ a: 150 });
      expect(onColumnOrderChange).not.toHaveBeenCalled();
      expect(screen.getByRole("columnheader", { name: "A" })).toHaveStyle({
        width: "150px",
      });
      expect(grid.querySelector(".dgr-resize-indicator")).toBeNull();
    }
  );

  it.each([
    [20, 60],
    [400, 180],
  ])("clamps a release at %i to width %i", (x, width) => {
    const { grid, handle, onColumnWidthsChange } = setup();
    pointer(handle("A"), "pointerDown", 100);
    pointer(grid, "pointerUp", x);
    expect(onColumnWidthsChange).toHaveBeenCalledExactlyOnceWith({ a: width });
  });

  it("leaves normal header touches to native scrolling, even near a geometric seam", () => {
    const { grid, onColumnWidthsChange, onColumnOrderChange } = setup();
    pointer(
      screen.getByRole("columnheader", { name: "A" }),
      "pointerDown",
      100
    );
    pointer(grid, "pointerMove", 150);
    pointer(grid, "pointerUp", 150);
    expect(onColumnWidthsChange).not.toHaveBeenCalled();
    expect(onColumnOrderChange).not.toHaveBeenCalled();
  });

  it("does not change widths on a bare handle tap", () => {
    const { grid, handle, onColumnWidthsChange } = setup();
    pointer(handle("A"), "pointerDown", 100);
    pointer(grid, "pointerUp", 100);
    expect(onColumnWidthsChange).not.toHaveBeenCalled();
  });

  it.each([
    "cancel",
    "lost-capture",
    "second-contact",
    "blur",
    "resize",
    "escape",
  ])("discards a touch resize on %s", (kind) => {
    const { grid, handle, onColumnWidthsChange } = setup();
    pointer(handle("A"), "pointerDown", 100);
    pointer(grid, "pointerMove", 150);
    expect(grid.querySelector(".dgr-resize-indicator")).not.toBeNull();
    if (kind === "cancel") fireEvent.pointerCancel(grid, { pointerId: 1 });
    if (kind === "lost-capture")
      fireEvent.lostPointerCapture(grid, { pointerId: 1 });
    if (kind === "second-contact")
      pointer(document.body, "pointerDown", 200, {
        pointerId: 2,
        isPrimary: false,
      });
    if (kind === "blur") fireEvent(window, new Event("blur"));
    if (kind === "resize") fireEvent(window, new Event("resize"));
    if (kind === "escape") fireEvent.keyDown(grid, { key: "Escape" });
    pointer(grid, "pointerUp", 150);
    expect(onColumnWidthsChange).not.toHaveBeenCalled();
    expect(grid.querySelector(".dgr-resize-indicator")).toBeNull();
    expect(grid.style.cursor).toBe("");
  });

  it.each(["loading", "rows", "columns"])(
    "discards a touch resize when %s changes",
    (kind) => {
      const { grid, handle, props, rerender, onColumnWidthsChange } = setup();
      pointer(handle("A"), "pointerDown", 100);
      pointer(grid, "pointerMove", 150);
      expect(grid.querySelector(".dgr-resize-indicator")).not.toBeNull();
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
      pointer(grid, "pointerUp", 150);
      expect(onColumnWidthsChange).not.toHaveBeenCalled();
      expect(grid.querySelector(".dgr-resize-indicator")).toBeNull();
    }
  );

  it.each(["left", "right"] as const)(
    "resizes a %s frozen column",
    (frozen) => {
      const { grid, handle, onColumnWidthsChange } = setup({
        columns: [{ ...columns[0], frozen }, columns[1]],
      });
      const x = frozen === "left" ? 95 : 995;
      pointer(handle("A"), "pointerDown", x);
      pointer(grid, "pointerMove", x - 20);
      pointer(grid, "pointerUp", x - 20);
      expect(onColumnWidthsChange).toHaveBeenCalledExactlyOnceWith({ a: 80 });
    }
  );

  it.each([
    { columnWidths: { a: 100 } },
    { resizable: false },
    {
      columns: [
        { ...columns[0], resizable: false },
        { ...columns[1], type: "action" as const },
      ],
    },
  ])("omits touch handles when resize is unavailable: %j", (extra) => {
    const { grid } = setup({ ...extra, onColumnWidthsChange: undefined });
    expect(grid.querySelector("[data-resize-handle]")).toBeNull();
  });
});
