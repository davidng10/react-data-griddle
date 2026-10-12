# Contributing

Create a feature or fix branch from `main`, then open a pull request back to `main`.
There is no permanent `dev` branch. Use issues/milestones to plan a release's scope.

## Pull requests and commits

Use a Conventional Commit PR title. GitHub squash merges use the PR title as the
commit subject, which Release Please reads to choose the version and write release
notes. Keep each PR focused on one change and give it a useful, user-facing title.

```text
fix(keyboard): restore focus after editing
feat(columns): add visibility controls
feat(editing)!: change the commit callback arguments
docs: explain controlled selection
```

Accepted types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`,
`chore`, `style`, `revert`. The scope in parentheses is optional. Mark any breaking
change with `!` and describe the migration in the PR body. Scopes label an area;
they do not select a package or create a separate release.

While the package is below 1.0, fixes bump patch and features/breaking changes bump
minor. Documentation, tests, CI and routine maintenance normally do not trigger a
package release on their own. After 1.0, breaking changes bump major. The most
significant change in a batch determines its single version bump.

CI validates PR titles and runs tests, lint/types, formatting, the docs/demo checks,
and packed consumers. Local Husky hooks run lint-staged; CI remains authoritative.

## Local checks

Use Node 24 and the pnpm version in the root `packageManager` field.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm build:lib
pnpm test
pnpm lint
pnpm format:check
pnpm check:docs
pnpm check:reorder-indicator
pnpm check:consumers
```

## Releases

Do not bump package versions in feature PRs. Release Please maintains a release PR
with accumulated version/changelog changes. Maintainers merge it when the batch is
ready to ship. See [Releasing Data Griddle](docs/RELEASING.md) for publishing,
recovery, the deliberate 1.0 transition, and account configuration.
