# Package verification

Data Griddle is being prepared for an experimental npm release. Publication remains disabled;
`0.0.0` is a local placeholder. Use the local tarball instructions in the [README](../README.md).

This guide was restored on 2026-10-03 from the maintainer's 2026-09-28 Phase 5 verification record
and checked against the current package configuration and verification scripts. The recorded run
reported 252 passing source tests across 21 files, lint/type/format/build checks, a frozen-lockfile
installation, and all five packed-consumer combinations passing. Those checks were not rerun for
this documentation update. Run them against the intended release commit before publication.

## Recorded consumer matrix

| Consumer             | Framework version | React / React DOM                             | Recorded result (2026-09-28) |
| -------------------- | ----------------- | --------------------------------------------- | ---------------------------- |
| Vite                 | 8.0.12            | 18.3.1                                        | Passed                       |
| Vite                 | 8.0.12            | 19.2.6                                        | Passed                       |
| Next.js App Router   | 16.3.6            | 19.2.6 dependencies; framework-selected React | Passed                       |
| Next.js Pages Router | 16.3.6            | 18.3.1                                        | Passed                       |
| Next.js Pages Router | 16.3.6            | 19.2.6                                        | Passed                       |

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

The current [artifact check](../scripts/check-package.mjs) also requires `private: true`.
Changing publication settings is part of deliberate release preparation, and requires updating
that guard along with the package's `prepublishOnly` blocker.

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
Missing keyboard resizing and keyboard/touch reordering remain release blockers.
Hold-and-drag selection, touch resizing and double-tap editing have a separate `pnpm check:touch` Chromium smoke script against the running
local app; this does not expand the historical packed-consumer matrix or verify physical devices.
Follow the [manual accessibility and interaction matrix](./ACCESSIBILITY.md).

The development app currently contains one editable grid at `/`. The former documentation website
and scenario routes were removed; historical docs-site verification is not evidence that those
examples remain available. `pnpm check:docs` now checks the single-grid page's structure, hydration,
editing and narrow layout. It does not check Markdown links or complete the manual matrix.

CI/release automation, a required contributor Node version, representative performance measurements,
and verification of the exact publication artifact remain outstanding. These recorded results are
preparation evidence, not a certification of a published release.
