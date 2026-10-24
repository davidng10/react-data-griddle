"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createPeople } from "../data";

import type { CellCommit, Column } from "data-griddle";
import type { Person } from "../data";

const columns: Column<Person>[] = [
  {
    id: "name",
    name: "Name",
    accessor: (row) => row.name,
    width: 220,
    editable: true,
  },
  { id: "role", name: "Role", accessor: (row) => row.role, editable: true },
];

export default function BasicExample() {
  const [rows, setRows] = useState(() => createPeople());

  const commit = ({ rowId, columnId, nextValue }: CellCommit<Person>) =>
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, [columnId]: String(nextValue) } : row
      )
    );

  return (
    <DataGrid
      aria-label="People"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      enableRowSelection
      onCellCommit={commit}
    />
  );
}
