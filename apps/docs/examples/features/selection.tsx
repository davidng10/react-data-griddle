"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createEmployees } from "../data";

import type { Column, GridSelection, RowId } from "data-griddle";
import type { Employee } from "../data";

const columns: Column<Employee>[] = [
  { id: "name", name: "Name", accessor: (row) => row.name, width: 180 },
  { id: "department", name: "Department", accessor: (row) => row.department },
  { id: "role", name: "Role", accessor: (row) => row.role },
  {
    id: "active",
    name: "Active",
    accessor: (row) => (row.active ? "Yes" : "No"),
    width: 90,
  },
];

function describe(selection: GridSelection | null) {
  if (!selection?.focusedCell) return "No cell focused";
  const { focusedCell, range } = selection;
  const cell = `row ${focusedCell.rowIndex + 1}, ${focusedCell.columnId}`;
  if (!range) return `Focused ${cell}`;
  const rows = Math.abs(range.focus.rowIndex - range.anchor.rowIndex) + 1;
  return `Focused ${cell}, range spans ${rows} rows`;
}

export default function SelectionExample() {
  const [rows] = useState(() => createEmployees(100));
  const [selectedRowIds, setSelectedRowIds] = useState<ReadonlySet<RowId>>(
    () => new Set([1, 2])
  );
  const [readOnly, setReadOnly] = useState(false);
  const [selection, setSelection] = useState<GridSelection | null>(null);

  const selectActive = () =>
    setSelectedRowIds(
      new Set(rows.filter((row) => row.active).map((row) => row.id))
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: 8,
          fontSize: 14,
        }}
      >
        <button type="button" onClick={selectActive}>
          Select active
        </button>
        <button type="button" onClick={() => setSelectedRowIds(new Set())}>
          Clear
        </button>
        <label>
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(event) => setReadOnly(event.target.checked)}
          />{" "}
          Read-only
        </label>
        <output>
          {selectedRowIds.size} rows checked. {describe(selection)}
        </output>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          aria-label="Employees"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          enableRowSelection
          selectedRowIds={selectedRowIds}
          // Without the callback, controlled selection is read-only.
          onSelectedRowIdsChange={readOnly ? undefined : setSelectedRowIds}
          onSelectionChange={setSelection}
        />
      </div>
    </div>
  );
}
