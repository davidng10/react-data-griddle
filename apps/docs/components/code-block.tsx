import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";

import type { ServerCodeBlockProps } from "fumadocs-ui/components/codeblock.rsc";

/** The one code surface. MDX `pre` blocks use it through `mdx.tsx`; components use `CodeBlock`. */
export const CODE_BACKGROUND = "bg-(--docs-code-background)";

type CodeBlockProps = Pick<ServerCodeBlockProps, "code" | "lang" | "codeblock">;

// Highlights at build time with the site's themes and code background. Use this instead of
// `ServerCodeBlock`, which falls back to Fumadocs' grey card.
export function CodeBlock({ code, lang, codeblock }: CodeBlockProps) {
  return (
    <ServerCodeBlock
      lang={lang}
      code={code}
      themes={{ light: "github-light", dark: "github-dark" }}
      codeblock={{
        ...codeblock,
        className: `${CODE_BACKGROUND} ${codeblock?.className ?? ""}`,
      }}
    />
  );
}
