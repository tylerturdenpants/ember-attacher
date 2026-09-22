# Release train without repo admin

Research for [#1045](https://github.com/tylerturdenpants/ember-attacher/issues/1045). Snapshot date: 2026-09-22. No tokens created, no workflows added.

## Verdict

**Maintainer `pzubar` can run the 4.1.0 lockstep train alone.** GitHub write + npm package owner is enough for npm `latest`, a git tag, and a GitHub Release. Repo admin is not required.

**Do not promote `4.0.0` to `latest`.** Publish `4.1.0` onto the default `latest` dist-tag. Leave `beta` pointing at `4.0.0`.

Two viable paths, in preference order:

1. **Local release-it + OTP + GitHub Release** — matches how 4.0.0 was published, plus the GitHub half that was skipped. No GitHub Actions secrets. One human 2FA challenge on npm.
2. **GitHub Actions with npm trusted publishing (OIDC)** — no `NPM_TOKEN` secret. Workflow needs `contents: write` and `id-token: write`. Maintainer configures the trusted publisher on npmjs.com.

An Actions workflow that only has `NPM_TOKEN` + `GITHUB_TOKEN` also works, but it is the worse option: classic npm tokens are gone, write granular tokens need Bypass 2FA, and those direct-publish tokens are being deprecated.

## Snapshot (this repo, this date)

| Fact | Value | Source |
| --- | --- | --- |
| GitHub owner | `tylerturdenpants` (role `admin`) | `GET /repos/tylerturdenpants/ember-attacher` |
| Maintainer GitHub role | `pzubar`: `write` (`admin: false`, `maintain: false`, `push: true`, `triage: true`) | `GET /repos/.../collaborators/pzubar/permission` |
| Repo type | User-owned, not an org (`isInOrganization: false`) | GraphQL `repository.isInOrganization` |
| Default branch | `master` | repo API |
| Branch protection / rulesets | None on `master` or `v2-migration` | `GET .../branches/*/protection` 404; `GET .../rulesets` `[]` |
| Actions secrets | **None** (`total_count: 0`) | `GET .../actions/secrets` |
| Workflows | CI only (`.github/workflows/ci.yml`); Dependabot | `GET .../actions/workflows` |
| npm `latest` | `3.3.0` (publisher `pzubar`, 2025-07-17) | `npm view ember-attacher dist-tags` |
| npm `beta` | `4.0.0` (publisher `pzubar`, 2025-12-23) | same |
| npm owners | `rwwagner90`, `tylerturdenpants`, `luketheobscure`, **`pzubar`** | `npm owner ls ember-attacher` |
| GitHub Releases | Stop at **`v3.2.0`** (marked Latest) | `gh release list` |
| Git tags | Stop at **`v4.0.0-beta.1`**. No `v3.3.0`, no `v4.0.0`. | `git ls-remote --tags origin` |

4.0.0 reached npm because `pzubar` is an npm owner. It missed the GitHub Release and the `v4.0.0` tag because `v2-migration` release-it is configured to skip GitHub releases (see below).

## Why 4.0.0 is only on npm

`master` (`601cb0d`) still has GitHub releases on:

```json
"github": { "release": true }
```

in root [`package.json`](https://github.com/tylerturdenpants/ember-attacher/blob/601cb0dc2b587a950bc1e18826d42217084eba45/package.json#L97-L109) (`release-it` ~15, `@release-it-plugins/lerna-changelog`).

`v2-migration` (`7e3246d`) moved config to [`addon/.release-it.json`](https://github.com/tylerturdenpants/ember-attacher/blob/7e3246d8d91812d8b1062192c019e8dc031e4003/addon/.release-it.json):

```json
{
  "git": { "tagName": "v${version}" },
  "github": { "release": false, "web": true },
  "plugins": {
    "release-it-pnpm": {
      "publishCommand": "pnpm -r publish --access public --no-git-checks --tag $tag --otp $OTP"
    }
  }
}
```

`github.release: false` skips the GitHub step entirely (`web: true` never runs). The publish command is **interactive OTP** (`--otp $OTP`) and takes whatever npm dist-tag release-it supplies as `$tag`. `test-app/package.json` is `"private": true`, so `pnpm -r publish` does not publish the dummy app.

`addon/package.json` is already `"version": "4.0.0"`. The 4.1.0 train starts from this file, not from master's `"version": "3.2.0"`.

## Owner vs maintainer

### Maintainer can do alone (`pzubar`)

GitHub **Write** includes: push tags, create/edit releases, create/run workflows, create/update/delete Actions secrets (UI and REST API). ([Repository roles](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization#permissions-for-each-role); [Create a release](https://docs.github.com/en/rest/releases/releases#create-a-release) — "Users with push access to the repository can create a release"; [Using secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) — personal-account repo: collaborator; REST: "collaborator access".)

npm **owner** includes: `npm publish`, dist-tags, and configuring a trusted publisher. ([npm-owner](https://docs.npmjs.com/cli/v12/commands/npm-owner/): one access level; [Trusted publishing](https://docs.npmjs.com/trusted-publishers/).)

Concretely, without the owner:

- Push `v4.1.0` and create GitHub Release `v4.1.0` (UI, `gh release create`, or release-it with `GITHUB_TOKEN`).
- Publish `ember-attacher@4.1.0` to npm as `latest` with interactive 2FA.
- Add `.github/workflows/*.yml` requesting `permissions: { contents: write, id-token: write }`. Write collaborators may raise `GITHUB_TOKEN` scopes via the workflow `permissions` key even if the repo default is read-only. ([Managing GitHub Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository): "Anyone with write access to a repository can modify the permissions granted to the `GITHUB_TOKEN` … by editing the `permissions` key".)
- Create GitHub Actions repository secret `NPM_TOKEN` (`gh secret set NPM_TOKEN`) if that path is chosen. This repo currently has **zero** Actions secrets; write can list names and fetch the public key (verified this session).
- On npmjs.com: add a GitHub Actions trusted publisher for `ember-attacher` (`npm trust` / Settings → Trusted publishing).
- Mint an npm granular token on **pzubar's** npm account, scoped to package `ember-attacher`.
- Mint a GitHub PAT on **pzubar's** GitHub account for local release-it (not a repo secret).

### Owner must click (`tylerturdenpants`)

Nothing is required for 4.1.0 lockstep.

Owner-only if we later want repo *settings* that Write cannot change ([repository roles](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization): "Change a repository's settings" is Admin):

- Default `GITHUB_TOKEN` workflow permissions (Actions → General). A workflow `permissions:` block still overrides per-job. 403 from `GET .../actions/permissions` as write confirms this setting is admin-only.
- Environment protection (required reviewers). Environment secrets on a personal-account repo are owner-only. ([Using secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets): "To create secrets … for an environment in a personal account repository, you must be the repository owner.")
- Branch/tag protection, rulesets, transferring the repo, granting Admin.

Optional owner gesture, not a blocker: grant `pzubar` Admin so they can see Actions policy without `gh`. Not needed to ship 4.1.0.

## Token names (not values)

Create none of these in this research. Names only.

| Name | Who creates it | Type / scopes | Where it lives | Needed? |
| --- | --- | --- | --- | --- |
| `GITHUB_TOKEN` | GitHub Actions (automatic) | Job token; raise with `permissions.contents: write` (tags + releases) and `permissions.id-token: write` (OIDC). Default env var name release-it reads (`github.tokenRef`). | `${{ secrets.GITHUB_TOKEN }}` | Yes for any Actions GitHub Release. Not a repo secret you add. |
| `GH_TOKEN` | GitHub CLI convention | Same as above when using `gh` in a workflow (`env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`). | Workflow env | Only if the step uses `gh` rather than release-it. |
| Local `GITHUB_TOKEN` | Maintainer, GitHub PAT | **Fine-grained:** resource `tylerturdenpants/ember-attacher`, **Contents: Read and write** (covers `POST /repos/{owner}/{repo}/releases`). **Classic:** `public_repo` is enough on this public repo; release-it docs still say [`repo`](https://github.com/release-it/release-it/blob/main/docs/github-releases.md). No admin scopes. | Maintainer shell / `~/.profile` / `.env` (gitignored). Never commit. | Yes for **local** `github.release: true`. Not needed if using `gh release create` with existing `gh auth`. |
| `NPM_TOKEN` | Maintainer, npmjs.com | **Granular access token only** (classic tokens revoked 2025-11-19). Packages: `ember-attacher`. Permissions: **Read and write (publish and stage)**. **Bypass 2FA: checked** for non-interactive CI. Expiration: as short as the current npm cap (write tokens have been capped; GitHub is moving toward 7-day publish tokens). | GitHub Actions secret `NPM_TOKEN` (release-it) or `NODE_AUTH_TOKEN` (`actions/setup-node` registry auth). | Only if publishing from Actions **without** trusted publishing. |
| *(none)* | — | Trusted publishing uses a short-lived OIDC token. No npm write token. | npm package Settings → Trusted Publisher | Preferred for Actions. |

Do not create classic npm tokens. They are gone. ([About access tokens](https://docs.npmjs.com/about-access-tokens/): "As of November 2025, only Granular access tokens are supported.")

Bypass 2FA on a granular token is **unchecked by default**. CI `npm publish` without an OTP fails unless Bypass 2FA is on, or the publish is trusted-publishing / staged. Direct Bypass-2FA publish is being deprecated (January 2027). ([About access tokens](https://docs.npmjs.com/about-access-tokens/); [security update](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/).)

## Is Actions + secrets enough?

**GitHub half: yes, with no extra secret.** `permissions: contents: write` on a workflow in this repo is enough for `git tag` / `git push` of the tag and `POST /repos/.../releases`. Pass `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` into release-it. On Actions, set `github.skipChecks: true` (the job token is not a user, so collaborator checks fail). ([release-it GitHub releases](https://github.com/release-it/release-it/blob/main/docs/github-releases.md); [CI](https://github.com/release-it/release-it/blob/main/docs/ci.md).)

**npm half: a secret is not required, and is the worse option.**

| Actions npm auth | Extra GitHub secret | Workflow perms | 2FA | Provenance |
| --- | --- | --- | --- | --- |
| Trusted publishing (OIDC) | None | `id-token: write` + `contents: write` | N/A (OIDC) | Automatic on public repo + GitHub-hosted runner. No `--provenance`. npm CLI ≥ 11.5.1, Node ≥ 22.14. |
| Granular `NPM_TOKEN` + Bypass 2FA | `NPM_TOKEN` | `contents: write`; add `id-token: write` if using `--provenance` | Bypassed by token | Only if you also set `--provenance` / `NPM_CONFIG_PROVENANCE=true`. Still needs a write token. |
| Granular stage-only token | `NPM_TOKEN` | `contents: write` | Maintainer runs `npm stage approve --otp` after CI | Stage is not live until approve |

Trusted publisher form fields (must match exactly; npm does not validate on save):

- Organization or user: `tylerturdenpants`
- Repository: `ember-attacher`
- Workflow filename: e.g. `release.yml` (filename only, with `.yml`)
- Environment: omit unless the owner later adds one
- Allowed action: `npm publish` (or stage-only if we want a second human gate)

Then in release-it: `"npm": { "skipChecks": true }`. Do **not** set `NODE_AUTH_TOKEN`. ([release-it npm trusted publishing](https://github.com/release-it/release-it/blob/main/docs/npm.md); [Trusted publishing](https://docs.npmjs.com/trusted-publishers/).)

Caveats for the Actions path (not blockers):

- The workflow file must exist on the default branch **before** the first OIDC publish, and the filename must match the npm config.
- `GITHUB_TOKEN` pushes do not start other workflows. Tag-triggered CI will not run if the same token created the tag. Acceptable for lockstep; use a PAT secret only if we need that extra CI.
- If the release commit touches `.github/workflows/`, creating the GitHub Release may require the `workflow` scope / Workflows permission. Avoid mixing workflow edits into the release commit. ([Create a release](https://docs.github.com/en/rest/releases/releases#create-a-release).)
- `pnpm -r publish --tag $tag` must receive `latest` for 4.1.0, not `beta`.

## Dist-tag strategy (do not promote 4.0.0)

Current:

```
latest → 3.3.0
beta   → 4.0.0
```

`npm publish` without `--tag` sets `latest` to the new version. `npm install ember-attacher` follows `latest`. ([npm-dist-tag](https://docs.npmjs.com/cli/v10/commands/npm-dist-tag): "Publishing a package sets the `latest` tag to the published version unless the `--tag` option is used.")

For 4.1.0:

| Do | Do not |
| --- | --- |
| Publish **4.1.0** (stable, no pre-release id) so the default tag is `latest`. | `npm dist-tag add ember-attacher@4.0.0 latest` |
| Explicit `--tag latest` / release-it `--npm.tag=latest` if the command line might still carry `beta`. | Re-run the 4.0.0 command (`--tag $tag` while `$tag` is `beta`) for 4.1.0 |
| Leave `beta` on 4.0.0 (or `npm dist-tag rm ember-attacher beta` later). | `release-it --preRelease=beta` (that maps npm tag to `beta`) |

release-it: default npm tag is `latest`; `--preRelease=beta` sets the npm tag to `beta` unless `--npm.tag` overrides. ([release-it npm tags](https://github.com/release-it/release-it/blob/main/docs/npm.md).)

The current v2-migration publish line is `--tag $tag`. For 4.1.0, `$tag` must be `latest`. Confirm in the dry-run before the real publish.

After a correct 4.1.0 publish:

```
latest → 4.1.0
beta   → 4.0.0   (unchanged)
```

3.x apps `npm install ember-attacher` then get 4.1.0. Anyone pinning `ember-attacher@beta` still gets 4.0.0.

GitHub Release: publish `v4.1.0` as a **full** release (not prerelease) so it becomes GitHub "Latest", replacing `v3.2.0`. (`make_latest` defaults to true for new full releases.)

## Recommended 4.1.0 procedure (maintainer, no owner)

Research only — do not run this here.

1. On the 4.1.0 branch: set `addon/.release-it.json` `github.release` to `true`. Drop sole reliance on `github.web`. Keep `tagName: "v${version}"`.
2. Dry-run: `pnpm exec release-it 4.1.0 --dry-run` from `addon/`. Confirm npm tag `latest`, git tag `v4.1.0`, GitHub release on.
3. Local: `export GITHUB_TOKEN=…` (fine-grained Contents: write, or `gh auth token` if that token can create releases). Interactive npm 2FA / OTP when prompted. Do not pass `--preRelease`.
4. Verify: `npm dist-tag ls ember-attacher` → `latest: 4.1.0`, `beta: 4.0.0`; `git ls-remote --tags origin v4.1.0`; `gh release view v4.1.0`.

If moving the train onto Actions later: land the workflow first, then add the trusted publisher on npmjs.com, then delete any `NPM_TOKEN` secret. Do not add Bypass-2FA tokens unless trusted publishing is blocked.

## Sources

- npm: [About access tokens](https://docs.npmjs.com/about-access-tokens/), [Creating and viewing access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens), [Trusted publishing](https://docs.npmjs.com/trusted-publishers/), [Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements), [npm-dist-tag](https://docs.npmjs.com/cli/v10/commands/npm-dist-tag), [npm-owner](https://docs.npmjs.com/cli/v12/commands/npm-owner/), [npm-trust](https://docs.npmjs.com/cli/v12/commands/npm-trust/), [Classic tokens revoked](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/), [Trusted publishing GA](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- GitHub: [Repository roles (Write: releases + Actions secrets)](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization), [Using secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [Secret types](https://docs.github.com/en/code-security/reference/secret-security/secret-types), [Create a release](https://docs.github.com/en/rest/releases/releases#create-a-release), [Workflow `permissions`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Managing Actions settings / GITHUB_TOKEN defaults](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [Fine-grained PAT Contents → releases](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
- release-it: [GitHub releases](https://github.com/release-it/release-it/blob/main/docs/github-releases.md), [npm / trusted publishing](https://github.com/release-it/release-it/blob/main/docs/npm.md), [CI](https://github.com/release-it/release-it/blob/main/docs/ci.md)
- This repo: `origin/master` `package.json` release-it block; `origin/v2-migration` `addon/.release-it.json`, `addon/package.json`, `.github/workflows/ci.yml`
