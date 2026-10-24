import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      // White in light mode to match the page; dark keeps the raised card color.
      sidebar={{ className: "bg-fd-background dark:bg-fd-card" }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
