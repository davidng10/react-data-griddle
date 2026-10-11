# Package verification

Data Griddle is being prepared for its first npm release, `0.1.0` on the `latest` tag.
The library is configured for publication; no package has been published by this preparation.
See the [release checklist](./RELEASING.md) for the outstanding gates.

The 2026-10-11 audit of commit `4574e61` passed 381 tests across 26 files, lint/type/format
checks, the production build, basic-demo browser smoke, seven reorder-indicator cases and
all five packed-consumer combinations below. That audit used the previous `0.0.0` metadata.
The subsequent 0.1.0 preparation run on the working tree based on that commit also passed all
381 tests, lint/types/format, frozen-lockfile installation and all five packed consumers with
`data-griddle@0.1.0` installed. These are draft preparation results; rerun the release checklist
after finalizing the intended release commit. Passing an earlier artifact is not approval to
publish a changed one.

## Recorded consumer matrix

| Consumer             | Framework version | React / React DOM                             | 0.1.0 preparation (2026-10-11) |
| -------------------- | ----------------- | --------------------------------------------- | ------------------------------ |
| Vite                 | 8.0.12            | 18.3.1                                        | Passed                         |
| Vite                 | 8.0.12            | 19.2.6                                        | Passed                         |
| Next.js App Router   | 16.3.6            | 19.2.6 dependencies; framework-selected React | Passed                         |
| Next.js Pages Router | 16.3.6            | 18.3.1                                        | Passed                         |
| Next.js Pages Router | 16.3.6            | 19.2.6                                        | Passed                         |

The record used Node 25.9.0, pnpm 10.33.0, TypeScript 6.0.2, Playwright 1.63.0 and desktop
Chromium 153.0.8010.12. React 18 consumers used `@types/react` 18.3.31 and `@types/react-dom`
18.3.7; React 19 consumers used 19.2.14 and 19.2.3 respectively. The runtime dependency is
`@tanstack/react-virtual` 3.14.2. Fixture lockfiles pin transitive dependencies.

The package declares matching React/DOM peers `^18.3.1 || ^19.2.6`. The matrix tests these
endpoints, not every version accepted by those ranges. App Router uses its framework-selected
React implementation; Vite and direct Node SSR provide independent checks of the installed React
versions. No older Next.js versions or minimum browser/OS versions are established by this run.
The recorded Node runtime is not a declared minimum for contributors or consumers.

## Artifact and type contract

- The library is ESM-only, built for ES2022, with public exports `data-griddle` and
  `data-griddle/styles.css`. CommonJS is not provided.
- JavaScript preserves `"use client"`; React, React DOM and TanStack Virtual remain external.
  React/DOM are peers and TanStack Virtual is a runtime dependency.
- TypeScript declarations include the CSS entry. CSS is marked as a side effect and must be
  imported explicitly; the JavaScript entry does not inject it.
- Packed files are limited to `dist/`, package metadata, README and LICENSE. Source tests,
  development-app assets, coverage and unrelated configuration are excluded.
- Declaration checks cover Bundler and NodeNext resolution. The Next.js Pages fixture uses
  `skipLibCheck` for framework types, including Next's React 19 shared types with React 18.
  The separate package NodeNext check uses `--strict --skipLibCheck false`; the framework
  exception is not a blanket declaration-validation pass. Next fixtures use the ESNext type library.

The [artifact check](../scripts/check-package.mjs) requires a publishable library with a real
release version, public npm registry configuration, and private workspace/development-app packages.
The library's `prepack` hook builds the library and runs that check before packing, including
when publishing from the package directory. It does not replace the full release checklist.

## Local tarball installation

Before publication, build and pack from this repository:

```bash
pnpm install --frozen-lockfile
cd packages/data-griddle
npm pack
# From your consuming application:
npm install /absolute/path/to/react-data-griddle/packages/data-griddle/data-griddle-0.1.0.tgz
```

Packing runs the build/check hook using this workspace's development tools. Consumers of the
finished tarball do not need pnpm or the build tools.

## Reproduce the checks

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm format:check
pnpm build
pnpm exec playwright install chromium
pnpm check:consumers
```

`check:consumers` runs `check:package`, which builds the library and checks its artifact contract.
The [consumer runner](../scripts/check-consumers.mjs) then inspects `npm pack --dry-run`, creates
a real tarball, copies fixture consumers into an OS temporary directory and installs that tarball.
Consumers use their own dependencies and lockfiles, without workspace links or source aliases.
Playwright runs from the repository as the driver. No publish or deployment command is run.

The consumer checks cover:

- Direct Node SSR without DOM globals or React warnings, type checks and production builds.
- Initial Next.js HTML and Chromium hydration without browser errors, followed by navigation away
  and back and another edit.
- Stylesheet retention without the development app's CSS, keyboard focus and offscreen scrolling.
- Native row selection, built-in editing, custom-editor popup containment and body portals.
- Initial loading, refresh and empty-result presentation.

The script prints an `Isolated consumers:` directory. Successful runs retain `pack.json`,
`results.json`, the tarball, per-consumer logs, lockfiles and screenshots there. Preserve these
with the tested commit and environment for release evidence; OS temporary storage is not a durable
archive. The original run's raw artifacts were recorded in temporary storage and have not been
revalidated for this guide.

Use `CONSUMER_FILTER=vite-react18 pnpm check:consumers` for a diagnostic subset; a filtered run
does not establish the full matrix. See the [fixture instructions](../fixtures/README.md) for
lockfile handling and running a generated consumer manually.

## Application integration

Import CSS in a Vite entry, a Next.js App Router root layout, or Pages Router's `pages/_app.tsx`.
Keep accessors, renderers, identity functions and event callbacks inside a Client Component;
Server Components may pass serializable rows. See the
[Next.js integration guide](./INTEGRATION.md#nextjs-client-boundary-and-stylesheet).

SSR stays enabled. Initial output may contain the named grid shell rather than all virtualized
row content; client layout measurements populate the grid. A consumer does not need `ssr: false`.

## Remaining verification

Desktop Chromium evidence does not establish the full Chrome/Edge/Firefox/Safari matrix, physical
iOS/Android usability, screen-reader support, mobile IME behavior, zoom or forced-colors support.
Keyboard column resizing and reordering are deferred beyond the experimental preview. Their absence
is a documented accessibility limitation, not a preview release blocker.
Hold-and-drag selection, touch resizing/reordering and double-tap editing have a separate `pnpm check:touch` Chromium smoke script against the running
local app; this does not expand the historical packed-consumer matrix or verify physical devices.
Follow the [manual accessibility and interaction matrix](./ACCESSIBILITY.md).

The development app currently contains one editable grid at `/`. The former documentation website
and scenario routes were removed; historical docs-site verification is not evidence that those
examples remain available. `pnpm check:docs` now checks the single-grid page's structure, hydration,
editing and narrow layout. It does not check Markdown links or complete the manual matrix.

CI/release automation, a required contributor Node version and representative performance
measurements are deferred for the initial release. Verification of the exact publication artifact
and the explicitly unresolved manual support checks remain in the [release checklist](./RELEASING.md).
These results are preparation evidence, not a certification of a published release.
