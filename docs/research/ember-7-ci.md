# Ember 7.x CI without dropping the committed floor

Research for [#1057](https://github.com/tylerturdenpants/ember-attacher/issues/1057). Snapshot date: 2026-09-22.

Base:

- `origin/master` @ `601cb0d` (“[chore]: Bump @babel/helpers from 7.23.7 to 7.27.4”)
- `origin/v2-migration` @ `7e3246d` (“Updates to version 4.0.0 and add SCSS handling”)

This note is findings only. It does not change CI or ember-try.

## Answer

**Required** ember-try scenarios for 4.x, so consuming apps are not blocked on current Ember, without dropping the committed floor:

| Scenario | `ember-source` | Why |
| --- | --- | --- |
| `ember-lts-3.28` | `~3.28.12` | CI floor today. Keep. Do not add `3.20`. Do not raise this. |
| `ember-lts-4.8` | `~4.8.6` | Already required in ember-try and the CI matrix. |
| `ember-lts-4.12` | `~4.12.4` | Already required in ember-try; **missing from the CI matrix** on both branches. |
| `ember-lts-5.12` | `~5.12.0` | Same: required in ember-try, **missing from CI**. README ceiling today. |
| `ember-lts-6.12` | `~6.12.0` | Current Ember.js LTS. Not defined anywhere yet. |
| `ember-7` (pinned) | `~7.2.0` | Current stable 7.x (latest release 7.2.0). Not defined. Do not use `ember-release` for this gate: that channel will become 8.x. |

Keep **`embroider-safe`** and **`embroider-optimized`** required. They are not Ember-version scenarios.

**`allowedToFail`:**

| Scenario | Why |
| --- | --- |
| `ember-release` | Forthcoming stable. Today it *is* 7.x, but it must not be the 7.x merge gate. |
| `ember-beta` | Forthcoming. Already `allowedToFail` on both branches. |
| `ember-canary` | Forthcoming. Already `allowedToFail` on both branches. |

Leave `ember-release` as `allowedToFail` once a pinned `ember-7` job exists. Watch the channel; do not let a moving major fail the train.

**7.x-breaking code in this addon**

- **4.x published package (`v2-migration`): no.** The three Ember 7.0 removals are not used in `addon/src`. `addon/-debug/helpers.js` is gone. `stripInProduction` was replaced with `runInDebug` from `@ember/debug`.
- **3.x published package (`master`): yes, in development/test.** `addon/-debug/helpers.js` does `import Ember from 'ember'` and `attach-popover` imports `stripInProduction` from that module. Ember 7 removed the barrel file. Production builds funnel `-debug/` out, so a production 3.x consumer may still boot; a 7.x app that compiles this addon in development will not.
- **CI harness, not consumers:** dummy / test-app `attachment-example.js` still does `import { inject as service } from '@ember/service'`. That import is removed in 7.0. `service` exists only from ember-source 4.1, so a 3.28 + 7.x matrix needs the dual export (`emberService.service ?? emberService.inject`). On `master`, `ember-cli-htmlbars@^6.3.0` is a published dependency; Ember 7's AMD removal requires htmlbars ≥ 7.0.0. On `v2-migration` htmlbars 6.3.0 is test-app only.

**4.1.0 vs a later 4.x patch**

4.1.0 does **not** need to wait for the CI matrix. The v2 addon already dropped the 7.x landmine. A later 4.x patch can add `ember-lts-6.12`, pinned `ember-7`, and put `4.12` / `5.12` on the CI matrix.

Do not hold 4.1.0 for helpers.js: that file is not on `v2-migration`. Do not raise the minimum Ember version.

## Sources

| Claim | Source |
| --- | --- |
| README floor 3.20, ceiling 5.12 | `README.md` Compatibility on `master` and `v2-migration` |
| CI / ember-try floor 3.28 | `tests/dummy/config/ember-try.js` (`master`); `test-app/config/ember-try.js` (`v2-migration`); both `.github/workflows/ci.yml` matrices |
| ember-try has 4.12 and 5.12, CI matrix does not | Same files. CI lists 3.28, 4.8, release, beta, canary, embroider-safe, embroider-optimized |
| release / beta / canary `allowedToFail: true` | ember-try on both branches |
| 6.12 is current LTS; 6.8 still Active | [Ember LTS](https://emberjs.com/releases/lts/) |
| Latest stable 7.2.0 | [Ember releases](https://emberjs.com/releases/) (page title “Latest Release: 7.2.0”) |
| 7.0 removes barrel import, AMD bundles, `inject` | [Ember 7.0 blog](https://blog.emberjs.com/ember-released-7-0/) |
| Barrel file removed | [RFC 1003](https://rfcs.emberjs.com/id/1003-deprecation-import-ember-from-ember/); ember.js #21275 in [CHANGELOG v7.0.0](https://github.com/emberjs/ember.js/blob/HEAD/CHANGELOG.md) |
| AMD bundles removed; htmlbars ≥ 7.0.0 | [using-amd-bundles](https://deprecations.emberjs.com/id/using-amd-bundles); [RFC 1101](https://rfcs.emberjs.com/id/1101-deprecate-ember-vendor-bundles/); ember.js #21240 |
| `inject` removed; `service` since 4.1 | [importing-inject-from-ember-service](https://deprecations.emberjs.com/id/importing-inject-from-ember-service); [RFC 0752](https://rfcs.emberjs.com/id/0752-inject-service/); ember.js #19776 / #20526 |
| `master` barrel import | `addon/-debug/helpers.js` line 1; imported from `addon/components/attach-popover.js` |
| Production strips `-debug/` | `index.js` `treeForAddon` Funnel `exclude: [/-debug/]` |
| `v2-migration` uses `runInDebug` | `addon/src/components/basic-attacher.js` |
| 4.x = not blocked on current Ember; min Ember raise is 5.x | Repo language for the 4.x line (not restated here as a recommendation to raise) |

## What CI and ember-try do today

Same scenario names on both branches. `master` uses yarn + `tests/dummy/config/ember-try.js`. `v2-migration` uses pnpm + `test-app/config/ember-try.js`.

ember-try scenarios (both):

1. `ember-lts-3.28` — required
2. `ember-lts-4.8` — required
3. `ember-lts-4.12` — required in ember-try, **not in CI**
4. `ember-lts-5.12` — required in ember-try, **not in CI**
5. `ember-release` — `allowedToFail: true`
6. `ember-beta` — `allowedToFail: true`
7. `ember-canary` — `allowedToFail: true`
8. `embroiderSafe()` / `embroiderOptimized()` — required

CI `try-scenarios` matrix (both `.github/workflows/ci.yml`):

```text
ember-lts-3.28
ember-lts-4.8
ember-release
ember-beta
ember-canary
embroider-safe
embroider-optimized
```

So today:

- The committed CI floor is **3.28**, not README 3.20. There is no `ember-lts-3.20` scenario. Leave it that way.
- Current Ember (6.12 LTS and 7.x) is **not a merge gate**. `ember-release` is the only job that might run 7.x, and it is `allowedToFail`.
- 4.12 and 5.12 are already intended as required in ember-try; CI never runs them.

README on both branches still says “Ember.js v3.20 through v5.12”. That ceiling is stale against 6.12 / 7.2. Updating the README is out of this note’s scope.

## Ember 7.0 removals

[Ember 7.0](https://blog.emberjs.com/ember-released-7-0/) (2026-05-29) promoted 6.12 to LTS and removed only APIs deprecated until 7.0:

1. `import Ember from 'ember'` — [RFC 1003](https://rfcs.emberjs.com/id/1003-deprecation-import-ember-from-ember/), ember.js #21275.
2. AMD bundles from `ember-source` (`ember.debug.js`, `ember.prod.js`, `ember-testing.js`, `ember-template-compiler.js`) — [RFC 1101](https://rfcs.emberjs.com/id/1101-deprecate-ember-vendor-bundles/), ember.js #21240. Apps that still pull those files, or addons that walk Ember out of `vendor`, break. Build-time clearance needs `ember-cli-htmlbars` 7.0.0 (and listed minimums for template-compilation / auto-import / Embroider).
3. `import { inject } from '@ember/service'` — now `import { service } from '@ember/service'`. `service` shipped in ember-source 4.1 ([RFC 0752](https://rfcs.emberjs.com/id/0752-inject-service/)). Libraries that still support pre-4.1 must use `emberService.service ?? emberService.inject`.

The upgrade blog’s test: if the app or addon runs with no deprecations on 6.12, 7.0 should take no extra code changes.

As of 2026-09-22, [emberjs.com/releases](https://emberjs.com/releases/) lists **7.2.0** as latest. [LTS](https://emberjs.com/releases/lts/): 6.12 Active (bugfixes until 2026-12-08), 6.8 Active until 2026-12-08 for security. 6.8 is not required here: 4.x is “not blocked on current Ember”, not a chase of every LTS.

## This addon’s use of those APIs

### `import Ember from 'ember'` — `master` only

`addon/-debug/helpers.js`:

```js
import Ember from 'ember';
const { Logger } = Ember;
```

`debug()` calls `Logger.debug`. Nothing in the repo calls `debug()`. `attach-popover.js` imports `stripInProduction`, which does not use `Ember`, but **evaluating the module still runs the barrel import**.

`index.js` in production:

- Funnel excludes `/-debug/`
- `babel-plugin-filter-imports` strips `ember-attacher/-debug/helpers`

A 7.x consumer of **3.x** in production may never load that file. Development and test will.

`v2-migration` has no `addon/-debug/helpers.js`. `addon/src/components/basic-attacher.js` uses `runInDebug` from `@ember/debug`.

### AMD bundles — not this addon’s runtime

Shipped JS on both lines imports `@ember/*` and `@glimmer/*` modules. No `app.import('vendor/ember.debug.js')`, no read of Ember from `vendor`.

`master` still publishes `ember-cli-htmlbars: ^6.3.0`. The AMD deprecation says htmlbars 6.x in an addon’s tree keeps the `using-amd-bundles` warning and blocks Ember 7 until overridden. That is a **3.x package** issue.

`v2-migration`’s published `addon/package.json` does not depend on htmlbars. `test-app/package.json` still has `ember-cli-htmlbars: ^6.3.0`, so a **required** 7.x ember-try job can fail in the harness before the addon is implicated.

### `inject` from `@ember/service` — dummy / test-app only

Not used under `addon/` on either branch.

`tests/dummy/app/components/attachment-example.js` (`master`) and `test-app/app/components/attachment-example.js` (`v2-migration`):

```js
import { inject as service } from '@ember/service';
```

`@service popoverData` / `@service tooltipData`. Ember 7.0 removes `inject`. Switching the test app to `import { service }` alone would break `ember-lts-3.28` (`service` is 4.1+). A required 3.28 + 7.x matrix needs the dual export from the deprecation guide. That is harness work, not a 4.x consumer break.

## Required vs `allowedToFail`

4.x support means consuming apps are not blocked on **current** and **forthcoming** Ember. Current is a merge gate. Forthcoming is watched.

**Required (must be in ember-try *and* the CI matrix, no `allowedToFail`):**

- `ember-lts-3.28` — committed floor
- `ember-lts-4.8` — already on the matrix
- `ember-lts-4.12` — already in ember-try; add to the matrix
- `ember-lts-5.12` — already in ember-try; add to the matrix
- `ember-lts-6.12` — new; current LTS
- `ember-7` pinned to `ember-source: ~7.2.0` — new; current 7.x
- `embroider-safe`, `embroider-optimized`

**`allowedToFail`:**

- `ember-release` — keep failing-open once 7.x is pinned
- `ember-beta`
- `ember-canary`

Do not:

- Add `ember-lts-3.20` (README history; never a CI scenario)
- Drop `ember-lts-3.28`
- Raise the minimum Ember version
- Treat `ember-release` as the 7.x required job (it will become 8.x)

A required 7.x job will stay red until the test-app `inject` import (and, on 7.x, htmlbars ≥ 7) is fixed. That does not mean the published 4.x addon is unsafe for 7.x consumers.

## 4.1.0

4.1.0 is the first `latest` of the v2-addon line. That line already removed `helpers.js` and does not import `inject` or the Ember barrel.

| Must be in 4.1.0? | Item |
| --- | --- |
| No (already done on `v2-migration`) | Stop shipping `import Ember from 'ember'` |
| No | ember-try / CI scenarios for 6.12 and 7.x — later 4.x patch is enough |
| No | Raising min Ember |

Ship 4.1.0 without waiting for this CI expansion. Add the required 6.12 and 7.x jobs when the test-app harness can boot them, without moving the 3.28 floor.
