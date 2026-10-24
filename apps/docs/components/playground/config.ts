import { departments } from "@/examples/data";

import type { Employee } from "@/examples/data";
import type { Column } from "data-griddle";

export type RowCount = 100 | 10_000 | 100_000;
export type RowsState = "rows" | "empty" | "null";

export type PlaygroundConfig = {
  enableRowSelection: boolean;
  reorderable: boolean;
  resizable: boolean;
  frozenLeft: boolean;
  frozenRight: boolean;
  editableText: boolean;
  editableSelect: boolean;
  loading: boolean;
  rowsState: RowsState;
  rowCount: RowCount;
  rowHeight: number;
};

/** Grid defaults, so the generated code only shows what was changed. */
export const GRID_DEFAULTS = {
  enableRowSelection: false,
  reorderable: true,
  resizable: true,
  loading: false,
  rowHeight: 32,
} as const;

export const INITIAL_CONFIG: PlaygroundConfig = {
  ...GRID_DEFAULTS,
  frozenLeft: false,
  frozenRight: false,
  editableText: false,
  editableSelect: false,
  rowsState: "rows",
  rowCount: 100,
};

const departmentOptions = departments.map((value) => ({ label: value, value }));
const salaryFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Each column keeps its accessor's source next to the function, so the generated code matches the
// grid exactly.
type ColumnSpec = {
  column: Column<Employee>;
  accessorSource: string;
};

export function buildColumns(config: PlaygroundConfig): ColumnSpec[] {
  const editText = config.editableText || undefined;
  return [
    {
      column: {
        id: "id",
        name: "ID",
        accessor: (row) => row.id,
        width: 72,
        frozen: config.frozenLeft ? "left" : undefined,
      },
      accessorSource: "(row) => row.id",
    },
    {
      column: {
        id: "name",
        name: "Name",
        accessor: (row) => row.name,
        width: 180,
        editable: editText,
      },
      accessorSource: "(row) => row.name",
    },
    {
      column: {
        id: "role",
        name: "Role",
        accessor: (row) => row.role,
        width: 180,
        editable: editText,
      },
      accessorSource: "(row) => row.role",
    },
    {
      column: {
        id: "department",
        name: "Department",
        accessor: (row) => row.department,
        width: 150,
        type: "select",
        options: departmentOptions,
        editable: config.editableSelect || undefined,
      },
      accessorSource: "(row) => row.department",
    },
    {
      column: {
        id: "salary",
        name: "Salary",
        accessor: (row) => salaryFormat.format(row.salary),
        width: 120,
      },
      accessorSource: "(row) => salaryFormat.format(row.salary)",
    },
    {
      column: {
        id: "startDate",
        name: "Start date",
        accessor: (row) => row.startDate,
        width: 120,
      },
      accessorSource: "(row) => row.startDate",
    },
    {
      column: {
        id: "active",
        name: "Status",
        accessor: (row) => (row.active ? "Active" : "Inactive"),
        width: 100,
        frozen: config.frozenRight ? "right" : undefined,
      },
      accessorSource: '(row) => (row.active ? "Active" : "Inactive")',
    },
  ];
}

export function isEditable(config: PlaygroundConfig) {
  return config.editableText || config.editableSelect;
}

const COLUMN_FIELDS = [
  "width",
  "type",
  "frozen",
  "editable",
] as const satisfies (keyof Column<Employee>)[];

function printColumn({ column, accessorSource }: ColumnSpec) {
  const fields = [
    `id: ${JSON.stringify(column.id)}`,
    `name: ${JSON.stringify(column.name)}`,
    `accessor: ${accessorSource}`,
  ];
  for (const field of COLUMN_FIELDS) {
    const value = column[field];
    if (value !== undefined) fields.push(`${field}: ${JSON.stringify(value)}`);
    if (field === "type" && column.options) fields.push("options");
  }
  return `  {\n${fields.map((field) => `    ${field},`).join("\n")}\n  },`;
}

const ROWS_SOURCE: Record<RowsState, string> = {
  rows: "{rows}",
  empty: "{[]}",
  null: "{null}",
};

function indent(code: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

/**
 * A complete component file for the current settings. Props equal to the grid defaults are left
 * out, and imports and state appear only when the code uses them.
 */
export function generateCode(config: PlaygroundConfig): string {
  const specs = buildColumns(config);
  const hasRows = config.rowsState === "rows";
  // Edits need rows to land in, so an empty or missing result has no commit handler.
  const commits = hasRows && isEditable(config);

  const imports = [
    ...(commits ? ['import { useState } from "react";'] : []),
    'import { DataGrid } from "data-griddle";',
    "",
    `import type { ${commits ? "CellCommit, " : ""}Column } from "data-griddle";`,
  ];

  const blocks = [
    `"use client";`,
    imports.join("\n"),
    `type Employee = {
  id: number;
  name: string;
  role: string;
  department: string;
  salary: number;
  startDate: string;
  active: boolean;
};`,
    `const options = [\n${departments.map((value) => `  ${JSON.stringify(value)},`).join("\n")}\n].map((value) => ({ label: value, value }));`,
    `const salaryFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});`,
    `const columns: Column<Employee>[] = [\n${specs.map(printColumn).join("\n")}\n];`,
  ];

  const props = [
    `aria-label="Employees"`,
    `rows=${ROWS_SOURCE[config.rowsState]}`,
    `columns={columns}`,
    `getRowId={(row) => row.id}`,
  ];
  if (config.loading !== GRID_DEFAULTS.loading) props.push("loading");
  if (config.rowHeight !== GRID_DEFAULTS.rowHeight) {
    props.push(`rowHeight={${config.rowHeight}}`);
  }
  if (config.enableRowSelection !== GRID_DEFAULTS.enableRowSelection) {
    props.push("enableRowSelection");
  }
  if (config.reorderable !== GRID_DEFAULTS.reorderable) {
    props.push("reorderable={false}");
  }
  if (config.resizable !== GRID_DEFAULTS.resizable) {
    props.push("resizable={false}");
  }
  if (commits) props.push("onCellCommit={commit}");

  const grid = `<DataGrid\n${indent(props.join("\n"), 2)}\n/>`;
  const body = commits
    ? `const [rows, setRows] = useState(initialRows);

const commit = ({ rowId, columnId, nextValue }: CellCommit<Employee>) =>
  setRows((current) =>
    current.map((row) =>
      row.id === rowId ? { ...row, [columnId]: nextValue } : row
    )
  );

return (
${indent(grid, 2)}
);`
    : `return (\n${indent(grid, 2)}\n);`;
  const params = !hasRows
    ? ""
    : commits
      ? "{\n  initialRows,\n}: {\n  initialRows: Employee[];\n}"
      : "{ rows }: { rows: Employee[] }";

  blocks.push(
    `export default function EmployeesGrid(${params}) {\n${indent(body, 2).replace(/^ +$/gm, "")}\n}`
  );
  return blocks.join("\n\n") + "\n";
}
