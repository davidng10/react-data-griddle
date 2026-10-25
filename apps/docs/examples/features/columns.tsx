"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createEmployees } from "../data";

import type { Column, ColumnId } from "data-griddle";
import type { Employee } from "../data";

export default function ColumnsExample() {
  const [rows, setRows] = useState(() => createEmployees(100));
  const [widths, setWidths] = useState<Readonly<Record<ColumnId, number>>>({});

  const columns: Column<Employee>[] = [
    // Explicit width, with limits for resizing.
    {
      id: "name",
      name: "Name",
      accessor: (row) => row.name,
      width: 180,
      minWidth: 120,
      maxWidth: 320,
    },
    // No width: 140px by default.
    { id: "department", name: "Department", accessor: (row) => row.department },
    // A barrier: other columns can't be dragged past it.
    {
      id: "startDate",
      name: "Start date",
      accessor: (row) => row.startDate,
      width: 120,
      reorderBarrier: true,
    },
    // No width and last in visual order: fills the remaining space.
    { id: "role", name: "Role", accessor: (row) => row.role },
    // Action columns are never selectable, editable, resizable, or reorderable.
    {
      id: "remove",
      name: "",
      type: "action",
      width: 90,
      accessor: () => null,
      renderCell: (ctx) => (
        <button
          type="button"
          onClick={() =>
            setRows((current) => current.filter((row) => row.id !== ctx.rowId))
          }
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <p style={{ margin: 0, padding: 8, fontSize: 14 }}>
        Widths: {JSON.stringify(widths)}
      </p>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          aria-label="Employees"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          onColumnWidthsChange={setWidths}
        />
      </div>
    </div>
  );
}
