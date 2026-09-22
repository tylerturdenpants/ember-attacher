# Why Convert addon to V2 format CI fails

Research for [issue #1041](https://github.com/tylerturdenpants/ember-attacher/issues/1041). Base: `origin/v2-migration` @ `7e3246d` (“Updates to version 4.0.0 and add SCSS handling”). PR: [#1022](https://github.com/tylerturdenpants/ember-attacher/pull/1022). Failed run: [20464714999](https://github.com/tylerturdenpants/ember-attacher/actions/runs/20464714999) (2025-12-23).

This note is findings only. It does not change `v2-migration`.

## Answer

**Tests** and **Floating Dependencies** both die at `pnpm install` (~8–9s) because GitHub Actions sets `CI=true`, pnpm 9 then uses `--frozen-lockfile` by default, and `test-app/package.json` disagrees with `pnpm-lock.yaml` on `ember-attacher`.

- Manifest: `"ember-attacher": "4.0.0"` (`test-app/package.json`).
- Lockfile: `specifier: workspace:*` / `version: link:../addon` (`pnpm-lock.yaml`).

That is the entire 8-second failure. Logs for run 20464714999 are HTTP 410; the same command locally with Node 20 + pnpm 9 + `CI=true` reproduces `ERR_PNPM_OUTDATED_LOCKFILE` in ~8s.

`try-scenarios` is skipped because `needs: "test"` (`.github/workflows/ci.yml`).

Unblocking install is not enough for a *true* green against this PR’s v2 addon. After aligning the workspace protocol, `pnpm lint` passes, then `cd test-app && pnpm test` fails because `addon/dist` is not built, and after a manual `pnpm --filter ember-attacher build` webpack still cannot resolve `ember-attacher` → `./dist/index.js`. Tests import `{ isVisible } from 'ember-attacher'`, but Rollup never emits `dist/index.js` and `addon/src/index.js` is `export {}`.

The smallest change set that turns **Tests** and **Floating Dependencies** green *while testing the local v2 package*, without touching the 3.x component contract (nested `<AttachPopover>` / `<AttachTooltip>`, args, events, CSS class names, `environment.js`):

1. `test-app/package.json`: `"ember-attacher": "workspace:*"` (lockfile already has this; no lockfile edit).
2. `addon/package.json`: add `"prepare": "pnpm run build"` so `pnpm install` produces `addon/dist`.
3. `addon/rollup.config.mjs`: add `'index.js'` to `publicEntrypoints`.
4. `addon/src/index.js`: `export { isVisible } from './test-support/is-visible';` instead of `export {}`.

Do **not** “fix” CI with `--no-frozen-lockfile`. Locally that installs **npm `ember-attacher@4.0.0`**, not the workspace addon. Earlier greens on this PR did the v1 equivalent: they tested registry `ember-attacher@3.2.0`.

## Sources

| Claim | Source |
| --- | --- |
| Failed jobs, 8s / 9s, `try-scenarios` skipped | `gh pr checks 1022`; `gh run view 20464714999`; check rollup `startedAt`/`completedAt` 15:26:14–15:26:22/23Z |
| Logs gone | `gh run view 20464714999 --log-failed` → HTTP 410; `GET .../jobs/58805466679/logs` → 410 |
| Workflow: pnpm 9, Node 20, `pnpm install` then lint/test | `.github/workflows/ci.yml` on `v2-migration` |
| Frozen lockfile default in CI | [pnpm install --frozen-lockfile](https://pnpm.io/cli/install#--frozen-lockfile): CI default `true` if a lockfile is present |
| Specifier mismatch | `test-app/package.json` vs `pnpm-lock.yaml` importer `test-app` |
| Introduced in HEAD | `git show 7e3246d` (version 4.0.0 + lockfile `workspace:*`) |
| Last green SHA is not HEAD | run 20458702351 head `9b131e08` (“Release 4.0.0-beta.3”), not on current PR tip |
| Reproduction | Node `v20.20.2`, pnpm `9.15.9`, worktree `/tmp/ember-attacher-research-v2-ci` |

## What CI ran

`.github/workflows/ci.yml`:

- **Tests** (`test`): checkout → `pnpm/action-setup@v4` `version: 9` → `actions/setup-node@v4` `node-version: 20.x` `cache: pnpm` → `pnpm install` → `pnpm lint` → `working-directory: test-app` `pnpm test`.
- **Floating Dependencies** (`floating`): same install, then `test-app` `pnpm test`. No `--no-lockfile`. It is not a floating-deps job; it is a second copy of the locked install + tests, minus lint.
- **try-scenarios**: `needs: "test"`. Skipped when Tests fails.

Run 20464714999 annotations: `Process completed with exit code 1` on path `.github` line 14 (`concurrency:`). That is a workflow-level failure marker, not a unique source line. Job payloads from the API now have `"steps": []` (step details expired with the logs).

Wall clock: Tests 8s, Floating 9s, total run 14s. Checkout + pnpm + Node setup consume that window; `pnpm install` never gets past lockfile validation.

## Reproduction (Node 20, pnpm 9)

```text
node v20.20.2
pnpm 9.15.9
CI=true pnpm install
```

Output (trimmed):

```text
Scope: all 3 workspace projects
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/test-app/package.json

Note that in CI environments this setting is true by default. If you still need to run install in such cases, use "pnpm install --no-frozen-lockfile"

Failure reason:
specifiers in the lockfile (… "ember-attacher":"workspace:*" …)
don't match specs in package.json (… "ember-attacher":"4.0.0" …)
```

Elapsed ~8s. Matches run 20464714999.

`CI` is unset locally by default; without it, `pnpm install` is *not* frozen and mutates the lockfile. That is why a laptop install can “work” while Actions dies.

## Root cause 1 — lockfile vs manifest (the 8s death)

`test-app/package.json`:

```json
"ember-attacher": "4.0.0"
```

`pnpm-lock.yaml` (importer `test-app`):

```yaml
ember-attacher:
  specifier: workspace:*
  version: link:../addon
```

Commit `7e3246d` did both in one shot: bump test-app from `"ember-attacher": "3.2.0"` to `"4.0.0"`, and rewrite the lockfile specifier from `3.2.0` (registry tarball `ember-attacher@3.2.0`) to `workspace:*` / `link:../addon`. The committed lockfile and manifest never matched.

pnpm 9 on Actions therefore refuses to install ([`--frozen-lockfile`](https://pnpm.io/cli/install#--frozen-lockfile) default in CI).

## Previous greens were not this v2 tree

| Run | SHA | Result |
| --- | --- | --- |
| 19541664732 (2025-11-20) | `62cf788` Release 4.0.0-beta.1 | success, 2m39s |
| 20458526463 (2025-12-23 10:42Z) | `876078a` Release 4.0.0-beta.2 | success, 2m18s |
| 20458702351 (2025-12-23 10:50Z) | `9b131e08` Release 4.0.0-beta.3 | success, 2m6s |
| **20464714999** (2025-12-23 15:26Z) | **`7e3246d` HEAD** | **failure, 14s** |

`9b131e08` exists as a commit (`git cat-file -t 9b131e08` → `commit`) but is **not** an ancestor of current `v2-migration`. History is `cb7ade5` → `7e3246d`. The green SHA is `cb7ade5` → `876078a` → `9b131e08`.

On those green SHAs, the lockfile still had:

```yaml
ember-attacher:
  specifier: 3.2.0
  version: 3.2.0(@babel/core@…)(webpack@…)
```

matching `"ember-attacher": "3.2.0"` in `test-app/package.json`. Frozen install succeeded because it installed **npm 3.2.0** (v1 addon), not `addon/`. Lint/test then ran against that published package. That is why CI could be green while `exports["."]` already pointed at `./dist/index.js` and `addon/src/index.js` did not yet exist (`git ls-tree cb7ade5 addon/src/` — `.gitkeep`, components, defaults, styles, test-support; no `index.js`).

PR history shows the same trap was already being poked: `48dcdd9` “fix pnpm lock”, `cde789b` “Try pnpm install without `--frozen-lockfile`”, `cf692f3` “rollback to current version”. Removing frozen-lockfile does not make the workspace the thing under test.

## What happens if install is forced through

### `pnpm install --no-frozen-lockfile` (no workspace protocol)

Lockfile rewrites to:

```yaml
ember-attacher:
  specifier: 4.0.0
  version: 4.0.0
```

plus a `packages` entry `ember-attacher@4.0.0` from the registry (integrity `sha512-rG0xIQ9o…`). That is published 4.0.0, not `addon/`.

### `test-app` specifier `workspace:*` (matches committed lockfile)

```text
CI=true pnpm install
# Lockfile is up to date, resolution step is skipped
# Already up to date
# Done in 458ms
test-app/node_modules/ember-attacher -> ../../addon
```

`pnpm lint` (`pnpm -r lint`): **exit 0**. Addon has no `eslint` in `addon/package.json`; `eslint` is a `test-app` dep that pnpm hoists to the repo-root `.bin`. Fragile, but not why 20464714999 died.

`cd test-app && pnpm test` with **no** `addon/dist`:

```text
Build Error (UnwatchedDir) in …/addon/dist/_app_/components
ENOENT: no such file or directory
ELIFECYCLE Test failed.
```

`addon/package.json` has `"build"` and `"prepublishOnly": "pnpm run build"` only. No `prepare`. `addon/dist` is not in git (`Glob addon/dist/**` → 0 files). `ember-addon.app-js` points at `./dist/_app_/components/*.js`. CI never builds the v2 addon.

After `cd addon && pnpm run build` (succeeds in 311ms; emits `dist/_app_/components`, `dist/styles/ember-attacher.css`, `dist/test-support`, **not** `dist/index.js`):

```text
ERROR in …/tests.cjs
Module not found: Can't resolve 'ember-attacher'
… using exports field: ./dist/index.js
… ember-attacher/dist/index.js doesn't exist
webpack 5.96.1 compiled with 1 error
Build Error (WebpackBundler)
```

Cause chain:

- `addon/package.json` `exports["."]`: `"./dist/index.js"`.
- `addon/src/index.js` (added in `7e3246d`): `export {};`.
- `addon/rollup.config.mjs` `publicEntrypoints` lists components, `defaults.js`, `test-support/index.js` — **not** `index.js`.
- Fourteen test-app integration tests: `import { isVisible } from 'ember-attacher';` (e.g. `test-app/tests/integration/components/ember-attacher/show-on-click-test.js`).
- `isVisible` lives in `addon/src/test-support/is-visible.js` and is re-exported from `addon/src/test-support/index.js` (`exports["./test-support"]`). The tests still import the package root, as they did on v1 `master`.

So: emit `dist/index.js` **and** re-export `isVisible` from it, or the suite still fails after webpack starts resolving.

`import 'ember-attacher/styles'` in `test-app/app/app.js` (also `7e3246d`) is fine once `dist/styles/ember-attacher.css` exists; that was not the webpack error.

## Smallest change set (Tests + Floating green, local v2, no component-contract change)

Four edits. No template/args/events/CSS-class/`environment.js` changes. No lockfile churn if (1) is `workspace:*`.

| File | Change | Why |
| --- | --- | --- |
| `test-app/package.json` | `"ember-attacher": "workspace:*"` | Match lockfile; frozen `pnpm install` succeeds; link `addon/` instead of npm. |
| `addon/package.json` | `"prepare": "pnpm run build"` next to existing `build` | `pnpm install` in Tests and Floating builds `dist/` (both jobs already run `pnpm install`). |
| `addon/rollup.config.mjs` | `'index.js'` in `publicEntrypoints` | Emit `dist/index.js` so `exports["."]` is a real file. |
| `addon/src/index.js` | `export { isVisible } from './test-support/is-visible';` | Satisfy existing `import { isVisible } from 'ember-attacher'` without rewriting 14 tests. |

Equivalent to `prepare`: a CI step `pnpm --filter ember-attacher build` before lint/test in both jobs. `prepare` is smaller and also fixes local `pnpm install`.

Not sufficient:

- Only (1): Tests still fail `ENOENT addon/dist/_app_/components`.
- (1)+(2) only: webpack `Can't resolve 'ember-attacher'` / missing `dist/index.js`.
- (1)+(2)+(3) with `export {}`: webpack may compile; tests then fail because `isVisible` is not exported.
- `--no-frozen-lockfile` or `--no-lockfile` without `workspace:*`: installs registry 4.0.0 / whatever latest is, not this branch.

## Out of scope for this ticket (do not mix into the CI unblock)

- **Floating Dependencies is not floating.** Same `pnpm install` as Tests. Making it `pnpm install --no-lockfile` is a later job-semantics change; `workspace:*` still pins the local addon, which is what you want.
- **`try-scenarios`** will start once Tests is green. Its install uses `pnpm/action-setup` `run_install` with `--frozen-lockfile` **and** another `pnpm install`, and it runs `./node_modules/.bin/ember try:one` from `test-app`. Not why 20464714999 died.
- Root `package.json` is also `"name": "ember-attacher"` (same as `addon/`). pnpm 9 did not fail on that; renaming the private root is optional hygiene.
- Addon `lint` has no declared `eslint` / `@babel/eslint-parser` / ember eslint plugins; it works today via hoist. Declare them if lint is to stay package-local.
- Leftover repo-root `rollup.config.js` (v1-shaped, unused by `addon` scripts).
- `addon/babel.config.json` still names `@babel/plugin-proposal-class-properties` while `addon/package.json` has `@babel/plugin-transform-class-properties`. `pnpm run build` succeeded anyway (plugin present transitively). Not the 8s failure.

## Commands used

```bash
gh issue view 1041
gh pr view 1022 --json statusCheckRollup,commits,headRefName
gh pr checks 1022
gh run view 20464714999
gh run view 20464714999 --log-failed          # HTTP 410
gh api repos/tylerturdenpants/ember-attacher/actions/jobs/58805466679
git fetch origin
git worktree add /tmp/ember-attacher-research-v2-ci research/v2-ci-failures  # from origin/v2-migration
# Node 20.20.2 + pnpm 9.15.9 via nvm + corepack
CI=true pnpm install                          # ERR_PNPM_OUTDATED_LOCKFILE ~8s
pnpm install --no-frozen-lockfile             # rewrites lockfile to registry 4.0.0
# after restoring lockfile and using workspace:* only in a throwaway edit:
CI=true pnpm install                          # ok, link:../addon
pnpm lint                                     # exit 0
cd test-app && pnpm test                      # ENOENT addon/dist/_app_/components
cd addon && pnpm run build                    # ok, no dist/index.js
cd test-app && pnpm test                      # webpack: dist/index.js doesn't exist
```
