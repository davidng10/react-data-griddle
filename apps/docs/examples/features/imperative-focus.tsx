"use client";

import { useRef, useState } from "react";
import { DataGrid } from "data-griddle";

import { createPeople } from "../data";

import type { Column, DataGridHandle, RowId } from "data-griddle";
import type { Person } from "../data";

const columns: Column<Person>[] = [
  { id: "name", name: "Name", accessor: (row) => row.name, width: 220 },
  { id: "role", name: "Role", accessor: (row) => row.role },
];

export default function ImperativeFocusExample() {
  const [rows] = useState(() => createPeople());
  const [result, setResult] = useState("");
  const grid = useRef<DataGridHandle>(null);

  // Read `grid.current` when you call the command; the handle can change after a render.
  const jump = (rowId: RowId) => {
    const outcome = grid.current?.focusCell({ rowId, columnId: "name" });
    if (outcome)
      setResult(outcome.ok ? `Focused row ${rowId}` : outcome.reason);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 8, padding: 8, fontSize: 14 }}>
        <button type="button" onClick={() => jump(80)}>
          Jump to row 80
        </button>
        <button type="button" onClick={() => jump(500)}>
          Jump to row 500
        </button>
        <output aria-live="polite">{result}</output>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          ref={grid}
          aria-label="People"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
        />
      </div>
    </div>
  );
}
