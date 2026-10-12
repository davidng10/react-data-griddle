# Releasing Data Griddle

## Workflow

Feature/fix branches squash into `main`. GitHub Actions runs Release Please on
`main`, reading Conventional Commits and maintaining a release PR. Ordinary feature
merges do not publish. Merging the release PR creates a version tag and GitHub
Release, then validates the exact tagged commit and publishes its tested tarball.

The only publishable package is `packages/data-griddle`. The root workspace and
`apps/docs` remain private. The root `CHANGELOG.md` is maintained by Release Please;
it is excluded from Prettier because the generator owns its formatting.

- `ci.yml`: PR-title checks and reusable package verification. Supports explicit
  dispatch for the bot's release PR, since `GITHUB_TOKEN` PR events do not normally
  trigger another workflow.
- `verify.yml`: Node 24, repository-pinned pnpm, frozen installation, source tests,
  lint/types/formatting, docs checks, reorder checks and five packed consumers.
  Retains the exact tested tarball, `pack.json`, and `results.json` for 30 days.
- `release.yml`: Release Please, explicit release-PR CI dispatch, tagged-commit
  verification and npm trusted publishing. Publication is gated on successful
  verification. The published tarball is not rebuilt or repacked; its identity and
  SHA-512 integrity are checked before publication and compared with npm afterward.
  The tarball and evidence are also attached to the GitHub Release.

## Version policy

| Change                                 | Before 1.0           | From 1.0 onward      |
| -------------------------------------- | -------------------- | -------------------- |
| `fix:`                                 | Patch                | Patch                |
| `feat:`                                | Minor                | Minor                |
| Any type with `!` / `BREAKING CHANGE:` | Minor                | Major                |
| Routine docs/tests/CI/maintenance      | No release by itself | No release by itself |

`release-please-config.json` explicitly enables `bump-minor-pre-major` and disables
`bump-patch-for-minor-pre-major`. A batch gets one bump based on its most significant
change. `latest` is the default npm installation channel, not a stable-API promise.
Consumers needing predictable pre-1.0 upgrades should pin exact versions.

To deliberately release 1.0.0, include `Release-As: 1.0.0` as a footer in a merged
Conventional Commit (for example a readiness PR's squash commit), then review the
resulting release PR. See [Release Please's release override](https://github.com/googleapis/release-please#how-do-i-change-the-version-number).
This is a readiness decision, not a normal feature or breaking-change bump.

## One-time GitHub and npm setup

Repository: `davidng10/react-data-griddle` (the old `react-data-grid` URL redirects).

1. Enable Actions and **Allow GitHub Actions to create and approve pull requests**.
   The workflow requests only its job-specific permissions; approval of PR reviews
   is not used by this workflow.
2. Use squash merging, with **PR title** as the default squash commit title.
3. Protect `main`: require a PR and the `PR title` and `Verify / Package checks`
   checks, and require the branch to be current before merging. A sole maintainer
   need not require another person's approval. Do not bypass failing checks.
4. Create a GitHub environment named `npm`, restricted to `main`. No required
   reviewer is needed: merging the release PR is the publishing decision.
5. In the npm package's **Settings → Trusted Publisher**, select GitHub Actions:
   - Organization/user: `davidng10`
   - Repository: `react-data-griddle`
   - Workflow filename: `release.yml`
   - Environment: `npm`

No npm token or extra GitHub PAT is needed. Publishing uses GitHub-hosted runners,
Node 24, npm 11, and the publish job's `id-token: write` permission. The npm package
repository URL already matches this repository. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Maintainer release checklist

1. Review the generated version, changelog and any breaking-change migration notes.
2. Confirm CI passes and the release scope is ready. Automated Chromium checks do
   not establish a full browser, physical-device, or screen-reader support matrix.
   Review the [manual matrix](ACCESSIBILITY.md#manual-release-matrix) when applicable.
   Browser/mobile/assistive-technology coverage, license/example/dependency reviews
   and tracked-file/history review remain maintainer responsibilities; automation
   does not close the outstanding items recorded during initial release preparation.
3. Merge the release PR. Monitor the **Release** workflow through npm publication,
   integrity verification and release-evidence upload.
4. Verify a fresh registry installation in a consuming app, including the CSS
   import, rendering, selection and editing. Record any manual-device evidence.

For local touch smoke checks, run `pnpm check:touch` with `pnpm dev` in another
terminal. This remains separate from the automated CI suite.

## Failed releases and retries

A GitHub tag/release is created before npm publication. If verification or publishing
fails, that GitHub Release alone does not mean the package is available on npm.
Fix account configuration or transient infrastructure errors, then use **Re-run
failed jobs** on the original Release run so the original release outputs and SHA
are retained. Re-running the entire workflow may find no newly created release and
therefore skip publishing.

If npm accepted the package but a later step failed, do not republish it. Compare
`npm view data-griddle@VERSION dist.integrity` with `pack.json` from the retained
artifact and attach missing evidence using `gh release upload`. If verification
requires a shipped-code correction, release a new version. Never move a released
tag or try to overwrite an npm version. For a faulty public release, document the
issue and publish a correction; deprecate the affected version when appropriate.

## Published baseline and historical evidence

`data-griddle@0.1.0` was published on **2026-10-11**. The registry records integrity
`sha512-uxq4ZdC4PHYPlnk4imTybd9iQbbVQ8GEQFEcqu8WRK/eA9h02ReL4zz0oFSRtnvRaqumMgWrCqllOXG9w9NkSA==`.
The registry does not contain `gitHead`. On 2026-10-12, every file in its tarball
matched the rebuilt checkout at `7e8e9721730158e9faf3acf615002f343ce61cb7` byte-for-byte.
That commit is the Release Please bootstrap boundary; the manifest starts at
`0.1.0`. This verifies artifact equivalence, not the original publisher's provenance.

The 2026-10-11 preparation run passed 381 source tests, lint/type/format checks,
frozen-lockfile installation and all five isolated packed consumers. See
[package verification](PACKAGE_VERIFICATION.md) and [consumer fixtures](../fixtures/README.md).
Some manual coverage remained incomplete. The former `/verification/` route is
absent; use current checks rather than treating that historical route as evidence.
