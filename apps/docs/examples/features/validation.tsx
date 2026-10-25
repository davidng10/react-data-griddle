"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createEmployees } from "../data";

import type { CellCommit, Column } from "data-griddle";
import type { Employee } from "../data";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const columns: Column<Employee>[] = [
  { id: "name", name: "Name", accessor: (row) => row.name, width: 180 },
  {
    id: "salary",
    name: "Salary",
    accessor: (row) => row.salary,
    width: 160,
    renderCell: (ctx) => money.format(Number(ctx.value)),
    editable: true,
    // Never throw: anything that isn't a number becomes NaN, which `validate` rejects.
    parseValue: (draft) => Number(String(draft).replace(/[$,\s]/g, "")),
    validate: (value) => {
      const salary = Number(value);
      if (!Number.isFinite(salary)) return "Enter a number";
      if (salary < 30_000 || salary > 500_000)
        return "Enter a salary between 30,000 and 500,000";
      return null;
    },
  },
  {
    id: "startDate",
    name: "Start date",
    accessor: (row) => row.startDate,
    editable: true,
    validate: (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? null : "Use YYYY-MM-DD",
  },
];

export default function ValidationExample() {
  const [rows, setRows] = useState(() => createEmployees(100));

  const commit = ({ rowId, columnId, nextValue }: CellCommit<Employee>) =>
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, [columnId]: nextValue } : row
      )
    );

  return (
    <DataGrid
      aria-label="Salaries"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      onCellCommit={commit}
    />
  );
}
