"use client";

import { useMemo, useState } from "react";
import { createEmployees } from "@/examples/data";
import { DataGrid } from "data-griddle";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

import { CODE_BACKGROUND } from "../code-block";
import { DemoCode } from "../demo-code";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import {
  INITIAL_CONFIG,
  buildColumns,
  generateCode,
  isEditable,
} from "./config";

import type { Employee } from "@/examples/data";
import type { CellCommit } from "data-griddle";
import type { ReactNode } from "react";
import type { SelectOption } from "../ui/select";
import type { PlaygroundConfig, RowCount, RowsState } from "./config";

const ROWS_OPTIONS: SelectOption<RowsState>[] = [
  {
    value: "rows",
    label: "Loaded rows",
    description: <code>{"rows={rows}"}</code>,
  },
  {
    value: "empty",
    label: "Empty result",
    description: <code>{"rows={[]}"}</code>,
  },
  {
    value: "null",
    label: "No result yet",
    description: <code>{"rows={null}"}</code>,
  },
];
const ROW_COUNT_OPTIONS: SelectOption<`${RowCount}`>[] = [
  { value: "100", label: "100 rows" },
  { value: "10000", label: "10,000 rows" },
  { value: "100000", label: "100,000 rows" },
];

type BooleanKey = {
  [K in keyof PlaygroundConfig]: PlaygroundConfig[K] extends boolean
    ? K
    : never;
}[keyof PlaygroundConfig];

// One grid that never remounts: every control is a prop change, so updates show up live.
export function Playground() {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  // Rows are regenerated only by the row count control and reset; edits commit here.
  const [rows, setRows] = useState(() =>
    createEmployees(INITIAL_CONFIG.rowCount)
  );

  const set = <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => setConfig((current) => ({ ...current, [key]: value }));

  const setRowCount = (count: RowCount) => {
    set("rowCount", count);
    setRows(createEmployees(count));
  };

  const commit = ({ rowId, columnId, nextValue }: CellCommit<Employee>) =>
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, [columnId]: nextValue } : row
      )
    );

  const { frozenLeft, frozenRight, editableText, editableSelect } = config;
  const columns = useMemo(
    () =>
      buildColumns({
        ...INITIAL_CONFIG,
        frozenLeft,
        frozenRight,
        editableText,
        editableSelect,
      }).map(({ column }) => column),
    [frozenLeft, frozenRight, editableText, editableSelect]
  );
  const code = useMemo(() => generateCode(config), [config]);

  const toggle = (key: BooleanKey, label: ReactNode) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <Switch
        checked={config[key]}
        onCheckedChange={(checked) => set(key, checked)}
      />
    </label>
  );

  return (
    <div className="not-prose my-6">
      <form
        aria-label="Grid settings"
        onSubmit={(event) => event.preventDefault()}
        className="bg-fd-background flex flex-col gap-4 rounded-xl border p-4"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Group title="Interaction">
            {toggle("enableRowSelection", <code>enableRowSelection</code>)}
            {toggle("reorderable", <code>reorderable</code>)}
            {toggle("resizable", <code>resizable</code>)}
          </Group>
          <Group title="Columns">
            {toggle("frozenLeft", "Freeze ID on the left")}
            {toggle("frozenRight", "Freeze Status on the right")}
            {toggle("editableText", "Editable text (Name, Role)")}
            {toggle("editableSelect", "Editable select (Department)")}
          </Group>
          <Group title="Data">
            {toggle("loading", <code>loading</code>)}
            <Field label="Rows">
              <Select
                aria-label="Rows"
                value={config.rowsState}
                options={ROWS_OPTIONS}
                onValueChange={(value) => set("rowsState", value)}
                className="w-36"
              />
            </Field>
            <Field label="Row count">
              <Select
                aria-label="Row count"
                value={`${config.rowCount}`}
                options={ROW_COUNT_OPTIONS}
                onValueChange={(value) =>
                  setRowCount(Number(value) as RowCount)
                }
                className="w-36"
              />
            </Field>
          </Group>
          <Group title="Appearance">
            <div className="flex flex-col gap-2 text-sm">
              <span className="flex justify-between">
                <code>rowHeight</code>
                <span className="text-fd-muted-foreground tabular-nums">
                  {config.rowHeight}px
                </span>
              </span>
              <Slider
                aria-label="rowHeight"
                min={24}
                max={56}
                step={4}
                value={[config.rowHeight]}
                onValueChange={([value]) => set("rowHeight", value)}
              />
            </div>
          </Group>
        </div>
        <Button
          onClick={() => {
            setConfig(INITIAL_CONFIG);
            setRows(createEmployees(INITIAL_CONFIG.rowCount));
          }}
          className="self-start"
        >
          Reset settings
        </Button>
      </form>
      <figure className="bg-fd-card mt-4 overflow-hidden rounded-xl border">
        <div className="demo-preview h-[520px]">
          <DataGrid
            aria-label="Employees"
            rows={
              config.rowsState === "rows"
                ? rows
                : config.rowsState === "empty"
                  ? []
                  : null
            }
            columns={columns}
            getRowId={(row) => row.id}
            loading={config.loading}
            rowHeight={config.rowHeight}
            enableRowSelection={config.enableRowSelection}
            reorderable={config.reorderable}
            resizable={config.resizable}
            onCellCommit={isEditable(config) ? commit : undefined}
          />
        </div>
        {/* The generated file is always longer than the peek, so it always collapses. */}
        <DemoCode collapsible>
          <DynamicCodeBlock
            lang="tsx"
            code={code}
            options={{ themes: { light: "github-light", dark: "github-dark" } }}
            codeblock={{
              "data-line-numbers": true,
              className: `${CODE_BACKGROUND} rounded-none border-0`,
              viewportProps: { className: "max-h-none" },
            }}
          />
        </DemoCode>
      </figure>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-fd-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      {label}
      {children}
    </div>
  );
}
