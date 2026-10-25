"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

import { FOCUS_RING } from "./focus";

import type { ComponentProps } from "react";

type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & {
  /** Accessible name of the thumb, which is the focusable element. */
  "aria-label"?: string;
};

// Single-thumb slider. The thumb carries the accessible name, so `aria-label` goes there.
export function Slider({
  className,
  "aria-label": label,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={`relative flex h-5 w-full touch-none items-center select-none ${className ?? ""}`}
      {...props}
    >
      <SliderPrimitive.Track className="bg-fd-muted relative h-1.5 grow overflow-hidden rounded-full border">
        <SliderPrimitive.Range className="bg-fd-primary absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        className={`border-fd-primary bg-fd-background block size-4 rounded-full border-2 shadow-sm ${FOCUS_RING}`}
      />
    </SliderPrimitive.Root>
  );
}
