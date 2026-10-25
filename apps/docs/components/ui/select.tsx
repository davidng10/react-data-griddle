"use client";

import * as SelectPrimitive from "@radix-ui/react-select";

import { FOCUS_RING } from "./focus";

import type { ReactNode } from "react";

export type SelectOption<V extends string> = {
  value: V;
  /** Shown in the trigger and the list. */
  label: string;
  /** Second line in the list only, such as the value behind the label. */
  description?: ReactNode;
};

type SelectProps<V extends string> = {
  value: V;
  onValueChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  "aria-label"?: string;
  className?: string;
};

// The trigger shows only the selected label; descriptions appear in the open list.
export function Select<V extends string>({
  value,
  onValueChange,
  options,
  "aria-label": label,
  className,
}: SelectProps<V>) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next as V)}
    >
      <SelectPrimitive.Trigger
        aria-label={label}
        className={`bg-fd-background hover:bg-fd-accent inline-flex h-7 items-center justify-between gap-2 rounded-md border px-2 text-sm ${FOCUS_RING} ${className ?? ""}`}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="text-fd-muted-foreground">
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
            <path
              d="m4 6 4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="bg-fd-popover text-fd-popover-foreground z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border shadow-md"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground relative flex cursor-default flex-col rounded py-1.5 pr-8 pl-2 text-sm outline-none select-none"
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                {option.description && (
                  <span className="text-fd-muted-foreground text-xs">
                    {option.description}
                  </span>
                )}
                <SelectPrimitive.ItemIndicator className="absolute top-2 right-2">
                  <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
                    <path
                      d="m3.5 8.5 3 3 6-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
