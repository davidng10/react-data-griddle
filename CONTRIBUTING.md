# Contributing

Create a feature or fix branch from `main`, then open a pull request back to `main`.
There is no long-lived `dev` branch. Plan what goes into a release with issues and milestones.

## Pull requests and commits

Use a Conventional Commit PR title. GitHub squash merges use the PR title as the
commit subject, which Release Please reads to choose the version and write release
notes. Keep each PR to one change, and write the title for users, since it becomes the changelog entry.

```text
fix(keyboard): restore focus after editing
feat(columns): add visibility controls
feat(editing)!: change the commit callback arguments
docs: explain controlled selection
```

Accepted types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`,
`chore`, `style`, `revert`. The scope in parentheses is optional. Mark a breaking
change with `!` and describe the migration in the PR body. A scope only labels the
area of the change. It doesn't pick a package or create a separate release.

Before 1.0, fixes bump the patch version, and features and breaking changes bump
the minor version. From 1.0, breaking changes bump the major version. Docs, tests,
CI, and maintenance changes don't trigger a release on their own. Each release gets
one bump, set by its most significant change.

CI checks the PR title and runs four verification jobs in parallel. Each has a local
equivalent:

| CI job           | Local command           | Covers                                             |
| ---------------- | ----------------------- | -------------------------------------------------- |
| Static checks    | `pnpm verify:static`    | build, ESLint, library/app/fixture types, Prettier |
| Unit tests       | `pnpm verify:unit`      | Vitest (Node, jsdom and SSR projects)              |
| Browser checks   | `pnpm verify:e2e`       | docs export, touch gestures, reorder indicator     |
| Packed consumers | `pnpm verify:consumers` | real tarballs in isolated Vite/Next consumers      |

`pnpm verify` runs all four in sequence. Husky runs lint-staged on commit, but only CI
decides whether a PR can merge.

## Local development

Use Node 24 and the pnpm version in the root `packageManager` field.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm dev                      # library watch + single-grid Next.js app
pnpm build:lib                # ESM library only
pnpm build                    # ESM library + static single-grid app
pnpm test                     # source regressions
pnpm lint                     # ESLint + library/app/fixture types
pnpm format:check
pnpm check:package            # build + artifact contract
pnpm check:docs
pnpm check:reorder-indicator
pnpm check:consumers          # real tarballs in isolated Vite/Next consumers
pnpm check:touch              # Chromium touch gestures; requires pnpm dev in another terminal
pnpm verify                   # everything CI runs
```

`pnpm dev` serves one editable grid at `/`. See [INTERNALS.md](INTERNALS.md) for the
rendering model and performance constraints.

Edit only the root `README.md`. `prepack` generates the package README from it, and
Git ignores the generated copy.

### Testing on a phone

To test on a phone through ngrok, put the tunnel hostname (without `https://` or a
port) in `apps/docs/.env.local`, then restart `pnpm dev`:

```dotenv
DEV_TUNNEL_HOST=your-tunnel.ngrok-free.dev
```

The dev app adds this hostname to Next.js `allowedDevOrigins` so the dev WebSocket
can connect through the tunnel. Without it, the page can stay stuck on its
server-rendered skeleton. Update the value when your tunnel hostname changes. Git
ignores `.env.local`.

## Releases

Don't bump package versions in feature PRs. Release Please keeps a release PR open
with the pending version and changelog changes, and a maintainer merges it when the
release is ready. See [Releasing Data Griddle](docs/RELEASING.md) for publishing,
recovery, the deliberate 1.0 transition, and account configuration.
