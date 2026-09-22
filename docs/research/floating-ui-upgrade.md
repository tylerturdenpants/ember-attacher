# Floating UI upgrade surface

Research for [#1043](https://github.com/tylerturdenpants/ember-attacher/issues/1043). Snapshot date: 2026-09-22. No dependency bump in this branch.

## Verdict

**Lowest real upgrade: `@floating-ui/dom@1.7.3`.** That is the first published version newer than what `v2-migration` and npm `ember-attacher@4.0.0` declare and lock (`^1.7.2` / `1.7.2`).

**It can ship as a non-breaking 4.1.0 dependency bump.** Raising the floor all the way to `^1.8.0` (current latest, 2026-07-11) is also non-breaking. There is no 2.x line. None of ember-attacher’s `computePosition` / `autoUpdate` / `arrow` / `flip` / `shift` / `limitShift` call sites need to change.

## Versions

| Source | Declared | Lock resolved | Evidence |
| --- | --- | --- | --- |
| `origin/master` (`601cb0d`) | `^1.6.12` | `1.7.1` | [`package.json`](https://github.com/tylerturdenpants/ember-attacher/blob/601cb0dc2b587a950bc1e18826d42217084eba45/package.json#L33); `yarn.lock` `@floating-ui/dom@^1.6.12` → `version "1.7.1"` |
| `origin/v2-migration` (`7e3246d`) | `^1.7.2` | `1.7.2` | [`addon/package.json`](https://github.com/tylerturdenpants/ember-attacher/blob/7e3246d8d91812d8b1062192c019e8dc031e4003/addon/package.json#L41); `pnpm-lock.yaml` `'@floating-ui/dom@1.7.2'` |
| npm `ember-attacher@4.0.0` (`beta`, published 2025-12-23) | `^1.7.2` | n/a (published package lists the range only) | `npm view ember-attacher@4.0.0 dependencies` |
| npm `@floating-ui/dom` latest | `1.8.0` | — | `npm view @floating-ui/dom version`; [release](https://github.com/floating-ui/floating-ui/releases/tag/%40floating-ui%2Fdom%401.8.0) |
| npm `@floating-ui/dom` 2.x | none | — | `npm view @floating-ui/dom versions` (85 0.x/1.x versions, no `2.*`) |

Caret on both declared ranges already *allows* 1.8.0 (`^1.6.12` and `^1.7.2` are `<2.0.0`). Fresh installs can therefore already resolve latest. The 4.1.0 bump is a **floor raise + lockfile refresh**, not a new major of Floating UI.

From `master`’s lock (`1.7.1`), the first newer version is `1.7.2` — already the v2 / 4.0.0 pin. The 4.1.0 train is based on `v2-migration`, so **1.7.3** is the lowest upgrade that is not already in tree.

## Call sites (identical API usage)

On `master`, positioning lives in `addon/components/attach-popover.js`. On `v2-migration` the same logic moved to `addon/src/components/basic-attacher.js`; `attach-popover.js` there is a thin wrapper (aria role only). The Floating UI usage is a copy, not a rewrite.

Imports (master L10, v2 L10):

```js
import { autoUpdate, computePosition, arrow, flip, limitShift, shift } from '@floating-ui/dom';
```

### `flip` / `shift` / `limitShift` / `arrow`

Built in `_middleware` (master L185–210, v2 L194–219):

| Call | Arguments we pass | Upstream docs |
| --- | --- | --- |
| `flip({ fallbackPlacements })` | `fallbackPlacements: flipString.split(' ')` when `@flip` is a space-separated string | [flip](https://floating-ui.com/docs/flip) — `fallbackPlacements?: Array<Placement>` |
| `flip()` | no options, when `@flip` is unset and `overflowPadding !== false` | same |
| `shift({ limiter: limitShift(), padding })` | default limiter; `padding` from `@overflowPadding` (default `5` in `addon/defaults.js`) | [shift](https://floating-ui.com/docs/shift); [limitShift](https://floating-ui.com/docs/shift#limiter) |
| `arrow({ element })` | `element: this._arrowElement` | [arrow](https://floating-ui.com/docs/arrow) — `element: Element` |

We do **not** pass `flip.crossAxis`, `fallbackAxisSideDirection`, `rootBoundary`, or `arrow.padding`. We do not read `middlewareData.arrow.alignmentOffset` (added in core 1.5.0, already in our 1.6/1.7 range).

### `autoUpdate`

Master L800–805 / v2 L814–819:

```js
this._cleanup = autoUpdate(
  this._currentTarget,
  this._floatingElement,
  this._updatePosition,
  typeOf(this.autoUpdate) === 'object' ? this.autoUpdate : undefined
);
```

Matches the documented 4-argument form: `(reference, floating, update, options?)` ([autoUpdate](https://floating-ui.com/docs/autoUpdate)). Options object keys we would forward from `@autoUpdate` are still `ancestorScroll`, `ancestorResize`, `elementResize`, `layoutShift`, `animationFrame` in both 1.7.2 and 1.8.0 source ([1.7.2 `autoUpdate.ts`](https://github.com/floating-ui/floating-ui/blob/%40floating-ui/dom%401.7.2/packages/dom/src/autoUpdate.ts), [1.8.0 `autoUpdate.ts`](https://github.com/floating-ui/floating-ui/blob/%40floating-ui/dom%401.8.0/packages/dom/src/autoUpdate.ts)).

1.7.6 made the second argument `FloatingElement | null` (“allow not passing a floating element”). We still pass `_floatingElement`; the old required-element signature remains valid.

### `computePosition`

Master L814–818 / v2 L828–832:

```js
computePosition(this._currentTarget, this._floatingElement, {
  ...this.floatingUiOptions,
  middleware: this._middleware,
  placement: this.placement
}).then(({ x, y, placement, middlewareData }) => { /* left/top + arrow x/y */ });
```

Matches [computePosition](https://floating-ui.com/docs/computePosition): `(reference, floating, { placement, strategy, middleware })` → `{ x, y, placement, strategy, middlewareData }`. Arrow styling uses `middlewareData.arrow.{x,y}` with `!= null`, which is the documented pattern.

Public args that *forward* Floating UI options (`@middleware`, `@floatingUiOptions`, `@autoUpdate` object, `@flip`, `@overflowPadding`) keep the same shapes. Apps that already import middleware from `@floating-ui/dom` continue to work; new 1.7/1.8 options (`crossAxis: 'alignment'`, `rootBoundary: 'layoutViewport'`) are additive and unused unless a consumer opts in.

## Changelog that matters (1.7.2 → 1.8.0)

Primary source: [`packages/dom/CHANGELOG.md`](https://github.com/floating-ui/floating-ui/blob/master/packages/dom/CHANGELOG.md) and [`packages/core/CHANGELOG.md`](https://github.com/floating-ui/floating-ui/blob/master/packages/core/CHANGELOG.md). No Breaking Changes sections on this range.

| Version | Kind | What changed | Our call sites |
| --- | --- | --- | --- |
| **1.7.3** | patch | core `flip`: perpendicular-axis flips with `crossAxis: 'alignment'` | No — we never set `crossAxis`. **Lowest real upgrade** from 4.0.0. |
| 1.7.4 | patch | `getViewportRect` accounts for `scrollbar-gutter: stable` | Behavioral fix only |
| 1.7.5 | patch | re-export of core 1.7.4 (`detectOverflow` via platform) | Unused |
| 1.7.6 | patch | `autoUpdate` floating arg optional; types/perf | Additive; we still pass the element |
| **1.8.0** | **minor** | new `rootBoundary: 'layoutViewport'`; autoUpdate layout-shift throttle fixes; clipping/viewport scrollbar fixes | Additive option; we do not pass `rootBoundary`. Latest 1.x. |

Earlier 1.7.0 (`flip.crossAxis: 'alignment'`) is already inside `^1.7.2` / lock `1.7.2`. 1.6.13 (`autoUpdate` IntersectionObserver workaround) is already inside `master`’s lock (`1.7.1`).

Positioning *pixels* can change in edge cases (left-side document scrollbar, `scrollbar-gutter: stable`, fixed-strategy clipping ancestors, layout-shift observer). Those are upstream bugfixes, not ember-attacher component-contract breaks.

## What would have to change (and does not)

Nothing required for a 4.1.0 dep bump:

- Do not rewrite `_middleware`, `_update`, or `_updatePosition`.
- Do not adopt `crossAxis: 'alignment'` or `rootBoundary: 'layoutViewport'` as part of the bump; they are opt-in and would be a behavior change if we started passing them.
- Do not omit the floating element from `autoUpdate`.

Optional later (out of scope for this ticket): adopt Floating UI’s recommended `flip`+`shift` ordering / `crossAxis: 'alignment'` pairing. That would be a positioning-behavior change, not a dependency-semver requirement.

## 4.1.0 recommendation

On the v2 addon package, bump `"@floating-ui/dom": "^1.7.2"` → `"^1.8.0"` and refresh the lockfile so CI/publish pin 1.8.0. Lowest acceptable floor is `^1.7.3` if a smaller bump is preferred; both are non-breaking for the 3.x component contract.
