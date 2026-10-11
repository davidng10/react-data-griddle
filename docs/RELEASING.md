# Releasing Data Griddle

## Initial release contract

- Package: `data-griddle@0.1.0`, public npm registry, `latest` tag.
- Status: preparation only; not yet published. `latest` is the default install channel,
  not a stable-API promise. Consumers should pin the exact version.
- Repository: <https://github.com/davidng10/react-data-griddle> (already public).
- Documentation: README and repository Markdown guides. No dedicated docs site or hosted demo required.
- Scope: the features and limitations in [0.1.0 release notes](../CHANGELOG.md).

## Remaining gates

- [x] Choose version/channel, update metadata and installation instructions, and draft release notes.
- [x] Keep the workspace/app private; make only the library publishable.
- [x] Build and check the library during `npm pack` using `prepack`.
- [ ] Complete or explicitly narrow the promised browser/mobile/assistive-technology coverage.
      The [manual matrix](./ACCESSIBILITY.md#manual-release-matrix) is still open. Source semantics,
      Chromium automation and maintainer-confirmed iPhone gestures are separate evidence; none is a
      full support certification. Minimum browser/OS versions have not been established.
- [ ] Review licenses, examples and dependency redistribution requirements, and complete the
      outstanding tracked-file/history review. The tarball allowlist alone does not cover these.
- [ ] Confirm the publishing account, name availability and authentication. On 2026-10-11,
      `data-griddle` returned registry 404 and this machine was not authenticated; neither reserves a name.
- [ ] Finalize the changelog date and README publication wording, commit the intended release,
      run the checks below and retain
      the exact tarball, its integrity, commit ID and verification results together.
- [ ] Push the reviewed release commit to the public repository and check that the package README
      links resolve, including the new changelog and release guide.
- [ ] Review and explicitly authorize publication of that artifact.
- [ ] Publish, verify a fresh registry installation, then tag the tested commit and publish release notes.

The former local checklist marked `/verification/` complete, but that route and its smoke script
are absent from this checkout. Use the existing [packed consumers](../fixtures/README.md) and
add missing scenarios before claiming coverage; do not count the missing fixture as evidence.

Deferred beyond 0.1.0: docs website/hosted demo, automated CI/publishing, contributor templates,
extensive performance benchmarks, source-registry distribution and keyboard column resize/reorder.
These deferrals do not close the manual verification gate above. No new runtime feature is required
by this release-preparation task.

## Preparation evidence (2026-10-11)

The working tree based on `4574e61`, with the 0.1.0 preparation changes, passed 381 source tests,
lint/type/format checks, frozen-lockfile installation and all five isolated packed consumers.
The consumers installed `data-griddle@0.1.0`. The preceding audit also passed the production/basic-demo
and seven drop-indicator checks. See [package verification](./PACKAGE_VERIFICATION.md).
This records preparation evidence, not completion of the remaining gates or a published release.

## Validate and retain the artifact

From a clean checkout of the intended release commit, use pnpm 10.33.0. The recorded verification
environment uses Node 25.9.0; a minimum contributor Node version is not established.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
pnpm lint
pnpm format:check
pnpm check:docs
pnpm check:reorder-indicator
pnpm check:consumers
git rev-parse HEAD
git status --short
```

Run `pnpm check:touch` with `pnpm dev` in another terminal for the additional Chromium touch
smoke check. Record physical-device and assistive-technology results separately.

`check:consumers` builds and packs the library and tests that tarball in all five isolated
consumers. It prints an `Isolated consumers:` directory containing `data-griddle-0.1.0.tgz`,
`pack.json`, `results.json`, logs and screenshots. Copy the directory to durable release storage;
OS temporary storage is not a release archive. Inspect the tarball allowlist and record its
SHA-512 integrity from `pack.json`. If any shipped file changes, rerun the matrix and use the new
artifact. Do not repack between final verification and publication.

## Publish manually — only after the gates above

Authenticate using the publishing account and confirm it with:

```bash
npm whoami --registry=https://registry.npmjs.org/
```

Follow [npm's authentication requirements](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/).
The following commands use the retained, tested tarball; replace the absolute path with its real
location. The dry run does not prove account permissions or reserve the package name.

```bash
npm publish /absolute/path/to/data-griddle-0.1.0.tgz --dry-run --access public --tag latest --registry=https://registry.npmjs.org/
# Actual publication, after explicit release approval:
npm publish /absolute/path/to/data-griddle-0.1.0.tgz --access public --tag latest --registry=https://registry.npmjs.org/
```

Do not publish the workspace root or all workspaces. Publishing a tarball uploads the artifact
already tested; see [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

After publication:

1. Check `npm view data-griddle@0.1.0 version dist.integrity --registry=https://registry.npmjs.org/`
   and compare the integrity with the retained artifact; check that `latest` points to `0.1.0`.
2. In a fresh React application, follow the README's npm installation and CSS instructions.
   Verify rendering, selection and editing with the registry version.
3. Tag the exact tested commit `v0.1.0` and publish the changelog entry as release notes.
4. Record the publication date, commit, integrity and post-publication result here.

If a release is faulty, document the issue and publish a corrected version. Where needed, deprecate
the affected version with a specific explanation; do not attempt to overwrite an existing version.
See [npm deprecation guidance](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/).
