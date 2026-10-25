import { baseOptions } from "@/lib/layout.shared";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16">
        <h1 className="text-4xl font-semibold">Data Griddle</h1>
        <p className="text-fd-muted-foreground text-lg">
          A virtualized, DOM-based data grid for React.
        </p>
        <Link
          href="/docs"
          className="bg-fd-primary text-fd-primary-foreground w-fit rounded-md px-4 py-2 text-sm font-medium"
        >
          Get started
        </Link>
      </main>
    </HomeLayout>
  );
}
