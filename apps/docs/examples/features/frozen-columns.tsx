"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createEmployees } from "../data";

import type { Column } from "data-griddle";
import type { Employee } from "../data";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const columns: Column<Employee>[] = [
  {
    id: "name",
    name: "Name",
    accessor: (row) => row.name,
    width: 160,
    frozen: "left",
  },
  { id: "role", name: "Role", accessor: (row) => row.role, width: 180 },
  {
    id: "department",
    name: "Department",
    accessor: (row) => row.department,
    width: 160,
  },
  {
    id: "startDate",
    name: "Start date",
    accessor: (row) => row.startDate,
    width: 140,
  },
  {
    id: "active",
    name: "Active",
    accessor: (row) => (row.active ? "Yes" : "No"),
    width: 120,
  },
  {
    id: "salary",
    name: "Salary",
    accessor: (row) => row.salary,
    renderCell: (ctx) => money.format(Number(ctx.value)),
    width: 130,
    frozen: "right",
  },
];

export default function FrozenColumnsExample() {
  const [rows] = useState(() => createEmployees(100));

  return (
    <DataGrid
      aria-label="Employees"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      enableRowSelection
    />
  );
}
