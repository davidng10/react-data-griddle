"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createPeople } from "../data";

import type { Column } from "data-griddle";
import type { CSSProperties } from "react";
import type { Person } from "../data";

// Tokens on the grid's own `style` win over any theme set by an ancestor stylesheet.
const accounts = {
  "--dgr-background": "#111827",
  "--dgr-text-color": "#f3f4f6",
  "--dgr-header-background": "#1f2937",
  "--dgr-cell-border-color": "#374151",
  "--dgr-header-border-color": "#4b5563",
  "--dgr-frozen-divider-color": "#64748b",
  "--dgr-focus-color": "#93c5fd",
  "--dgr-selection-border-color": "#93c5fd",
  "--dgr-selection-background": "rgb(147 197 253 / 16%)",
  "--dgr-editor-background": "#1f2937",
  "--dgr-skeleton-bar-color": "#374151",
  "--dgr-empty-color": "#d1d5db",
  "--dgr-border-radius": "8px",
} as CSSProperties;

const columns: Column<Person>[] = [
  {
    id: "name",
    name: "Name",
    accessor: (row) => row.name,
    width: 200,
    frozen: "left",
    editable: true,
  },
  { id: "role", name: "Role", accessor: (row) => row.role, editable: true },
];

export default function ThemeExample() {
  const [rows, setRows] = useState(() => createPeople());

  return (
    <DataGrid
      aria-label="Accounts"
      style={accounts}
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      enableRowSelection
      onCellCommit={({ rowId, columnId, nextValue }) =>
        setRows((current) =>
          current.map((row) =>
            row.id === rowId ? { ...row, [columnId]: String(nextValue) } : row
          )
        )
      }
    />
  );
}
