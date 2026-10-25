"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";

import { FOCUS_RING } from "./focus";

import type { ComponentProps } from "react";

export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={`bg-fd-muted-foreground/30 data-[state=checked]:bg-fd-primary inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${FOCUS_RING} ${className ?? ""}`}
      {...props}
    >
      <SwitchPrimitive.Thumb className="bg-fd-background block size-4 translate-x-0.5 rounded-full shadow-sm transition-transform data-[state=checked]:translate-x-4.5" />
    </SwitchPrimitive.Root>
  );
}
