import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataGrid } from "../data-grid";

import type {
  CellRenderContext,
  Column,
  SelectionCheckboxProps,
} from "../core/types";

const rows = [
  { id: 1, value: "one" },
  { id: 2, value: "two" },
];
type Row = (typeof rows)[number];
const getRowId = (row: Row) => row.id;
const columns: Column<Row>[] = [
  { id: "value", name: "Value", width: 100, accessor: (row) => row.value },
];

afterEach(() => vi.restoreAllMocks());

describe("grid render boundaries", () => {
  it("skips cell callbacks and custom children when only the grid label changes", () => {
    const childRender = vi.fn();
    function Content({ value }: { value: unknown }) {
      childRender();
      return <span>{String(value)}</span>;
    }
    const accessor = vi.fn((row: Row) => row.value);
    const renderCell = vi.fn((ctx: CellRenderContext<Row>) => (
      <Content value={ctx.value} />
    ));
    const cellClassName = vi.fn(() => "custom-cell");
    const editable = vi.fn(() => true);
    const schema = [
      { ...columns[0], accessor, renderCell, cellClassName, editable },
    ];
    const { rerender } = render(
      <DataGrid
        rows={rows}
        columns={schema}
        getRowId={getRowId}
        aria-label="Before"
      />
    );
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
    for (const callback of [
      accessor,
      renderCell,
      cellClassName,
      editable,
      childRender,
    ])
      callback.mockClear();

    rerender(
      <DataGrid
        rows={rows}
        columns={schema}
        getRowId={getRowId}
        aria-label="After"
      />
    );

    expect(screen.getByRole("grid", { name: "After" })).toBeInTheDocument();
    for (const callback of [
      accessor,
      renderCell,
      cellClassName,
      editable,
      childRender,
    ])
      expect(callback).not.toHaveBeenCalled();
  });

  it("refreshes cell content, classes and editability when render inputs change", () => {
    const renderCell = (ctx: CellRenderContext<Row>) => (
      <span>{`${ctx.value}/${ctx.rowId}/${ctx.rowIndex}/${ctx.column.name}/${ctx.width}/${ctx.height}`}</span>
    );
    const schema: Column<Row>[] = [
      {
        ...columns[0],
        renderCell,
        editable: (ctx) => ctx.row.value === "updated",
        cellClassName: (ctx) =>
          ctx.row.value === "updated" ? "updated-cell" : "original-cell",
      },
    ];
    const { rerender } = render(
      <DataGrid
        rows={rows}
        columns={schema}
        getRowId={getRowId}
        rowHeight={32}
      />
    );
    expect(
      screen.getByText("one/1/0/Value/100/32").closest('[role="gridcell"]')
    ).toHaveAttribute("aria-readonly", "true");

    rerender(
      <DataGrid
        rows={[rows[1], { ...rows[0], value: "updated" }]}
        columns={[{ ...schema[0], name: "Renamed" }]}
        getRowId={getRowId}
        columnWidths={{ value: 150 }}
        rowHeight={40}
      />
    );

    const cell = screen
      .getByText("updated/1/1/Renamed/150/40")
      .closest('[role="gridcell"]');
    expect(cell).toHaveAttribute("aria-readonly", "false");
    expect(cell).toHaveClass("updated-cell");
    expect(screen.getByText("two/2/0/Renamed/150/40")).toBeInTheDocument();
  });

  it("skips checkbox renders during cell focus and range changes, but updates row selection", () => {
    const renderSelectionCheckbox = vi.fn((props: SelectionCheckboxProps) => (
      <input
        type="checkbox"
        checked={props.checked}
        onChange={props.onChange}
        aria-label={props["aria-label"]}
      />
    ));
    render(
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        enableRowSelection
        renderSelectionCheckbox={renderSelectionCheckbox}
      />
    );
    renderSelectionCheckbox.mockClear();

    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    expect(grid).toHaveAttribute("aria-activedescendant");
    expect(renderSelectionCheckbox).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select row 1" }));
    expect(renderSelectionCheckbox).toHaveBeenCalled();
    expect(
      screen.getByRole("checkbox", { name: "Select row 1" })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select row 2" })
    ).not.toBeChecked();
  });

  it("keeps gesture listeners attached across renders and removes them on unmount", () => {
    const { rerender, unmount } = render(
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        aria-label="Before"
      />
    );
    const addDocument = vi.spyOn(document, "addEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    const addWindow = vi.spyOn(window, "addEventListener");
    const removeWindow = vi.spyOn(window, "removeEventListener");

    rerender(
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        aria-label="After"
      />
    );

    expect(
      addDocument.mock.calls.filter(([name]) => name === "pointerdown")
    ).toHaveLength(0);
    expect(
      removeDocument.mock.calls.filter(([name]) => name === "pointerdown")
    ).toHaveLength(0);
    for (const name of ["blur", "resize"]) {
      expect(
        addWindow.mock.calls.filter(([event]) => event === name)
      ).toHaveLength(0);
      expect(
        removeWindow.mock.calls.filter(([event]) => event === name)
      ).toHaveLength(0);
    }

    unmount();
    expect(
      removeDocument.mock.calls.filter(([name]) => name === "pointerdown")
    ).toHaveLength(1);
    for (const name of ["blur", "resize"])
      expect(
        removeWindow.mock.calls.filter(([event]) => event === name)
      ).toHaveLength(1);
  });
});
