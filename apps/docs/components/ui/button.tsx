import { FOCUS_RING } from "./focus";

import type { ComponentProps } from "react";

// Pressing shrinks the button slightly and darkens it; reduced motion keeps only the color change.
const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 font-medium transition-[color,background-color,scale] duration-100 select-none active:scale-[0.96] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50";

// Variants own their colors and size, so callers never override them through `className`.
const VARIANTS = {
  /** Bordered, for secondary actions such as resetting a form. */
  outline:
    "hover:bg-fd-accent hover:text-fd-accent-foreground active:bg-fd-muted-foreground/20 border text-sm",
  /** Filled, for a single action over content, such as expanding code. */
  primary:
    "bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/85 active:bg-fd-primary/75 dark:bg-fd-secondary dark:text-fd-foreground dark:hover:bg-fd-accent dark:active:bg-fd-muted-foreground/30 text-xs shadow-sm dark:border",
};

type ButtonProps = ComponentProps<"button"> & {
  /** @defaultValue "outline" */
  variant?: keyof typeof VARIANTS;
};

// Native button. `type` defaults to "button" so it never submits.
export function Button({
  className,
  type = "button",
  variant = "outline",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANTS[variant]} ${FOCUS_RING} ${className ?? ""}`}
      {...props}
    />
  );
}
