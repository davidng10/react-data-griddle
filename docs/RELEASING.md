# Releasing Data Griddle

## Workflow

Feature and fix branches are squash-merged into `main`. On `main`, GitHub Actions runs Release
Please, which reads the Conventional Commit messages and keeps a release PR up to date. Merging a
feature does not publish anything. Merging the release PR creates a version tag and a GitHub
Release, verifies the tagged commit, and publishes the tarball that verification tested.

`packages/data-griddle` is the only published package. The root workspace and `apps/docs` are
private. Release Please writes the root `CHANGELOG.md`, so Prettier ignores that file.

- `ci.yml` checks PR titles and runs package verification. The release workflow dispatches it on
  the bot's release PR, because PR events created with `GITHUB_TOKEN` don't trigger other workflows.
- `verify.yml` runs four parallel jobs, each installing with Node 24 and the repository's pinned
  pnpm from the frozen lock file: static checks (build, lint, types, format), unit tests, browser
  checks (the Playwright suite in `e2e/`: touch gestures, editing, reorder indicator), and
  the five packed consumers. Every job checks out the same commit. The consumers job keeps the
  tested tarball, `pack.json`, and `results.json` for 30 days. An `All checks` job fails unless
  all four succeed.
- `release.yml` runs Release Please, dispatches CI on the release PR, verifies the tagged commit,
  and publishes to npm with trusted publishing. It only publishes if verification passes. It
  publishes the tested tarball without rebuilding it, checks its name and SHA-512 integrity before
  publishing, and compares them with npm afterwards. It also attaches the tarball and check results
  to the GitHub Release.

## Version policy

| Change                                 | Before 1.0           | From 1.0 onward      |
| -------------------------------------- | -------------------- | -------------------- |
| `fix:`                                 | Patch                | Patch                |
| `feat:`                                | Minor                | Minor                |
| Any type with `!` / `BREAKING CHANGE:` | Minor                | Major                |
| Routine docs/tests/CI/maintenance      | No release by itself | No release by itself |

`release-please-config.json` sets `bump-minor-pre-major` to true and
`bump-patch-for-minor-pre-major` to false. Each release gets one bump, set by its most significant
change. `latest` is npm's default install tag and says nothing about API stability, so consumers
who want predictable upgrades before 1.0 should pin exact versions.

To release 1.0.0, add a `Release-As: 1.0.0` footer to a Conventional Commit, such as the squash
commit of the PR that gets the library ready. Merge it, then review the release PR that follows. See
[Release Please's release override](https://github.com/googleapis/release-please#how-do-i-change-the-version-number).
Going to 1.0 is a decision you make on purpose. A breaking change alone won't trigger it.

## One-time GitHub and npm setup

The repository is `davidng10/react-data-griddle`. The old `react-data-grid` URL redirects to it.

1. Enable Actions and turn on **Allow GitHub Actions to create and approve pull requests**. The
   workflow only needs this to create PRs. It never approves reviews, and each job requests only the
   permissions it needs.
2. Use squash merging, with **PR title** as the default squash commit title.
3. Protect `main`. Require a PR, require the `PR title` and `Verify / All checks` checks, and
   require branches to be up to date before merging. A sole maintainer doesn't need to require a
   second approval. Don't bypass failing checks.
4. Create a GitHub environment named `npm` and restrict it to `main`. It doesn't need a required
   reviewer, because merging the release PR is the decision to publish.
5. In the npm package's **Settings → Trusted Publisher**, select GitHub Actions and set:
   - Organization/user: `davidng10`
   - Repository: `react-data-griddle`
   - Workflow filename: `release.yml`
   - Environment: `npm`
   - Allow `npm publish`: enabled
   - Allow `npm dist-tag`: disabled. The workflow sets `latest` when it publishes and never
     changes tags on existing versions.

You don't need an npm token or a GitHub PAT. Publishing runs on GitHub-hosted runners with Node 24,
npm 11, and the publish job's `id-token: write` permission. The repository URL in the package
already matches this repository. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Maintainer release checklist

1. Review the version, changelog, and any migration notes for breaking changes in the release PR.
2. Confirm that CI passes and the release is ready to ship. CI only runs Chromium, so work through
   the [manual matrix](ACCESSIBILITY.md#manual-release-matrix) when a change affects browsers,
   mobile, or assistive technology. CI also doesn't review licenses, examples, dependencies, or
   tracked files and history. You have to check those yourself, and the gaps found when preparing
   0.1.0 are still open.
3. Merge the release PR. Watch the **Release** workflow until it has published to npm, checked
   integrity, and uploaded the results.
4. Install the new version from the registry in a fresh app and check the CSS import, rendering,
   selection, and editing. Write down the results of any testing on physical devices.

To run the browser checks locally, including touch, run `pnpm test:e2e`. It builds and serves the
scenario pages itself.

## Failed releases and retries

The workflow creates the GitHub tag and release before it publishes to npm, so a GitHub Release on
its own doesn't mean the package is on npm. If verification or publishing fails, fix the account
setting or wait out the infrastructure error. Then click **Re-run failed jobs** on the original
Release run, which keeps that run's release outputs and commit SHA. Re-running the whole workflow
finds no newly created release and skips publishing.

If npm accepted the package but a later step failed, don't publish it again. Compare
`npm view data-griddle@VERSION dist.integrity` with `pack.json` from the run's artifacts, and attach
any missing files with `gh release upload`. If the shipped code needs a fix, release a new version.
Never move a release tag or try to overwrite a version on npm. If a public release is broken,
document the problem, publish a fix, and deprecate the broken version if needed.

## Published 0.1.0

`data-griddle@0.1.0` was published on 2026-10-11 with integrity
`sha512-uxq4ZdC4PHYPlnk4imTybd9iQbbVQ8GEQFEcqu8WRK/eA9h02ReL4zz0oFSRtnvRaqumMgWrCqllOXG9w9NkSA==`.
The registry entry has no `gitHead`. On 2026-10-12, every file in the tarball matched a rebuild of
`7e8e9721730158e9faf3acf615002f343ce61cb7` byte for byte. Release Please starts its history at that
commit, with the manifest at `0.1.0`. The match shows the tarball is the same as that build. It
doesn't prove who published it.

The test results from the 0.1.0 release are in [package verification](PACKAGE_VERIFICATION.md).
Some manual coverage was still incomplete at release.
