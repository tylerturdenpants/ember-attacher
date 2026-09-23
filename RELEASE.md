# Release

This is a v2 Ember addon monorepo:

- `addon/` — the published `ember-attacher` package
- `test-app/` — private dummy app (not published)

Releases are automated with [release-it](https://github.com/release-it/release-it/) and
[release-it-pnpm](https://github.com/release-it-plugins/release-it-pnpm). Changelog grouping
uses [lerna-changelog](https://github.com/lerna/lerna-changelog/) labels on pull requests.
Background for the 4.1.0 train: [#1045](https://github.com/tylerturdenpants/ember-attacher/issues/1045).

Use **pnpm 12.5.1** (see `packageManager` in the repo-root `package.json`). Run the release
from `addon/`, not from the repo root and not from `test-app/`.

## Preparation

Confirm that every pull request merged since the last release has a
`lerna-changelog` label and a title that makes sense to users. See
[keepachangelog.com](https://keepachangelog.com/en/1.0.0/).

Labels:

* breaking — breaking change
* enhancement — new feature or enhancement
* bug — fix for a previous release
* documentation — docs only
* internal — internal change that still belongs in the notes

## Dist tags (4.1.0)

Current npm dist-tags at the start of this train:

```
latest → 3.3.0
beta   → 4.0.0
```

Publish **4.1.0** onto the default **latest** dist-tag. Leave **4.0.0** on **beta**.

Do **not**:

* `npm dist-tag add ember-attacher@4.0.0 latest`
* `release-it --preRelease=beta` (that maps the npm tag to `beta`)

After a correct 4.1.0 publish:

```
latest → 4.1.0
beta   → 4.0.0
```

Git tag and GitHub Release stay in lockstep with npm: tag `v${version}` (for this train,
`v4.1.0`) and a full GitHub Release (not a prerelease).

## Release

From the repo root:

```bash
pnpm install
cd addon
pnpm release
```

When prompted, choose **4.1.0** (stable, not a pre-release). Confirm the npm dist-tag is
`latest` and the git tag is `v4.1.0`.

The maintainer runs npm OTP locally when 2FA prompts. For non-interactive publish, set a
granular `NPM_TOKEN` with **Bypass 2FA** and `GITHUB_TOKEN` with Contents: write (local
release-it GitHub Release) or rely on Actions `GITHUB_TOKEN` with `contents: write`.

Do not publish from `test-app/`. `test-app/package.json` is `"private": true`.

[release-it](https://github.com/release-it/release-it/) prompts for the version, then
creates the git tag `v${version}`, the GitHub Release, and runs:

```
pnpm -r publish --access public --no-git-checks --tag $tag
```

`$tag` must be `latest` for 4.1.0.

Dry-run first (does not publish, tag, or create a GitHub Release):

```bash
cd addon
pnpm release 4.1.0 --dry-run
```

## Verify

```bash
npm dist-tag ls ember-attacher
# latest: 4.1.0
# beta: 4.0.0

git ls-remote --tags origin v4.1.0
gh release view v4.1.0
```
