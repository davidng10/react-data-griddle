"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createEmployees, departments } from "../data";

import type { CellCommit, Column } from "data-griddle";
import type { Employee } from "../data";

const columns: Column<Employee>[] = [
  {
    id: "name",
    name: "Name",
    accessor: (row) => row.name,
    width: 180,
    editable: true,
  },
  {
    id: "department",
    name: "Department",
    accessor: (row) => row.department,
    width: 160,
    type: "select",
    options: departments.map((value) => ({ label: value, value })),
    editable: true,
  },
  {
    id: "role",
    name: "Role (active only)",
    accessor: (row) => row.role,
    // Per-cell editing: inactive employees are read-only.
    editable: (ctx) => ctx.row.active,
  },
  {
    id: "active",
    name: "Active",
    accessor: (row) => (row.active ? "Yes" : "No"),
    width: 90,
  },
];

export default function EditingSelectExample() {
  const [rows, setRows] = useState(() => createEmployees(100));

  const commit = ({ rowId, columnId, nextValue }: CellCommit<Employee>) =>
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, [columnId]: String(nextValue) } : row
      )
    );

  return (
    <DataGrid
      aria-label="Employees"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      onCellCommit={commit}
    />
  );
}
