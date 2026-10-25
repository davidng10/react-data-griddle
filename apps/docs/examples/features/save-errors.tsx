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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SaveErrorsExample() {
  const [rows, setRows] = useState(() => createPeople());
  const [failSaves, setFailSaves] = useState(true);
  const [saveError, setSaveError] = useState("");

  // Stands in for your API. The cell shows the new value and a spinner until this settles.
  const saveCell = async ({
    rowId,
    columnId,
    nextValue,
  }: CellCommit<Person>) => {
    await wait(800);
    if (failSaves) throw new Error("Server unavailable");
    // Update rows before the promise resolves, or the cell shows the old value again.
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, [columnId]: String(nextValue) } : row
      )
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 12, padding: 8, fontSize: 14 }}>
        <label>
          <input
            type="checkbox"
            checked={failSaves}
            onChange={(event) => setFailSaves(event.target.checked)}
          />{" "}
          Fail saves
        </label>
        {/* Keep the live region mounted, outside the grid. */}
        <p
          role="alert"
          aria-atomic="true"
          style={{ margin: 0, color: "#dc2626" }}
        >
          {saveError}
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          aria-label="People"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          onCellCommit={async (update) => {
            setSaveError("");
            await saveCell(update);
          }}
          onCellCommitError={({ update }) =>
            setSaveError(
              `Could not save ${update.columnId} in row ${update.rowId}. Please retry.`
            )
          }
        />
      </div>
    </div>
  );
}
