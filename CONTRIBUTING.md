# Contributing

## Set up once

Use Node 24 and the pnpm version in the root `packageManager` field. Then install
the dependencies and the Playwright browser:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

## Make a change

Every change goes through the same six steps.

### 1. Create a branch

Create a feature or fix branch from `main`. There is no long-lived `dev` branch.
Plan what goes into a release with issues and milestones.

### 2. Run the dev app

```bash
pnpm dev
```

`pnpm dev` builds the library, watches `packages/data-griddle/src/`, and serves
the docs site. Open `/docs/` for live demos. Pages live in
`apps/docs/content/docs/` and the demos they render in `apps/docs/examples/`. The
app imports the built `dist/`, so your edits appear after the watcher rebuilds.

For the rendering model and performance constraints, read [INTERNALS.md](INTERNALS.md).

### 3. Add or update tests

Tests run against the source, so you don't need a build. Unit tests live in
`packages/data-griddle/src/`. Browser tests live in `e2e/`.

| Kind    | File pattern                            | Command         | Use it for                                  |
| ------- | --------------------------------------- | --------------- | ------------------------------------------- |
| Core    | `*.test.ts`, runs in Node               | `pnpm test`     | stores, geometry, and other plain-TS logic  |
| DOM     | `*.test.tsx`, runs in jsdom             | `pnpm test`     | component behaviour, keyboard, focus, ARIA  |
| SSR     | `*.ssr.test.tsx`, runs in Node          | `pnpm test`     | server rendering                            |
| Browser | `e2e/specs/*.spec.ts`, runs in Chromium | `pnpm test:e2e` | layout, pointer and touch events, scrolling |

Write a browser test only when jsdom can't model the behaviour. To add one, see
[Write a browser test](#write-a-browser-test).

### 4. Run the checks for your change

| If you changed                                           | Run                    |
| -------------------------------------------------------- | ---------------------- |
| anything in `src/`                                       | `pnpm test`            |
| pointer, touch, editing, reorder, or layout behaviour    | `pnpm test:e2e`        |
| public types or exports                                  | `pnpm verify:static`   |
| `package.json`, `build.mjs`, the shipped CSS, or exports | `pnpm check:consumers` |

If you aren't sure, run `pnpm verify`. It runs all four CI jobs in sequence. It is
slow, and it is the only local command that matches CI.

`pnpm test` and `pnpm test:e2e` never build the package. A broken `dist/`, `exports`
map, or `.d.ts` passes both. Only `pnpm check:consumers` packs the library and
installs it into real Vite and Next.js apps.

### 5. Commit and push

Husky runs two hooks. On commit, lint-staged runs ESLint and Prettier on the staged
files. On push, `pnpm build:lib` builds the library and `pnpm lint:tsc` typechecks
the whole workspace. The build runs first because the docs app typechecks against
`dist/`.

The hooks don't run tests, and `--no-verify` skips them. A push that passes the
hooks can still fail CI.

### 6. Open a pull request

Open the pull request against `main`. Give it a
[Conventional Commit title](#write-the-pull-request-title-for-the-changelog).

CI checks the title and runs four jobs in parallel. Each job has a local command:

| CI job           | Local command           | What it runs                                      | Tests the |
| ---------------- | ----------------------- | ------------------------------------------------- | --------- |
| Static checks    | `pnpm verify:static`    | library and docs build, ESLint, types, Prettier   | both      |
| Unit tests       | `pnpm verify:unit`      | Vitest in Node, jsdom, and SSR projects           | source    |
| Browser checks   | `pnpm verify:e2e`       | Playwright scenarios for touch, editing, reorder  | source    |
| Packed consumers | `pnpm verify:consumers` | packed tarballs in isolated Vite and Next.js apps | package   |

For what the packed-consumers job checks, read
[PACKAGE_VERIFICATION.md](docs/PACKAGE_VERIFICATION.md). Only CI decides whether a
pull request can merge.

## Write the pull request title for the changelog

GitHub squash merges use the pull request title as the commit subject. Release
Please reads that subject to pick the version and write the release notes. Keep
each pull request to one change. Write the title for users, because it becomes the
changelog entry.

```text
fix(keyboard): restore focus after editing
feat(columns): add visibility controls
feat(editing)!: change the commit callback arguments
docs: explain controlled selection
```

The accepted types are `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`,
`ci`, `chore`, `style`, and `revert`. The scope in parentheses is optional. It
labels the area and doesn't pick a package or create a separate release. To mark a
breaking change, add `!` and describe the migration in the pull request body.

Before 1.0, a fix bumps the patch version, and a feature or breaking change bumps
the minor version. From 1.0, a breaking change bumps the major version. Docs, test,
CI, and maintenance changes don't trigger a release on their own. Each release gets
one bump, and its most significant change picks the size.

## Write a browser test

Browser tests never use the docs app. Each `e2e/scenarios/<name>.tsx` default-exports
a component that mounts the library source. `e2e/main.tsx` serves that component at
`/?s=<name>`, so a new scenario needs no registration.

1. Add `e2e/scenarios/<name>.tsx`.
2. Add a spec in `e2e/specs/` that opens the scenario with `page.goto("/?s=<name>")`.
   To pass data to one test, use `page.addInitScript`.
3. Run `pnpm test:e2e`. It builds the scenarios in production mode and serves them.
   Playwright flags pass through, for example `pnpm test:e2e --ui` or a spec path.

To view a scenario by hand, run `pnpm exec vite -c e2e/vite.config.ts` and open
`/?s=<name>`.

When a test fails, Playwright saves a trace in `test-results/`. To open it, run
`pnpm exec playwright show-trace <path>`. To open the HTML report, run
`pnpm exec playwright show-report`. CI uploads both when the browser job fails.

## Test on a phone

To reach `pnpm dev` from a phone through ngrok, put the tunnel hostname in
`apps/docs/.env.local`. Leave out `https://` and the port. Then restart `pnpm dev`.

```dotenv
DEV_TUNNEL_HOST=your-tunnel.ngrok-free.dev
```

The dev app adds this hostname to the Next.js `allowedDevOrigins` setting, so the
dev WebSocket can connect through the tunnel. Without the hostname, the page can stay
on its server-rendered skeleton. Update the value when your tunnel hostname changes.
Git ignores `.env.local`.

## Edit only the root README

`prepack` generates the package README from the root `README.md`, and Git ignores the
generated copy. User guides live in the docs site, under `apps/docs/content/docs/`.
Maintainer docs live in `docs/`.

## Leave versions to Release Please

Don't bump package versions in a feature pull request. Release Please keeps a
release pull request open with the pending version and changelog. A maintainer merges
it when the release is ready. For publishing, recovery, the 1.0 transition, and
account setup, read [Releasing Data Griddle](docs/RELEASING.md).
