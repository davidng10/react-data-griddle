# Packed-package verification

Run `pnpm exec playwright install chromium`, then `pnpm check:consumers` from the repository root.
These directories are templates and are not part of the pnpm workspace.

The script builds and packs the library and checks `npm pack --dry-run`. It then copies each
consumer and the shared example into an OS temporary directory and installs the real tarball there.
Consumers get no source aliases, workspace links, or runtime dependencies from the repository.
Playwright runs from the root and drives the tests.

## Version matrix

| Consumer          | React and React DOM | `@types/react` and `@types/react-dom` |
| ----------------- | ------------------- | ------------------------------------- |
| Vite              | 18.3.1, 19.2.6      | 18.3.31/18.3.7, 19.2.14/19.2.3        |
| Next Pages Router | 18.3.1, 19.2.6      | 18.3.31/18.3.7, 19.2.14/19.2.3        |
| Next App Router   | 19.2.6              | 19.2.14/19.2.3                        |

The pinned tools are Vite 8.0.12, Next 16.3.6, and TypeScript 6.0.2. The App Router renders with
the React build that Next bundles rather than the pinned one, so only the Vite and direct Node SSR
runs test the declared React versions directly.

`locks/` pins each consumer's transitive dependencies. Runs use `npm ci` and only update the local
package version and tarball integrity to match the new build. To refresh a lock, delete that
consumer's lock file and run the check again. `CONSUMER_FILTER=vite-react18 pnpm check:consumers`
runs a single consumer for debugging, which does not cover the full matrix.

## What the check covers

- Direct Node SSR without DOM globals or warnings
- Strict declaration checks with `Bundler` and `NodeNext` resolution. These check the library's
  declarations even though the Pages Router sets `skipLibCheck`. See
  [package verification](../docs/PACKAGE_VERIFICATION.md).
- Production builds and the initial Next HTML
- Chromium hydration without errors
- The stylesheet still applying without the docs app's CSS
- Keyboard focus and scrolling to offscreen cells
- Row selection and built-in editing
- A custom editor popup, both contained and in a body portal
- Initial loading, refresh, and empty results
- Navigating away and back, then editing

Each temporary directory keeps the install, build, type-check, and SSR logs, the lock files,
screenshots, and the exact versions tested. All of this runs in desktop Chromium only, so it says
nothing about other browsers, mobile, or assistive technology. The script never publishes or deploys.

## Running a generated consumer manually

After `pnpm check:consumers` succeeds, go to the `Isolated consumers:` directory the script prints.
Each consumer there is installed and built, and stays in place after its test server stops. For
example, in the `vite-react19` directory run:

```bash
npm run start -- --port 4173
```

Open `http://127.0.0.1:4173` and stop the server with Ctrl+C. The Next consumers accept the same
command. These servers bind to localhost, so testing on a physical device needs a server the device
can reach, which you have to set up separately.

The [shared example](./shared/Example.tsx) has default selection controls, a frozen Name column,
offscreen focus, built-in editing, a custom Status editor, and initial loading, refresh, and empty
states. It does not cover the full [manual accessibility matrix](../docs/ACCESSIBILITY.md). Make
lasting changes in `shared/Example.tsx` and rerun the check. Edits in the temporary directory are
thrown away.

## Editing shared examples locally

The root dev dependencies on `data-griddle` and `next` give your editor the library's built public
exports and the matching Next.js types. `fixtures/tsconfig.json` makes `shared/*.tsx` its own
TypeScript project, and `pnpm lint:fixtures` type-checks it along with the three framework
projects. Each framework has a local `Example.tsx` that re-exports the shared one. The consumer
runner replaces it with the shared file before installing. After a fresh install, run
`pnpm build:lib`, or keep `pnpm dev` running so the declarations rebuild as you edit.

Passing this local type check doesn't show that the packed package works. The script doesn't copy
`fixtures/tsconfig.json` into the consumers, and they still install from the real tarball with their
own lock files.
