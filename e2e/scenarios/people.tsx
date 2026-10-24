import { useState } from "react";

import { DataGrid } from "../../packages/data-griddle/src/index";

import type { Column } from "../../packages/data-griddle/src/index";

// Editable two-column grid with row selection, inset 24px from the viewport.
type Person = { id: number; name: string; role: string };

function createPeople(): Person[] {
  const firstNames = [
    "Ada",
    "Lin",
    "Sam",
    "Maya",
    "Leo",
    "Nora",
    "Owen",
    "Priya",
    "Theo",
    "Zoe",
  ];
  const lastNames = [
    "Chen",
    "Patel",
    "Rivera",
    "Kim",
    "Morgan",
    "Tan",
    "Brooks",
    "Shah",
    "Park",
    "Reed",
  ];
  const roles = [
    "Engineer",
    "Designer",
    "Researcher",
    "Product Manager",
    "Data Analyst",
    "QA Engineer",
    "Technical Writer",
    "Customer Success",
    "Operations Manager",
    "Engineering Manager",
    "UX Researcher",
    "Solutions Architect",
  ];

  return Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length)]}`,
    role: roles[index % roles.length],
  }));
}

export default function People() {
  const [rows, setRows] = useState(createPeople);
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
  return (
    <div style={{ padding: "24px" }}>
      <DataGrid
        aria-label="People example"
        style={{ height: "min(600px, calc(100dvh - 48px))" }}
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
    </div>
  );
}
