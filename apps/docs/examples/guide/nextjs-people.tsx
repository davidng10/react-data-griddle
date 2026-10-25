"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import type { Column } from "data-griddle";

type Person = { id: number; name: string };

export default function People({ initialRows }: { initialRows: Person[] }) {
  const [rows, setRows] = useState(initialRows);
  const columns: Column<Person>[] = [
    { id: "name", name: "Name", accessor: (row) => row.name, editable: true },
  ];
  return (
    <DataGrid
      aria-label="People"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      onCellCommit={({ rowId, nextValue }) =>
        setRows((current) =>
          current.map((row) =>
            row.id === rowId ? { ...row, name: String(nextValue) } : row
          )
        )
      }
    />
  );
}
