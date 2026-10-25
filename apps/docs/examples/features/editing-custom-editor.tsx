"use client";

import { useRef, useState } from "react";
import { DataGrid } from "data-griddle";

import type { CellEditContext, Column } from "data-griddle";

type Member = { id: number; name: string; status: string };

const statuses = ["Available", "Away", "Busy", "In a meeting", "Out sick"];

function createMembers(): Member[] {
  return ["Ada", "Lin", "Sam", "Maya", "Leo", "Nora", "Owen", "Priya"].map(
    (name, index) => ({ id: index + 1, name, status: statuses[index % 3] })
  );
}

// The suggestion list is positioned inside the editor content, so it stays inside the editor host
// in the DOM. Clicking it doesn't count as an outside press, so it doesn't save early.
function StatusEditor({ ctx }: { ctx: CellEditContext<Member> }) {
  const input = useRef<HTMLInputElement>(null);
  const draft = String(ctx.draft ?? "");
  // Show every status until the user types, then filter.
  const matches =
    draft === ctx.value
      ? statuses
      : statuses.filter((status) =>
          status.toLowerCase().includes(draft.toLowerCase())
        );

  return (
    <div style={{ position: "relative", display: "flex", gap: 4, padding: 4 }}>
      <input
        ref={input}
        autoFocus
        aria-label={`Status, ${ctx.row.name}`}
        value={draft}
        onChange={(event) => ctx.setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            ctx.commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            ctx.cancel();
          }
        }}
        style={{ minWidth: 0, flex: 1, font: "inherit" }}
      />
      <button type="button" onClick={ctx.commit}>
        Save
      </button>
      <button type="button" onClick={ctx.cancel}>
        Cancel
      </button>
      {matches.length > 0 && (
        <ul
          aria-label="Suggestions"
          style={{
            position: "absolute",
            top: "100%",
            left: -1,
            right: -1,
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--dgr-editor-background, #fff)",
            border: "1px solid var(--dgr-header-border-color, #e7e5e4)",
            borderRadius: 4,
            boxShadow: "var(--dgr-editor-shadow)",
          }}
        >
          {matches.map((status) => (
            <li key={status}>
              <button
                type="button"
                onClick={() => {
                  ctx.setDraft(status);
                  input.current?.focus();
                }}
                style={{
                  width: "100%",
                  padding: "4px 6px",
                  textAlign: "left",
                  font: "inherit",
                  color: "inherit",
                  background: "none",
                  border: 0,
                }}
              >
                {status}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const columns: Column<Member>[] = [
  { id: "name", name: "Name", accessor: (row) => row.name, width: 160 },
  {
    id: "status",
    name: "Status",
    accessor: (row) => row.status,
    editable: true,
    renderEditor: (ctx) => <StatusEditor ctx={ctx} />,
  },
];

export default function CustomEditorExample() {
  const [rows, setRows] = useState(createMembers);

  return (
    <DataGrid
      aria-label="Team status"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      onCellCommit={({ rowId, nextValue }) =>
        setRows((current) =>
          current.map((row) =>
            row.id === rowId ? { ...row, status: String(nextValue) } : row
          )
        )
      }
    />
  );
}
