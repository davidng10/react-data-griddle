# Package verification

`data-griddle@0.1.0` is published on npm under the `latest` tag. CI runs the checks below on every
PR and before each release. See the [release checklist](./RELEASING.md) for the release workflow.

## Last recorded run

On 2026-10-11, the working tree for the 0.1.0 release passed 381 tests across 26 files, lint, type
and format checks, a frozen-lockfile install, the production build, a browser smoke test of the dev
app, seven reorder-indicator cases, and all five packed consumers below. CI reruns these checks, so
treat this table as a record of that run, not of the current commit.

| Consumer             | Framework version | React and React DOM                            | Result |
| -------------------- | ----------------- | ---------------------------------------------- | ------ |
| Vite                 | 8.0.12            | 18.3.1                                         | Passed |
| Vite                 | 8.0.12            | 19.2.6                                         | Passed |
| Next.js App Router   | 16.3.6            | 19.2.6 installed, Next's bundled React renders | Passed |
| Next.js Pages Router | 16.3.6            | 18.3.1                                         | Passed |
| Next.js Pages Router | 16.3.6            | 19.2.6                                         | Passed |

The run used Node 25.9.0, pnpm 10.33.0, TypeScript 6.0.2, Playwright 1.63.0, and desktop Chromium
153.0.8010.12. React 18 consumers used `@types/react` 18.3.31 and `@types/react-dom` 18.3.7. React 19
consumers used 19.2.14 and 19.2.3. The only runtime dependency is `@tanstack/react-virtual` 3.14.2.
Fixture lock files pin transitive dependencies.

The package's peer range for matching `react` and `react-dom` is `^18.3.1 || ^19.2.6`. The matrix
tests the lower end of each major, not every version in the range. The App Router renders with
Next's bundled React, so only the Vite and direct Node SSR runs test the installed React versions.
No older Next.js versions or minimum browser or OS versions are tested. The project declares no
minimum Node version for contributors or consumers. CI uses Node 24.

## Artifact and type contract

- The library ships ESM only, built for ES2022, with two exports: `data-griddle` and
  `data-griddle/styles.css`. There is no CommonJS build.
- The JavaScript keeps its `"use client"` directive. React, React DOM, and TanStack Virtual are
  not bundled. React and React DOM are peer dependencies, and TanStack Virtual is a dependency.
- The type declarations include the CSS entry. `package.json` marks the CSS as a side effect, and
  you must import it yourself because the JavaScript entry doesn't.
- The tarball contains only `dist/`, `package.json`, the README, and the LICENSE. Tests, dev app
  assets, coverage, and config files stay out.
- Declaration checks run with both `Bundler` and `NodeNext` resolution. The Next.js Pages fixture
  sets `skipLibCheck` because Next's React 19 shared types conflict with React 18. A separate
  `NodeNext` check runs with `--strict --skipLibCheck false`, so the library's own declarations are
  still checked strictly. The Next fixtures use the ESNext type library.

The [artifact check](../scripts/check-package.mjs) fails unless the library has a real release
version and the public npm registry, and the workspace root and dev app are private. The library's
`prepack` hook builds the library and runs this check, including when you publish from the package
directory. It covers the artifact only, not the rest of the release checklist.

## Installing a local tarball

To try unreleased changes in another app, build and pack from this repository:

```bash
pnpm install --frozen-lockfile
cd packages/data-griddle
npm pack
# From your consuming application:
npm install /absolute/path/to/react-data-griddle/packages/data-griddle/data-griddle-0.1.0.tgz
```

`npm pack` runs the `prepack` build with this workspace's dev tools. The app that installs the
tarball doesn't need pnpm or any build tools.

## Running the checks

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

`check:consumers` first runs `check:package`, which builds the library and checks the artifact. The
[consumer runner](../scripts/check-consumers.mjs) then checks `npm pack --dry-run`, packs a real
tarball, copies the fixture consumers into an OS temporary directory, and installs the tarball
there. Each consumer uses its own dependencies and lock file, with no workspace links or source
aliases. Playwright runs from the repository root. The script never publishes or deploys.

The consumer checks cover:

- Direct Node SSR without DOM globals or React warnings, type checks, and production builds
- Initial Next.js HTML and Chromium hydration without browser errors, then navigating away and
  back and editing again
- The stylesheet applying without the dev app's CSS
- Keyboard focus and scrolling to offscreen cells
- Native row selection and built-in editing
- A custom editor popup, both contained and in a body portal
- Initial loading, refresh, and empty results

The script prints an `Isolated consumers:` directory. After a successful run it holds `pack.json`,
`results.json`, the tarball, per-consumer logs, lock files, and screenshots. The OS can delete
temporary directories, so copy anything you want to keep. In CI, `verify.yml` keeps the tarball,
`pack.json`, and `results.json` for 30 days.

`CONSUMER_FILTER=vite-react18 pnpm check:consumers` runs a single consumer for debugging, which
doesn't cover the full matrix. The [fixture instructions](../fixtures/README.md) cover lock files
and running a generated consumer by hand.

## Application integration

Import the CSS in a Vite entry, the Next.js App Router root layout, or the Pages Router's
`pages/_app.tsx`. Keep accessors, renderers, ID functions, and event callbacks in a Client
Component. Server Components can pass serializable rows. See the
[Next.js integration guide](./INTEGRATION.md#nextjs-client-boundary-and-stylesheet).

Leave SSR on, and you don't need `ssr: false`. The server HTML may contain the labeled grid shell
without every row, because virtualization fills in rows once the client measures the layout.

## Known gaps

Desktop Chromium is the only browser tested. Firefox, Safari, Chrome and Edge on other platforms,
physical iOS and Android devices, screen readers, mobile IME input, zoom, and forced colors are all
untested. Column resizing and reordering don't work from the keyboard. The
[accessibility guide](./ACCESSIBILITY.md) lists this as a known limitation.

`pnpm check:touch` runs Chromium touch emulation against the local dev app; CI runs it against the
docs export with `--export`. It covers hold-and-drag
selection, touch resizing and reordering, and double-tap editing. It is separate from the consumer
matrix and doesn't use a physical device. Follow the
[manual accessibility and interaction matrix](./ACCESSIBILITY.md) for device testing.

`pnpm check:docs` checks the dev app's single grid at `/` for structure, hydration, editing, and
narrow layout. It doesn't check Markdown links or replace the manual matrix. The project has no
performance benchmarks yet.
