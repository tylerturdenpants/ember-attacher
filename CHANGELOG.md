## Unreleased

## v5.0.0-beta.3 (2026-11-20)

> **Beta of the 5.0 line** — not a stable release. Install with `npm i ember-attacher@beta` or `npm i ember-attacher@5.0.0-beta.3`. The npm `latest` dist-tag remains on the 4.x line. See [#1132](https://github.com/tylerturdenpants/ember-attacher/pull/1132).

#### :rocket: Enhancement
* **Arrow width/height & `line-height` CSS tokens (#1132):** Added `--ember-attacher-arrow-width`, `--ember-attacher-arrow-height` (falling back to `--ember-attacher-arrow-size`), and `--ember-attacher-line-height` (`inherit`) on `.ember-attacher-tooltip` / `.ember-attacher-popover`, and evaluated arrow edge offsets directly on `.ember-attacher-arrow` so overrides on the inner class apply cleanly.

#### :bug: Bug Fix
* **Revert `::backdrop` clickout workaround (#1132):** Removed the beta.2 Top-Layer `::backdrop` outside-click path after verifying it was a no-op in real browsers; also drop the duplicate `prepublishOnly` build script.

#### :memo: Documentation
* **CSS loading & AttachPopover styling (#1132):** Clarified that `ember-addon.implicit-styles` only auto-inject when the host depends on `ember-attacher` directly (peerDependency hosts must depend or `import 'ember-attacher/styles';`), and that `<AttachPopover>` has no packaged look unless `@class="ember-attacher-popover"`.
* **Opt-in `hide()` middleware (#1132):** Documented `@middleware={{array (hide)}}` for hiding Top-Layer attachments when their target scrolls out of a clipping container.

## v5.0.0-beta.2 (2026-11-19)

> **Beta of the 5.0 line** — not a stable release. Install with `npm i ember-attacher@beta` or `npm i ember-attacher@5.0.0-beta.2`. The npm `latest` dist-tag remains on the 4.x line. See [#1132](https://github.com/tylerturdenpants/ember-attacher/pull/1132).

#### :rocket: Enhancement
* **`assertAttached()` test helper (#1132):** `ember-attacher/test-support` exports `assertAttached(assert, attachment, target, { placement, maxGap, tolerance, message })` (plus `AssertAttachedOptions`, `ElementOrSelector`, and `ResultPusher`), which checks that an open attachment is visible, on its resolved side, close to and overlapping its target, with the arrow pointing at the target, inside the viewport and not covered.

#### :bug: Bug Fix
* **Published npm `README.md` (#1132):** Sync root `README.md` into the published `addon/` package during build (`addon/rollup.config.mjs`, `addon/package.json` `files`) with GitHub blob links so npm displays the package README instead of missing it.

#### :memo: Documentation
* **5.0 Recipes (#1132):** Added cookbook recipes in `README.md` (and cross-linked from `addon/docs/upgrade-guide-5.0.md`) for custom `flip`/`shift` `boundary` constraints, coordinate/`VirtualElement` targets with `autoUpdate` `{ animationFrame: true }`, `{{#in-element}}` + `@renderInPlace` stacking, and `a.setTarget()` for externally replaced DOM nodes.

## v5.0.0-beta.1 (2026-11-19)

> **Beta of the 5.0 line** — not a stable release. Install with `npm i ember-attacher@beta` or `npm i ember-attacher@5.0.0-beta.1`. The npm `latest` dist-tag remains on the 4.x line. See [#1131](https://github.com/tylerturdenpants/ember-attacher/pull/1131). Includes tip-of-PR restore of immediate `a.show` / `a.hide` / `a.toggle` semantics and related fixes after `5.0.0-beta.0` staging.

## v5.0.0-beta.0 (2026-11-19)

> Superseded for the npm `beta` dist-tag by `5.0.0-beta.1` (same PR line). An orphaned npm stage of `5.0.0-beta.0` from `e3ba55c` may still need `npm stage reject` if not already cleared.


#### :boom: Breaking Change
* **Platform & Test Floor (#1125):** Raised minimum `ember-source` / `ember-cli` floor to `>= 4.12 LTS` and `Node.js >= 20 LTS`; dropped Ember 3.28 and Node 18.
* **Removed `<BasicAttacher>` & 4.x Deprecations (#1127 / #1131):** Removed `BasicAttacher`, implicit parent target fallback (debug `assert()` fires when no target binding is supplied, while allowing nullable reactive `@target={{this.dynamicTarget}}`), `@explicitTarget`, `a.reference`, `a.setReference()`, `@flip`, `@overflowPadding`, `@floatingUiOptions`, `@floatingElementContainer`, `@isOffset`, `@style`, `@additionalClass`, `@onInitializeAttacher`, `@onWillDestroy`, and `@configKey`.
* **1-Pass In-Place Top-Layer Host (#1126):** Removed `<meta hidden>`, `MaybeInElement` (`{{#in-element}}`), and `@floatingElementContainer` portaling for components; `<AttachTooltip>` and `<AttachPopover>` render in place and promote to the Top Layer via `popover="manual"`.
* **5.0 Component Defaults & Accessibility (#1126):**
  * `<AttachPopover>` defaults to `showOn: 'click'`, `hideOn: 'click clickout escapekey'`, `interactive: true`, and `lazyRender: true`.
  * `<AttachTooltip>` and `{{tooltip}}` default `interactive: true` (WCAG 1.4.13 hoverable tooltips; opt out with `@interactive={{false}}`).
  * `@autoUpdate` defaults to `true`.
* **CSS & Animation Contract (#1126):** Replaced `div[x-circle]` with `.ember-attacher-fill-circle`, removed `x-arrow`, removed `.ember-attacher-show` / `.ember-attacher-hide` classes, gated spatial motion under `@media (prefers-reduced-motion: no-preference)`, removed permanent idle `will-change: transform` and `perspective: 800px`, and migrated show/hide lifecycle to CSS `@starting-style` + `transition-behavior: allow-discrete` + WAAPI `getAnimations({ subtree: true })` with zero pre-`computePosition` `rAF` delay.

#### :rocket: Enhancement
* **Native `.gts` / `.ts` & Single-Owner Declarations (#1127, #1129 / #1131):** Converted `addon/src/` to strict `.ts` and `.gts` components, emitting `.d.ts` and `EmberAttacherRegistry` directly from source during build and validating negative contracts via `@glint-expect-error`.
* **Accessibility & Triggers (#1126):** Smart Tooltip ARIA (`aria-labelledby` upfront on nameless icon triggers, duplicate `aria-describedby` suppression, open-only `aria-describedby` otherwise), `[interestfor="<id>"]` trigger pairing alongside `[popovertarget="<id>"]`, `data-placement` emitted alongside `x-placement`, and removal of all `@ember/runloop` and `@ember/object` imports.

#### :memo: Documentation
* **5.0 Documentation (#1127 / #1131):** Updated `addon/docs/upgrade-guide-5.0.md`, `README.md`, and `docs/adr/` for the 5.0 architecture, defaults, animation lifecycle, and migration guide.


## v4.4.0 (2026-11-18)

#### :rocket: Enhancement
* [#1120](https://github.com/tylerturdenpants/ember-attacher/pull/1120) / [#1121](https://github.com/tylerturdenpants/ember-attacher/pull/1121) / [#1122](https://github.com/tylerturdenpants/ember-attacher/pull/1122) / [#1115](https://github.com/tylerturdenpants/ember-attacher/issues/1115) / [#64](https://github.com/tylerturdenpants/ember-attacher/issues/64) Extract `AttacherCore`, add headless `<Attacher>`, target bindings (`{{a.target}}`), and a `{{tooltip}}` singleton pool via `TooltipDomHost` with 300ms warm delay-group handoff ([@pzubar](https://github.com/pzubar))
* [#1114](https://github.com/tylerturdenpants/ember-attacher/issues/1114) Publish TypeScript declaration files (`.d.ts` across `'ember-attacher'`, `'ember-attacher/test-support'`, `'ember-attacher/defaults'`, `'ember-attacher/components/*'`, and `'ember-attacher/template-registry'`) plus Glint `EmberAttacherRegistry`, `VirtualElement` / optional-`element` `arrow()` types, and automated `ember-tsc` typechecking in CI ([@pzubar](https://github.com/pzubar))
* [#1073](https://github.com/tylerturdenpants/ember-attacher/pull/1073) Make `@animation="fill"` compatible with `@arrow={{true}}` by clipping `div[x-circle]` inside `.ember-attacher-fill-backdrop` instead of setting `overflow: hidden` on the arrow container, and remove debug warning `70015` ([@pzubar](https://github.com/pzubar))
* [#1123](https://github.com/tylerturdenpants/ember-attacher/pull/1123) / [#1116](https://github.com/tylerturdenpants/ember-attacher/issues/1116) Add `until: '5.0.0'` deprecation suite (implicit parent target, legacy `BasicAttacher` template helpers, deprecated `@` args) and `addon/docs/upgrade-guide-5.0.md` ([@pzubar](https://github.com/pzubar))

#### :bug: Bug Fix
* [#1123](https://github.com/tylerturdenpants/ember-attacher/pull/1123) / [#1116](https://github.com/tylerturdenpants/ember-attacher/issues/1116) Stabilize `AttacherCore` show/hide races, attachment-tree / singleton nesting, target resolution, and `isVisible()` selector checks ([@pzubar](https://github.com/pzubar))

#### :memo: Documentation & Housecleaning
* **No Sass/SCSS dependency:** the published addon ships plain CSS (`ember-attacher/styles`); consumers do **not** need `sass`, `scss`, or `ember-cli-sass` to use ember-attacher ([@pzubar](https://github.com/pzubar))
* [#1124](https://github.com/tylerturdenpants/ember-attacher/pull/1124) / [#1119](https://github.com/tylerturdenpants/ember-attacher/issues/1119) Drop `release-it` / `release-it-pnpm` and document manual publish + git tag + GitHub Release ([@pzubar](https://github.com/pzubar))
* [#1123](https://github.com/tylerturdenpants/ember-attacher/pull/1123) / [#1119](https://github.com/tylerturdenpants/ember-attacher/issues/1119) Non-breaking Dependabot / tooling remediation for the 4.4 line ([@pzubar](https://github.com/pzubar))

#### Committers: 1
- Petro Zubar ([@pzubar](https://github.com/pzubar))


## v4.3.0 (2026-11-17)

#### :boom: Behavioral Change (Accessibility & Test Support)
* [#1074](https://github.com/tylerturdenpants/ember-attacher/pull/1074) / [#1118](https://github.com/tylerturdenpants/ember-attacher/pull/1118) / [#1113](https://github.com/tylerturdenpants/ember-attacher/issues/1113) `<AttachTooltip>` now manages `aria-describedby` in `BasicAttacher` **only while open**, preserving any pre-existing `aria-describedby` tokens on the target instead of adding/clobbering it while closed ([@pzubar](https://github.com/pzubar))
* [#1095](https://github.com/tylerturdenpants/ember-attacher/pull/1095) / [#1112](https://github.com/tylerturdenpants/ember-attacher/issues/1112) `isVisible()` in `ember-attacher/test-support` now checks `display !== 'none'`, `visibility !== 'hidden'`, `aria-hidden !== 'true'`, and `:popover-open` (when `[popover]` is present), instead of only `display !== 'none'` ([@pzubar](https://github.com/pzubar))

#### :rocket: Enhancement
* [#1074](https://github.com/tylerturdenpants/ember-attacher/pull/1074) / [#1118](https://github.com/tylerturdenpants/ember-attacher/pull/1118) / [#1113](https://github.com/tylerturdenpants/ember-attacher/issues/1113) Add default accessibility wiring and automatic diagonal `safePolygon` hover corridor:
  * `<AttachPopover>` automatically sets `aria-expanded`, `aria-controls`, and `aria-haspopup` (defaulting to `'dialog'` or matching valid `@ariaRole`) when not already provided by the caller, and restores focus to the target on `Escape` dismissal
  * `<AttachTooltip>` now forwards `@onInitializeAttacher` and `@onWillDestroy` to `<BasicAttacher>`, and safely skips ARIA binding for coordinate-only `VirtualElement` targets
  * `@interactive={{true}}` with `hideOn` including `mouseleave` now automatically enables a triangle `safePolygon` corridor between the cursor exit point and the attachment without requiring `@isOffset={{true}}` ([@pzubar](https://github.com/pzubar))
* [#1095](https://github.com/tylerturdenpants/ember-attacher/pull/1095) / [#1112](https://github.com/tylerturdenpants/ember-attacher/issues/1112) Promote `.ember-attacher` to the browser Top Layer (`popover="manual"` via `showPopover()` / `hidePopover()`) when supported and neither `@renderInPlace` nor `@floatingElementContainer` is explicitly set, automatically scoping portals inside active `dialog:modal` elements to avoid `showModal()` inertness while keeping `{{#in-element}}` fallback ([@pzubar](https://github.com/pzubar))
* [#1096](https://github.com/tylerturdenpants/ember-attacher/pull/1096) / [#1111](https://github.com/tylerturdenpants/ember-attacher/issues/1111) Add `@strategy` (`'absolute' | 'fixed'`), re-export Floating UI middleware builders from `'ember-attacher'`, wire `middlewareData.hide` (`data-reference-hidden` / `data-escaped`), support `@media (prefers-reduced-motion: reduce)`, and add strict-CSP CSSOM `--ember-attacher-transition-duration` ([@pzubar](https://github.com/pzubar))
* [#1108](https://github.com/tylerturdenpants/ember-attacher/pull/1108) Export `AttachPopover`, `AttachTooltip`, `BasicAttacher`, and `isVisible` from `'ember-attacher'`, add `"sideEffects"` for Vite tree-shaking, and add Ember 7.4 Vite test harness ([@pzubar](https://github.com/pzubar))

#### :bug: Bug Fix
* [#1096](https://github.com/tylerturdenpants/ember-attacher/pull/1096) / [#90](https://github.com/tylerturdenpants/ember-attacher/issues/90) Support nested Attachments across Top Layer and portals (clickout protection and LIFO `Escape` dismissal), coordinate-only `VirtualElement` document dismissal, `@lazyRender` outer host mounting, and `@middleware` deduplication / `arrow()` element merging ([@pzubar](https://github.com/pzubar))
* [#1074](https://github.com/tylerturdenpants/ember-attacher/pull/1074) Reset User-Agent `[popover]` border/padding/background on `.ember-attacher[popover]` so Top-Layer hosts do not inherit the browser default solid border and Canvas chrome ([@pzubar](https://github.com/pzubar))

#### :memo: Documentation & Housecleaning
* **No Sass/SCSS dependency:** the published addon ships plain CSS (`ember-attacher/styles`); consumers do **not** need `sass`, `scss`, or `ember-cli-sass` to use ember-attacher ([@pzubar](https://github.com/pzubar))
* [#1096](https://github.com/tylerturdenpants/ember-attacher/pull/1096) Drop `@ember/utils` and refresh `README.md` with `.gjs` / `.gts` examples, Ember 6/7 compatibility, and all 12 Floating UI placements ([@pzubar](https://github.com/pzubar))
* [#1074](https://github.com/tylerturdenpants/ember-attacher/pull/1074) Modularize `BasicAttacher` into `lib/a11y.js`, `lib/host.js`, and `lib/positioning.js`; document a11y defaults and `safePolygon` in README ([@pzubar](https://github.com/pzubar))

#### Committers: 1
- Petro Zubar ([@pzubar](https://github.com/pzubar))


## v4.2.1 (2026-11-12)

#### :bug: Bug Fix
* [#1090](https://github.com/tylerturdenpants/ember-attacher/pull/1090) Interactive clickout no longer hides when the clicked node detaches ([@pzubar](https://github.com/pzubar)) — closes [#422](https://github.com/tylerturdenpants/ember-attacher/issues/422) / [#1051](https://github.com/tylerturdenpants/ember-attacher/issues/1051)
* Positioning checks that a virtual reference `contextElement` is still on the page before updating ([@pzubar](https://github.com/pzubar))

#### :memo: Documentation
* README: `explicitTarget` and yielded `setReference` / `reference` modifier examples; Testing section recommends `isVisible` from `ember-attacher/test-support` ([#774](https://github.com/tylerturdenpants/ember-attacher/issues/774))
* Remove legacy Flexi / Sass warning note from README ([#1054](https://github.com/tylerturdenpants/ember-attacher/issues/1054))

#### :house: Internal
* Drop `ember-cli-sass` and `sass` from `test-app`, converting demo styles to standard CSS ([@pzubar](https://github.com/pzubar))
* [#1054](https://github.com/tylerturdenpants/ember-attacher/issues/1054) Drop `flexi` and `@html-next/flexi-default-styles`, resolving Sass deprecation warnings in test-app ([@pzubar](https://github.com/pzubar))
* [#1092](https://github.com/tylerturdenpants/ember-attacher/pull/1092) Moved lifecycle modifiers and DOM helpers out of BasicAttacher into private modules ([@pzubar](https://github.com/pzubar))
* [#1093](https://github.com/tylerturdenpants/ember-attacher/pull/1093) Bump handlebars from 4.7.8 to 4.7.10 ([@dependabot](https://github.com/apps/dependabot) / [@pzubar](https://github.com/pzubar))
* [#1092](https://github.com/tylerturdenpants/ember-attacher/pull/1092) Bump fast-uri ([@dependabot](https://github.com/apps/dependabot) / [@pzubar](https://github.com/pzubar))
* [#1090](https://github.com/tylerturdenpants/ember-attacher/pull/1090) Bump postcss-selector-parser ([@dependabot](https://github.com/apps/dependabot) / [@pzubar](https://github.com/pzubar))

#### Committers: 1
- Petro Zubar ([@pzubar](https://github.com/pzubar))


## v4.2.0 (2026-11-12)

#### :rocket: Enhancement
* [#1087](https://github.com/tylerturdenpants/ember-attacher/pull/1087) / [#1049](https://github.com/tylerturdenpants/ember-attacher/issues/1049) Additive explicit-target interface ([@pzubar](https://github.com/pzubar))
* [#1084](https://github.com/tylerturdenpants/ember-attacher/pull/1084) / [#1068](https://github.com/tylerturdenpants/ember-attacher/issues/1068) Public CSS custom properties ([@pzubar](https://github.com/pzubar))
* Target resolution seam ([@pzubar](https://github.com/pzubar))

#### :bug: Bug Fix
* [#1088](https://github.com/tylerturdenpants/ember-attacher/pull/1088) Fix Floating UI lifecycle race on hide/teardown (`getComputedStyle` TypeError) ([@pzubar](https://github.com/pzubar))
* Keep autoUpdate stopped while hidden after options re-render ([@pzubar](https://github.com/pzubar))

#### :house: Internal
* [#1088](https://github.com/tylerturdenpants/ember-attacher/pull/1088) Bump lodash.omit 4.5.0 → 4.18.0 ([@dependabot](https://github.com/apps/dependabot))
* [#1089](https://github.com/tylerturdenpants/ember-attacher/pull/1089) Bump undici 6.28.1 → 6.29.1 ([@dependabot](https://github.com/apps/dependabot))

#### Committers: 1
- Petro Zubar ([@pzubar](https://github.com/pzubar))


## v3.1.0 (2024-03-07)
#### :rocket: Enhancement
* [#932](https://github.com/tylerturdenpants/ember-attacher/pull/932) Drop `@ember/render-modifiers` ([@pzubar](https://github.com/pzubar))
* [#887](https://github.com/tylerturdenpants/ember-attacher/pull/887) [chore]: Bump ember-cli-babel from 7.26.11 to 8.2.0 ([@dependabot[bot]](https://github.com/apps/dependabot))

#### Committers: 1
- Petro Zubar ([@pzubar](https://github.com/pzubar))

## v3.0.0 (2024-03-06)

#### :boom: Breaking Change
* [#843](https://github.com/tylerturdenpants/ember-attacher/pull/843) Drop ember-in-element-polyfill from dependencies ([@pzubar](https://github.com/pzubar))

#### Committers: 1
- Petro Zubar ([@pzubar](https://github.com/pzubar))

## v2.0.8 (2024-01-16)

#### :rocket: Enhancement
* [#820](https://github.com/tylerturdenpants/ember-attacher/pull/820) Fix the "cancelAnimationFrame is not defined" error in fastboot ([@pzubar](https://github.com/pzubar))
* [#790](https://github.com/tylerturdenpants/ember-attacher/pull/790) Bump ember-maybe-in-element to supress build-time warning ([@pzubar](https://github.com/pzubar))
* [#784](https://github.com/tylerturdenpants/ember-attacher/pull/784) Prevent overflow by default ([@pzubar](https://github.com/pzubar))

#### :bug: Bug Fix
* [#820](https://github.com/tylerturdenpants/ember-attacher/pull/820) Fix the "cancelAnimationFrame is not defined" error in fastboot ([@pzubar](https://github.com/pzubar))
* [#807](https://github.com/tylerturdenpants/ember-attacher/pull/807) Fix the stripInProduction for the apps and the runtime error ([@pzubar](https://github.com/pzubar))
* [#794](https://github.com/tylerturdenpants/ember-attacher/pull/794) Fix test error caused by wrong endAsync call ([@pzubar](https://github.com/pzubar))
* [#784](https://github.com/tylerturdenpants/ember-attacher/pull/784) Prevent overflow by default ([@pzubar](https://github.com/pzubar))

#### :house: Internal
* [#827](https://github.com/tylerturdenpants/ember-attacher/pull/827) [chore]: Bump @ember/test-helpers from 2.9.3 to 2.9.4 ([@dependabot[bot]](https://github.com/apps/dependabot))
* [#786](https://github.com/tylerturdenpants/ember-attacher/pull/786) [chore]: Bump @ember/string from 3.0.1 to 3.1.1 ([@dependabot[bot]](https://github.com/apps/dependabot))
* [#833](https://github.com/tylerturdenpants/ember-attacher/pull/833) [chore]: Bump ember-source from 4.12.0 to 4.12.3 ([@dependabot[bot]](https://github.com/apps/dependabot))
* [#834](https://github.com/tylerturdenpants/ember-attacher/pull/834) [chore]: Bump eslint-plugin-ember from 11.5.2 to 11.10.0 ([@dependabot[bot]](https://github.com/apps/dependabot))
* [#835](https://github.com/tylerturdenpants/ember-attacher/pull/835) [chore]: Bump semver from 5.7.1 to 5.7.2 ([@dependabot[bot]](https://github.com/apps/dependabot))
* [#819](https://github.com/tylerturdenpants/ember-attacher/pull/819) [chore]: Bump eslint from 8.40.0 to 8.43.0 ([@dependabot[bot]](https://github.com/apps/dependabot))
* [#811](https://github.com/tylerturdenpants/ember-attacher/pull/811) Remove the "beyond ember 3.24" support note ([@pzubar](https://github.com/pzubar))
* [#783](https://github.com/tylerturdenpants/ember-attacher/pull/783) Upgrade Ember to v4 ([@pzubar](https://github.com/pzubar))

#### Committers: 1
- Petro Zubar ([@pzubar](https://github.com/pzubar))

## v2.0.1 (2023-05-15)

#### :boom: Breaking Change
* [#772](https://github.com/tylerturdenpants/ember-attacher/pull/772) Convert to Glimmer component ([@pzubar](https://github.com/pzubar))
* [#743](https://github.com/tylerturdenpants/ember-attacher/pull/743) Migration to the Floating UI ([@pzubar](https://github.com/pzubar))

#### :rocket: Enhancement
* [#772](https://github.com/tylerturdenpants/ember-attacher/pull/772) Convert to Glimmer component ([@pzubar](https://github.com/pzubar))
* [#759](https://github.com/tylerturdenpants/ember-attacher/pull/759) Bump dependencies ([@pzubar](https://github.com/pzubar))
* [#743](https://github.com/tylerturdenpants/ember-attacher/pull/743) Migration to the Floating UI ([@pzubar](https://github.com/pzubar))
* [#561](https://github.com/tylerturdenpants/ember-attacher/pull/561) Avoid forcing dart ([@kmccullough](https://github.com/kmccullough))

#### :house: Internal
* [#759](https://github.com/tylerturdenpants/ember-attacher/pull/759) Bump dependencies ([@pzubar](https://github.com/pzubar))

#### Committers: 2
- Kerry McCullough ([@kmccullough](https://github.com/kmccullough))
- Petro Zubar ([@pzubar](https://github.com/pzubar))

## v1.3.0 (2021-09-09)

#### :rocket: Enhancement
* [#553](https://github.com/kybishop/ember-attacher/pull/553) Remove warning for popover/tooltip in config ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#550](https://github.com/kybishop/ember-attacher/pull/550) Better default handling ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#488](https://github.com/kybishop/ember-attacher/pull/488) Remove excess whitespace content ([@kmccullough](https://github.com/kmccullough))
* [#446](https://github.com/kybishop/ember-attacher/pull/446) add svg-jar to replace ember-font-awesome ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#427](https://github.com/kybishop/ember-attacher/pull/427) update to ember-qunit 5 ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### :bug: Bug Fix
* [#479](https://github.com/kybishop/ember-attacher/pull/479) Remove addons that use old AST builder syntax API's ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### :house: Internal
* [#553](https://github.com/kybishop/ember-attacher/pull/553) Remove warning for popover/tooltip in config ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#549](https://github.com/kybishop/ember-attacher/pull/549) Use github-actions-setup-for-ember-addon ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#446](https://github.com/kybishop/ember-attacher/pull/446) add svg-jar to replace ember-font-awesome ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#427](https://github.com/kybishop/ember-attacher/pull/427) update to ember-qunit 5 ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#479](https://github.com/kybishop/ember-attacher/pull/479) Remove addons that use old AST builder syntax API's ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### Committers: 4
- Kerry McCullough ([@kmccullough](https://github.com/kmccullough))
- Peter Wagenet ([@wagenet](https://github.com/wagenet))
- Ryan Mark ([@tylerturdenpants](https://github.com/tylerturdenpants))
- [@dependabot-preview[bot]](https://github.com/apps/dependabot-preview)

## v1.3.0-beta.3 (2021-09-02)

#### :rocket: Enhancement
* [#550](https://github.com/kybishop/ember-attacher/pull/550) Better default handling ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#488](https://github.com/kybishop/ember-attacher/pull/488) Remove excess whitespace content ([@kmccullough](https://github.com/kmccullough))
* [#446](https://github.com/kybishop/ember-attacher/pull/446) add svg-jar to replace ember-font-awesome ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#427](https://github.com/kybishop/ember-attacher/pull/427) update to ember-qunit 5 ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### :bug: Bug Fix
* [#479](https://github.com/kybishop/ember-attacher/pull/479) Remove addons that use old AST builder syntax API's ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### :house: Internal
* [#549](https://github.com/kybishop/ember-attacher/pull/549) Use github-actions-setup-for-ember-addon ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#446](https://github.com/kybishop/ember-attacher/pull/446) add svg-jar to replace ember-font-awesome ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#427](https://github.com/kybishop/ember-attacher/pull/427) update to ember-qunit 5 ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#479](https://github.com/kybishop/ember-attacher/pull/479) Remove addons that use old AST builder syntax API's ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### Committers: 4
- Kerry McCullough ([@kmccullough](https://github.com/kmccullough))
- Peter Wagenet ([@wagenet](https://github.com/wagenet))
- Ryan Mark ([@tylerturdenpants](https://github.com/tylerturdenpants))
- [@dependabot-preview[bot]](https://github.com/apps/dependabot-preview)

## v1.2.3 (2020-12-08)

#### :bug: Bug Fix
* [#388](https://github.com/kybishop/ember-attacher/pull/388) Fix user supplied attributes ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#383](https://github.com/kybishop/ember-attacher/pull/383) Exclude class from defaults test ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### Committers: 1
- Ryan Mark ([@tylerturdenpants](https://github.com/tylerturdenpants))

## v1.2.1 (2020-10-29)

#### :bug: Bug Fix
* [#362](https://github.com/kybishop/ember-attacher/pull/362) Fix optional class name feature ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### Committers: 1
- Ryan Mark ([@tylerturdenpants](https://github.com/tylerturdenpants))

## v1.2.0 (2020-10-28)

#### :boom: Breaking Change
* [#359](https://github.com/kybishop/ember-attacher/pull/359) Upgrade to native class usage ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### :rocket: Enhancement
* [#361](https://github.com/kybishop/ember-attacher/pull/361) Bump packages ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#359](https://github.com/kybishop/ember-attacher/pull/359) Upgrade to native class usage ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### :house: Internal
* [#361](https://github.com/kybishop/ember-attacher/pull/361) Bump packages ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#360](https://github.com/kybishop/ember-attacher/pull/360) Fix markdown files ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#359](https://github.com/kybishop/ember-attacher/pull/359) Upgrade to native class usage ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### Committers: 3
- Ryan Mark ([@tylerturdenpants](https://github.com/tylerturdenpants))
- [@dependabot-preview[bot]](https://github.com/apps/dependabot-preview)
- [@endevea](https://github.com/endevea)

## v1.1.1 (2020-03-12)

#### :bug: Bug Fix
* [#218](https://github.com/kybishop/ember-attacher/pull/218) fix: delay hide until popperElement is set ([@urbany](https://github.com/urbany))

#### Committers: 1
- João Teixeira ([@urbany](https://github.com/urbany))

## v1.1.0 (2020-03-05)

#### :boom: Breaking Change
* [#201](https://github.com/kybishop/ember-attacher/pull/201) Remove support for Ember 3.4 ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#195](https://github.com/kybishop/ember-attacher/pull/195) Remove support for node 8 ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### :house: Internal
* [#211](https://github.com/kybishop/ember-attacher/pull/211) Add Dependabot config ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#196](https://github.com/kybishop/ember-attacher/pull/196) Update all packages ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#198](https://github.com/kybishop/ember-attacher/pull/198) Add Yarn Cache to Github Actions ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#197](https://github.com/kybishop/ember-attacher/pull/197) Move to GitHub Actions ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### Committers: 2
- Ryan Mark ([@tylerturdenpants](https://github.com/tylerturdenpants))
- [@dependabot-preview[bot]](https://github.com/apps/dependabot-preview)

* Fix exception when object is destroyed or destroying (#191) (39e0a85)

## v1.0.1 (2019-11-14)

#### :bug: Bug Fix
* [#190](https://github.com/kybishop/ember-attacher/pull/190) downgrade ember-power-select ([@tylerturdenpants](https://github.com/tylerturdenpants))

#### Committers: 1
- Ryan Mark ([@tylerturdenpants](https://github.com/tylerturdenpants))

## v1.0.0 (2019-11-14)

#### :boom: Breaking Change
* [#175](https://github.com/kybishop/ember-attacher/pull/175) Update to ember-cli 3.13 ([@jrjohnson](https://github.com/jrjohnson))

#### :rocket: Enhancement
* [#185](https://github.com/kybishop/ember-attacher/pull/185) add release-it ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#181](https://github.com/kybishop/ember-attacher/pull/181) Add class to know if popover has arrow ([@ctjhoa](https://github.com/ctjhoa))

#### :bug: Bug Fix
* [#189](https://github.com/kybishop/ember-attacher/pull/189) decouple release from deploy ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#186](https://github.com/kybishop/ember-attacher/pull/186) No exception when this._popperElement not set ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#177](https://github.com/kybishop/ember-attacher/pull/177) fix(lazyRender and isShown set manually) (#176) ([@ctjhoa](https://github.com/ctjhoa))

#### :house: Internal
* [#174](https://github.com/kybishop/ember-attacher/pull/174) Update packages ([@tylerturdenpants](https://github.com/tylerturdenpants))
* [#180](https://github.com/kybishop/ember-attacher/pull/180) Improve tests ([@ctjhoa](https://github.com/ctjhoa))

#### Committers: 3
- Camille TJHOA ([@ctjhoa](https://github.com/ctjhoa))
- Jonathan Johnson ([@jrjohnson](https://github.com/jrjohnson))
- Ryan Mark ([@tylerturdenpants](https://github.com/tylerturdenpants))

# Change Log

## [v0.15.1](https://github.com/kybishop/ember-attacher/tree/HEAD) (2019-07-09)

[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.15.1...HEAD)

**Closed issues:**

- Releasing should be easier [\#171](https://github.com/kybishop/ember-attacher/issues/171)
- Dependency lint finds multiple version of  ember-maybe-in-element [\#170](https://github.com/kybishop/ember-attacher/issues/170)
- Seeking Maintainers [\#162](https://github.com/kybishop/ember-attacher/issues/162)

**Merged pull requests:**

- add scripts for all types of publishes \(patch/minor/major\) [\#172](https://github.com/kybishop/ember-attacher/pull/172) ([tylerturdenpants](https://github.com/tylerturdenpants))
- updated ember-popper [\#169](https://github.com/kybishop/ember-attacher/pull/169) ([tylerturdenpants](https://github.com/tylerturdenpants))

## [v0.14.0](https://github.com/kybishop/ember-attacher/tree/v0.14.0) (2019-05-30)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.10...v0.14.0)

**Closed issues:**

- Deprecation warning in Ember 3.9 [\#164](https://github.com/kybishop/ember-attacher/issues/164)

**Merged pull requests:**

- Version 0.14.0 [\#166](https://github.com/kybishop/ember-attacher/pull/166) ([luketheobscure](https://github.com/luketheobscure))
- Fix computed-property.override deprecation in Ember 3.9 [\#165](https://github.com/kybishop/ember-attacher/pull/165) ([richard-viney](https://github.com/richard-viney))
- fix: prevent modifiers with functions from being lost on parse [\#163](https://github.com/kybishop/ember-attacher/pull/163) ([urbany](https://github.com/urbany))
- FEATURE - Add useCapture config option [\#159](https://github.com/kybishop/ember-attacher/pull/159) ([richard-viney](https://github.com/richard-viney))

## [v0.13.10](https://github.com/kybishop/ember-attacher/tree/v0.13.10) (2018-10-12)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.9...v0.13.10)

**Closed issues:**

- Error: Could not find module `ember-native-dom-helpers` imported from `ember-attacher/is-visible` [\#140](https://github.com/kybishop/ember-attacher/issues/140)

**Merged pull requests:**

- remove hidden ember-native-dom-helpers dependency [\#154](https://github.com/kybishop/ember-attacher/pull/154) ([kybishop](https://github.com/kybishop))
- Upgrade to ember 3.4 [\#153](https://github.com/kybishop/ember-attacher/pull/153) ([kybishop](https://github.com/kybishop))

## [v0.13.9](https://github.com/kybishop/ember-attacher/tree/v0.13.9) (2018-10-12)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.8...v0.13.9)

**Closed issues:**

- Could not find module `ember-compatibility-helpers` imported from `@ember-decorators/argument/-debug/utils/validation-decorator` [\#151](https://github.com/kybishop/ember-attacher/issues/151)
- Dependency lint finds multiple version of ember-compatibility-helpers [\#127](https://github.com/kybishop/ember-attacher/issues/127)

**Merged pull requests:**

- bump ember-popper to v0.9.2 [\#152](https://github.com/kybishop/ember-attacher/pull/152) ([kybishop](https://github.com/kybishop))
- Fix typo [\#150](https://github.com/kybishop/ember-attacher/pull/150) ([ctjhoa](https://github.com/ctjhoa))

## [v0.13.8](https://github.com/kybishop/ember-attacher/tree/v0.13.8) (2018-09-28)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.7...v0.13.8)

**Closed issues:**

- Deprecation: Use closure actions instead of `sendAction` [\#148](https://github.com/kybishop/ember-attacher/issues/148)
- Few files missing 404 errors [\#142](https://github.com/kybishop/ember-attacher/issues/142)
- Replace ember-cli-sass with postcss [\#108](https://github.com/kybishop/ember-attacher/issues/108)

**Merged pull requests:**

- Use closure actions instead of sendAction [\#149](https://github.com/kybishop/ember-attacher/pull/149) ([scottwernervt](https://github.com/scottwernervt))
- Update ember-cli-sass [\#147](https://github.com/kybishop/ember-attacher/pull/147) ([jrjohnson](https://github.com/jrjohnson))

## [v0.13.7](https://github.com/kybishop/ember-attacher/tree/v0.13.7) (2018-07-25)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.6...v0.13.7)

**Closed issues:**

- Tweak the CSS to work with positions like right-start [\#139](https://github.com/kybishop/ember-attacher/issues/139)
- Animation support for more Popper.js placements \(right-start, etc.\) [\#134](https://github.com/kybishop/ember-attacher/issues/134)
- Animation: 'fill' is not compatible with arrow: true [\#126](https://github.com/kybishop/ember-attacher/issues/126)
- Tooltip background color is transparent for long text. [\#101](https://github.com/kybishop/ember-attacher/issues/101)

**Merged pull requests:**

- fix\(warning on arrow/fill incompat\) [\#144](https://github.com/kybishop/ember-attacher/pull/144) ([kybishop](https://github.com/kybishop))
- feat: works with placement modifiers \(start/end\) [\#143](https://github.com/kybishop/ember-attacher/pull/143) ([urbany](https://github.com/urbany))

## [v0.13.6](https://github.com/kybishop/ember-attacher/tree/v0.13.6) (2018-05-25)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.5...v0.13.6)

**Closed issues:**

- lazyLoad + showDelay causes error  [\#137](https://github.com/kybishop/ember-attacher/issues/137)
- Apply Dynamic Styles [\#135](https://github.com/kybishop/ember-attacher/issues/135)

**Merged pull requests:**

- fix\(race conditions with lazyRender and showDelay\) [\#138](https://github.com/kybishop/ember-attacher/pull/138) ([kybishop](https://github.com/kybishop))
- Pass in style attribute to style attachment [\#136](https://github.com/kybishop/ember-attacher/pull/136) ([jrjohnson](https://github.com/jrjohnson))

## [v0.13.5](https://github.com/kybishop/ember-attacher/tree/v0.13.5) (2018-04-27)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.4...v0.13.5)

**Merged pull requests:**

- chore\(remove package-lock.json\) [\#132](https://github.com/kybishop/ember-attacher/pull/132) ([kybishop](https://github.com/kybishop))

## [v0.13.4](https://github.com/kybishop/ember-attacher/tree/v0.13.4) (2018-04-27)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.3...v0.13.4)

**Closed issues:**

- addon.sass file not found [\#130](https://github.com/kybishop/ember-attacher/issues/130)

**Merged pull requests:**

- Enable sass [\#131](https://github.com/kybishop/ember-attacher/pull/131) ([lamabiker](https://github.com/lamabiker))
- fix\(user-supplied animation default can now prevent arrow warning\) [\#129](https://github.com/kybishop/ember-attacher/pull/129) ([kybishop](https://github.com/kybishop))
- Improve README [\#128](https://github.com/kybishop/ember-attacher/pull/128) ([mostafa-sakhiri](https://github.com/mostafa-sakhiri))

## [v0.13.3](https://github.com/kybishop/ember-attacher/tree/v0.13.3) (2018-04-03)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.2...v0.13.3)

**Closed issues:**

- TypeError: Cannot set property arrow of \[object Object\] which has only a getter [\#123](https://github.com/kybishop/ember-attacher/issues/123)
- Unnecessary `babel-eslint` dependency? [\#122](https://github.com/kybishop/ember-attacher/issues/122)
- Using with overlays? [\#120](https://github.com/kybishop/ember-attacher/issues/120)

**Merged pull requests:**

- fix\(user-supplied default for "arrow"\) [\#124](https://github.com/kybishop/ember-attacher/pull/124) ([kybishop](https://github.com/kybishop))
- chore\(bump deps\) ember 3.0 [\#119](https://github.com/kybishop/ember-attacher/pull/119) ([kybishop](https://github.com/kybishop))

## [v0.13.2](https://github.com/kybishop/ember-attacher/tree/v0.13.2) (2018-03-20)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.1...v0.13.2)

**Closed issues:**

- TypeError: setting getter-only property "eventsEnabled" [\#117](https://github.com/kybishop/ember-attacher/issues/117)
- setting `arrow: true` in config/environment.js throws error [\#114](https://github.com/kybishop/ember-attacher/issues/114)
- "Uncaught Error: Could not find module `@ember/component`" when upgrading from 0.11.4 to 0.13.1 [\#112](https://github.com/kybishop/ember-attacher/issues/112)
- Warning when setting 'modifiers' in app defaults \(environment.js\) [\#111](https://github.com/kybishop/ember-attacher/issues/111)
- Option to add an offset/padding [\#107](https://github.com/kybishop/ember-attacher/issues/107)
- Far too slow on initial render of pages with \> 100 tooltips [\#100](https://github.com/kybishop/ember-attacher/issues/100)
- Add GitHub "Star" button to example website [\#92](https://github.com/kybishop/ember-attacher/issues/92)
- Expose `registerAPI` [\#86](https://github.com/kybishop/ember-attacher/issues/86)

**Merged pull requests:**

- Expose register api [\#118](https://github.com/kybishop/ember-attacher/pull/118) ([kybishop](https://github.com/kybishop))
- chore\(improve example app\) [\#116](https://github.com/kybishop/ember-attacher/pull/116) ([kybishop](https://github.com/kybishop))
- feat: get hideOn clickout to work on iOS [\#115](https://github.com/kybishop/ember-attacher/pull/115) ([necojackarc](https://github.com/necojackarc))
- add modifiers to DEFAULTS [\#113](https://github.com/kybishop/ember-attacher/pull/113) ([enkol](https://github.com/enkol))
- feat\(true lazy rendering\) [\#102](https://github.com/kybishop/ember-attacher/pull/102) ([kybishop](https://github.com/kybishop))

## [v0.13.1](https://github.com/kybishop/ember-attacher/tree/v0.13.1) (2018-02-13)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.13.0...v0.13.1)

**Closed issues:**

- Block-scoped declarations \(let, const, function, class\) not yet supported outside strict mode [\#106](https://github.com/kybishop/ember-attacher/issues/106)
- Warning in ember-cli console [\#105](https://github.com/kybishop/ember-attacher/issues/105)

**Merged pull requests:**

- chore\(bump deps\) ember 2.18, etc. [\#110](https://github.com/kybishop/ember-attacher/pull/110) ([kybishop](https://github.com/kybishop))
- Fix missing back tick [\#104](https://github.com/kybishop/ember-attacher/pull/104) ([ctjhoa](https://github.com/ctjhoa))
- Fix credit link [\#103](https://github.com/kybishop/ember-attacher/pull/103) ([ctjhoa](https://github.com/ctjhoa))

## [v0.13.0](https://github.com/kybishop/ember-attacher/tree/v0.13.0) (2017-12-04)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.12.2...v0.13.0)

**Closed issues:**

- Jank when using isShown=true with animation="fill" [\#99](https://github.com/kybishop/ember-attacher/issues/99)
- Popper briefly flickers in top left on initial show if no animation is used [\#95](https://github.com/kybishop/ember-attacher/issues/95)
- Attacher-Component breaks ember-metrics [\#93](https://github.com/kybishop/ember-attacher/issues/93)

**Merged pull requests:**

- chore\(bump deps\) ember 2.17, etc. [\#98](https://github.com/kybishop/ember-attacher/pull/98) ([kybishop](https://github.com/kybishop))
- fix\(initial positioning flicker when not using animations\) [\#97](https://github.com/kybishop/ember-attacher/pull/97) ([kybishop](https://github.com/kybishop))
- BREAKING\(update popper dep\) target arg is now popperTarget [\#96](https://github.com/kybishop/ember-attacher/pull/96) ([kybishop](https://github.com/kybishop))

## [v0.12.2](https://github.com/kybishop/ember-attacher/tree/v0.12.2) (2017-11-28)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.12.1...v0.12.2)

**Closed issues:**

- Causes my builds to fail? [\#87](https://github.com/kybishop/ember-attacher/issues/87)
- hideOn and showOn broken when undefined [\#76](https://github.com/kybishop/ember-attacher/issues/76)

**Merged pull requests:**

- fix\(initial positioning\) larger attachments stay in window more reliably [\#91](https://github.com/kybishop/ember-attacher/pull/91) ([kybishop](https://github.com/kybishop))
- fix\(hideOn/showOn set to '' should set them to null\) [\#89](https://github.com/kybishop/ember-attacher/pull/89) ([kybishop](https://github.com/kybishop))
- feat\(use defaults for hideOn/showOn when passed undefined\) [\#88](https://github.com/kybishop/ember-attacher/pull/88) ([kybishop](https://github.com/kybishop))

## [v0.12.1](https://github.com/kybishop/ember-attacher/tree/v0.12.1) (2017-11-04)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.12.0...v0.12.1)

**Closed issues:**

- Dev-mode currently borked for v0.12.0 [\#84](https://github.com/kybishop/ember-attacher/issues/84)

**Merged pull requests:**

- chore\(bump deps\) ember-popper for bugfix [\#85](https://github.com/kybishop/ember-attacher/pull/85) ([kybishop](https://github.com/kybishop))

## [v0.12.0](https://github.com/kybishop/ember-attacher/tree/v0.12.0) (2017-11-03)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.4...v0.12.0)

**Closed issues:**

- Testing [\#40](https://github.com/kybishop/ember-attacher/issues/40)

**Merged pull requests:**

- Update readme [\#83](https://github.com/kybishop/ember-attacher/pull/83) ([kybishop](https://github.com/kybishop))
- fix\(css\) better tooltip widths [\#82](https://github.com/kybishop/ember-attacher/pull/82) ([kybishop](https://github.com/kybishop))
- BREAKING\(get rid of inner component\) [\#81](https://github.com/kybishop/ember-attacher/pull/81) ([kybishop](https://github.com/kybishop))
- Set aria-hidden when showing/hiding [\#80](https://github.com/kybishop/ember-attacher/pull/80) ([rwwagner90](https://github.com/rwwagner90))
- chore\(upgrade deps\) ember 2.16, etc. [\#79](https://github.com/kybishop/ember-attacher/pull/79) ([kybishop](https://github.com/kybishop))
- Move mixins to separate file, reduce redundant styles [\#78](https://github.com/kybishop/ember-attacher/pull/78) ([rwwagner90](https://github.com/rwwagner90))

## [v0.11.4](https://github.com/kybishop/ember-attacher/tree/v0.11.4) (2017-10-18)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.3...v0.11.4)

**Closed issues:**

- Feature Request - Lazy Render [\#74](https://github.com/kybishop/ember-attacher/issues/74)

**Merged pull requests:**

- Support innerClass option [\#77](https://github.com/kybishop/ember-attacher/pull/77) ([rwwagner90](https://github.com/rwwagner90))
- Adds lazyRender support [\#75](https://github.com/kybishop/ember-attacher/pull/75) ([Duder-onomy](https://github.com/Duder-onomy))

## [v0.11.3](https://github.com/kybishop/ember-attacher/tree/v0.11.3) (2017-09-22)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.2...v0.11.3)

**Closed issues:**

- Cannot find module package.json [\#72](https://github.com/kybishop/ember-attacher/issues/72)
- Syntax error in IE 11 on development build [\#71](https://github.com/kybishop/ember-attacher/issues/71)

**Merged pull requests:**

- fix\(filters\) downgrade babel-plugin-filter-imports [\#73](https://github.com/kybishop/ember-attacher/pull/73) ([kybishop](https://github.com/kybishop))
- feat\(isVisible test helper\) [\#70](https://github.com/kybishop/ember-attacher/pull/70) ([kybishop](https://github.com/kybishop))
- chore\(showOn tests\) focus and mouseenter [\#69](https://github.com/kybishop/ember-attacher/pull/69) ([kybishop](https://github.com/kybishop))

## [v0.11.2](https://github.com/kybishop/ember-attacher/tree/v0.11.2) (2017-09-20)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.1...v0.11.2)

**Merged pull requests:**

- fix\(perf\) manually add run loop to RAF calls [\#68](https://github.com/kybishop/ember-attacher/pull/68) ([kybishop](https://github.com/kybishop))

## [v0.11.1](https://github.com/kybishop/ember-attacher/tree/v0.11.1) (2017-09-16)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.11.0...v0.11.1)

**Merged pull requests:**

- chore\(bump deps\) ember-popper 0.6.4, etc. [\#67](https://github.com/kybishop/ember-attacher/pull/67) ([kybishop](https://github.com/kybishop))

## [v0.11.0](https://github.com/kybishop/ember-attacher/tree/v0.11.0) (2017-09-08)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.6...v0.11.0)

**Closed issues:**

- Document attach-tooltip in the README [\#60](https://github.com/kybishop/ember-attacher/issues/60)
- Bug? Multiple tooltips can open when browser loses/gains focus. [\#54](https://github.com/kybishop/ember-attacher/issues/54)

**Merged pull requests:**

- Update readme [\#66](https://github.com/kybishop/ember-attacher/pull/66) ([kybishop](https://github.com/kybishop))
- Attach tooltip improvements and passthrough ariaRole [\#65](https://github.com/kybishop/ember-attacher/pull/65) ([kybishop](https://github.com/kybishop))

## [v0.10.6](https://github.com/kybishop/ember-attacher/tree/v0.10.6) (2017-09-07)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.5...v0.10.6)

**Merged pull requests:**

- Use RAF for animations [\#63](https://github.com/kybishop/ember-attacher/pull/63) ([kybishop](https://github.com/kybishop))
- fix\(more foolproof initial position\) [\#62](https://github.com/kybishop/ember-attacher/pull/62) ([kybishop](https://github.com/kybishop))

## [v0.10.5](https://github.com/kybishop/ember-attacher/tree/v0.10.5) (2017-09-05)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.4...v0.10.5)

**Closed issues:**

- Popover/tooltip doesn't reposition on sharp browser resize. [\#43](https://github.com/kybishop/ember-attacher/issues/43)

**Merged pull requests:**

- chore\(bump deps\) ember-cli, ember-popper, etc. [\#61](https://github.com/kybishop/ember-attacher/pull/61) ([kybishop](https://github.com/kybishop))

## [v0.10.4](https://github.com/kybishop/ember-attacher/tree/v0.10.4) (2017-09-01)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.3...v0.10.4)

**Closed issues:**

- Adding aria-describedby attribute to target? [\#37](https://github.com/kybishop/ember-attacher/issues/37)
- How to test usage of addon? [\#34](https://github.com/kybishop/ember-attacher/issues/34)

**Merged pull requests:**

- fix\(initial position\) more foolproof when using isShown [\#59](https://github.com/kybishop/ember-attacher/pull/59) ([kybishop](https://github.com/kybishop))
- Test fixups [\#58](https://github.com/kybishop/ember-attacher/pull/58) ([kybishop](https://github.com/kybishop))
- feat\(attach-tooltip component\) has expected tooltip defaults [\#57](https://github.com/kybishop/ember-attacher/pull/57) ([kybishop](https://github.com/kybishop))
- chore\(remove jquery\) [\#56](https://github.com/kybishop/ember-attacher/pull/56) ([kybishop](https://github.com/kybishop))
- chore\(tests for hideOn='mouseleave'\) [\#55](https://github.com/kybishop/ember-attacher/pull/55) ([kybishop](https://github.com/kybishop))

## [v0.10.3](https://github.com/kybishop/ember-attacher/tree/v0.10.3) (2017-08-29)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.2...v0.10.3)

**Closed issues:**

- Regression? attacher's hide action does not hide on subsequent interaction [\#53](https://github.com/kybishop/ember-attacher/issues/53)
- hideOn support for pressing the escape key [\#36](https://github.com/kybishop/ember-attacher/issues/36)

**Merged pull requests:**

- Update README.md examples [\#52](https://github.com/kybishop/ember-attacher/pull/52) ([GCheung55](https://github.com/GCheung55))
- feat\(hideOn escapekey\) [\#51](https://github.com/kybishop/ember-attacher/pull/51) ([kybishop](https://github.com/kybishop))

## [v0.10.2](https://github.com/kybishop/ember-attacher/tree/v0.10.2) (2017-08-28)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.1...v0.10.2)

**Closed issues:**

- Add hideOn support for clickout [\#39](https://github.com/kybishop/ember-attacher/issues/39)

**Merged pull requests:**

- feat\(hideOn clickout\) [\#50](https://github.com/kybishop/ember-attacher/pull/50) ([kybishop](https://github.com/kybishop))

## [v0.10.1](https://github.com/kybishop/ember-attacher/tree/v0.10.1) (2017-08-28)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.10.0...v0.10.1)

**Closed issues:**

- isShown, showOn, and hideOn do not work together [\#25](https://github.com/kybishop/ember-attacher/issues/25)

**Merged pull requests:**

- feat\(onchange hook on visibility change\) [\#49](https://github.com/kybishop/ember-attacher/pull/49) ([kybishop](https://github.com/kybishop))
- fix\(isShown and initial positioning + multi-hide bugs\) [\#48](https://github.com/kybishop/ember-attacher/pull/48) ([kybishop](https://github.com/kybishop))

## [v0.10.0](https://github.com/kybishop/ember-attacher/tree/v0.10.0) (2017-08-27)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.9.0...v0.10.0)

**Closed issues:**

- Bug? mouseleave event adds mousemove event when interactive is true. [\#42](https://github.com/kybishop/ember-attacher/issues/42)
- use class instead of popperClass [\#41](https://github.com/kybishop/ember-attacher/issues/41)
- Tests should demonstrate testing other events. [\#38](https://github.com/kybishop/ember-attacher/issues/38)

**Merged pull requests:**

- chore\(follow eslint with ember-suave\) [\#47](https://github.com/kybishop/ember-attacher/pull/47) ([kybishop](https://github.com/kybishop))
- fix\(focus-out events should respect interactive\) [\#46](https://github.com/kybishop/ember-attacher/pull/46) ([kybishop](https://github.com/kybishop))
- feat\(tagless component\) popperClass is now class and id is passed to attachment [\#45](https://github.com/kybishop/ember-attacher/pull/45) ([kybishop](https://github.com/kybishop))
- fix\(interactive hideOn mouseleave\) only add listener once [\#44](https://github.com/kybishop/ember-attacher/pull/44) ([kybishop](https://github.com/kybishop))
- fix\(tests\) add waits for didInsertElement and show delay after clicking [\#35](https://github.com/kybishop/ember-attacher/pull/35) ([kybishop](https://github.com/kybishop))
- feat\(warnings in tests\) don't strip warnings in tests [\#33](https://github.com/kybishop/ember-attacher/pull/33) ([kybishop](https://github.com/kybishop))

## [v0.9.0](https://github.com/kybishop/ember-attacher/tree/v0.9.0) (2017-08-23)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.4...v0.9.0)

## [v0.8.4](https://github.com/kybishop/ember-attacher/tree/v0.8.4) (2017-08-23)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.3...v0.8.4)

**Closed issues:**

- Generic CSS selectors conflicts with other CSS libs [\#28](https://github.com/kybishop/ember-attacher/issues/28)

**Merged pull requests:**

- Cleanup and fixes for non-default app container [\#32](https://github.com/kybishop/ember-attacher/pull/32) ([kybishop](https://github.com/kybishop))
- Renaming .popper and .tooltip [\#31](https://github.com/kybishop/ember-attacher/pull/31) ([GCheung55](https://github.com/GCheung55))
- Tests and code cleanup [\#30](https://github.com/kybishop/ember-attacher/pull/30) ([rwwagner90](https://github.com/rwwagner90))

## [v0.8.3](https://github.com/kybishop/ember-attacher/tree/v0.8.3) (2017-08-21)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.2...v0.8.3)

**Merged pull requests:**

- Check whether component is not destroyed inside `next` [\#29](https://github.com/kybishop/ember-attacher/pull/29) ([krasnoukhov](https://github.com/krasnoukhov))
- feat\(make isShown toggleable\) [\#27](https://github.com/kybishop/ember-attacher/pull/27) ([kybishop](https://github.com/kybishop))
- Module syntax [\#26](https://github.com/kybishop/ember-attacher/pull/26) ([rwwagner90](https://github.com/rwwagner90))

## [v0.8.2](https://github.com/kybishop/ember-attacher/tree/v0.8.2) (2017-08-18)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.1...v0.8.2)

**Merged pull requests:**

- fix\(destruction\) don't set isVisible when being destroyed [\#24](https://github.com/kybishop/ember-attacher/pull/24) ([kybishop](https://github.com/kybishop))

## [v0.8.1](https://github.com/kybishop/ember-attacher/tree/v0.8.1) (2017-08-17)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.8.0...v0.8.1)

## [v0.8.0](https://github.com/kybishop/ember-attacher/tree/v0.8.0) (2017-08-17)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.7.0...v0.8.0)

**Merged pull requests:**

- feat\(isShown\) add support for initial isShown state [\#23](https://github.com/kybishop/ember-attacher/pull/23) ([kybishop](https://github.com/kybishop))

## [v0.7.0](https://github.com/kybishop/ember-attacher/tree/v0.7.0) (2017-08-09)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.6.0...v0.7.0)

**Merged pull requests:**

- feat\(hide on focus-out\) also fix bugs with hideOnBlur [\#22](https://github.com/kybishop/ember-attacher/pull/22) ([kybishop](https://github.com/kybishop))

## [v0.6.0](https://github.com/kybishop/ember-attacher/tree/v0.6.0) (2017-07-25)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.5.1...v0.6.0)

**Merged pull requests:**

- chore\(bump deps\) ember popper v0.5 and more [\#21](https://github.com/kybishop/ember-attacher/pull/21) ([kybishop](https://github.com/kybishop))

## [v0.5.1](https://github.com/kybishop/ember-attacher/tree/v0.5.1) (2017-07-08)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.5.0...v0.5.1)

**Closed issues:**

- compatibility with babel 5 [\#13](https://github.com/kybishop/ember-attacher/issues/13)

**Merged pull requests:**

- fix\[imports\] absolute path for dev-only import [\#20](https://github.com/kybishop/ember-attacher/pull/20) ([kybishop](https://github.com/kybishop))
- fix\[babel options\] don't overwrite existing babel options [\#19](https://github.com/kybishop/ember-attacher/pull/19) ([kybishop](https://github.com/kybishop))
- chore\[bump deps\] ember-popper v0.3.1 and more [\#18](https://github.com/kybishop/ember-attacher/pull/18) ([kybishop](https://github.com/kybishop))

## [v0.5.0](https://github.com/kybishop/ember-attacher/tree/v0.5.0) (2017-06-27)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.4.0...v0.5.0)

**Closed issues:**

- FastBoot support: ReferenceError: document is not defined [\#15](https://github.com/kybishop/ember-attacher/issues/15)
- Tooltips delayed after scroll [\#4](https://github.com/kybishop/ember-attacher/issues/4)

**Merged pull requests:**

- chore\(tests\) added basic smoke test [\#17](https://github.com/kybishop/ember-attacher/pull/17) ([kybishop](https://github.com/kybishop))
- feat\(fastboot\) fastboot support [\#16](https://github.com/kybishop/ember-attacher/pull/16) ([kybishop](https://github.com/kybishop))
- Fix typo [\#12](https://github.com/kybishop/ember-attacher/pull/12) ([ctjhoa](https://github.com/ctjhoa))

## [v0.4.0](https://github.com/kybishop/ember-attacher/tree/v0.4.0) (2017-05-24)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.3.0...v0.4.0)

## [v0.3.0](https://github.com/kybishop/ember-attacher/tree/v0.3.0) (2017-05-18)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.2.1...v0.3.0)

**Closed issues:**

- Allow user-defined defaults that override the normal defaults [\#1](https://github.com/kybishop/ember-attacher/issues/1)

**Merged pull requests:**

- User-defined defaults [\#11](https://github.com/kybishop/ember-attacher/pull/11) ([enkol](https://github.com/enkol))

## [v0.2.1](https://github.com/kybishop/ember-attacher/tree/v0.2.1) (2017-05-18)
[Full Changelog](https://github.com/kybishop/ember-attacher/compare/v0.2.0...v0.2.1)

## [v0.2.0](https://github.com/kybishop/ember-attacher/tree/v0.2.0) (2017-05-18)
**Closed issues:**

- Warning shows up when running ember s [\#8](https://github.com/kybishop/ember-attacher/issues/8)
- actions in ember-attacher content dont' work if app customizes rootElement [\#6](https://github.com/kybishop/ember-attacher/issues/6)
- Error: Compile Error: eq is not a helper [\#5](https://github.com/kybishop/ember-attacher/issues/5)
- Installation fails when installing ember-popper with npm [\#2](https://github.com/kybishop/ember-attacher/issues/2)

**Merged pull requests:**

- pass through popperContainer [\#10](https://github.com/kybishop/ember-attacher/pull/10) ([kybishop](https://github.com/kybishop))
- update ember-popper dep [\#9](https://github.com/kybishop/ember-attacher/pull/9) ([kybishop](https://github.com/kybishop))
- include ember-truth-helpers [\#7](https://github.com/kybishop/ember-attacher/pull/7) ([kybishop](https://github.com/kybishop))
- fix installation of ember-popper [\#3](https://github.com/kybishop/ember-attacher/pull/3) ([kybishop](https://github.com/kybishop))



\* *This Change Log was automatically generated by [github_changelog_generator](https://github.com/skywinder/Github-Changelog-Generator)*
