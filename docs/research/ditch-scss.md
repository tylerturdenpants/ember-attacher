# How to ditch SCSS without a visual break

Research for [issue #1047](https://github.com/tylerturdenpants/ember-attacher/issues/1047).
No styles were converted in this note.

## Question

What is the smallest way to drop `sass` / `ember-cli-sass` (and the v2 rollup SCSS step) while keeping current visual output:

1. check in compiled CSS and drop sass from the published package
2. hand-expand mixins
3. CSS custom properties for themes

The visual surface that must not change: position/animation loops, arrows, tooltip chrome.

## Recommendation

**Check in the already-compiled CSS and stop compiling Sass.**

npm `ember-attacher@4.0.0` already publishes only `dist/styles/ember-attacher.css` (8.2 kB) and lists it in `ember-addon.implicit-styles`. That file *is* the expanded position × animation × arrow output. Keep that CSS as source, copy it into `dist` without `sass.compile`, delete the SCSS tree and the `sass` package.

Hand-expanding mixins would produce the same selectors. Custom properties do not remove the cartesian expansion and would be a new styling contract.

To match **3.x** tooltip chrome as well as **4.0.0**, prepend the 14-line flattened `.ember-attacher-light-theme` block (the only difference between compiling `addon.scss` and compiling `ember-attacher.scss`). That restore is a copy, not a Sass conversion.

## Current pipelines

### v1 (`origin/master`, 3.x)

`ember-cli-sass` and `sass` are **runtime `dependencies`**, not just build tools:

```39:41:package.json
    "ember-cli-sass": "^11.0.1",
    "ember-maybe-in-element": "^2.1.0",
    "sass": "^1.72.0"
```

Every 3.x consumer therefore installs Dart Sass. Ember CLI compiles `addon/styles/addon.scss` into the app vendor CSS. That entry file pulls in everything:

```1:5:addon/styles/addon.scss
@import 'variables';
@import 'mixins';
@import 'themes';

@import 'ember-attacher';
```

`addon/styles/addon.sass` is a byte-for-byte Sass-indented duplicate (historical workaround for [issue #130](https://github.com/kybishop/ember-attacher/issues/130) / [PR #131](https://github.com/kybishop/ember-attacher/pull/131)). Compiling `addon.scss` today emits Dart Sass 3.0 deprecations (`@import` and global `nth` / `index`).

There is no documented public mixin/variable API. The dummy app restyles popover chrome in `tests/dummy/app/styles/app.scss` instead of `@import`ing addon mixins. README “Styles” only promises CSS for `.ember-attacher-tooltip`, not a Sass API ([README.md](https://github.com/tylerturdenpants/ember-attacher/blob/601cb0d/README.md#styles)).

### v2 (`origin/v2-migration`, npm `4.0.0` on `beta`)

Commit `7e3246d` (“Updates to version 4.0.0 and add SCSS handling”) added a Rollup plugin that compiles **one** file:

- entry: `addon/src/styles/ember-attacher.scss` (not `addon.scss`)
- output asset: `dist/styles/ember-attacher.css`
- compiler: `sass.compile(..., { style: 'expanded' })`
- `sass` is an addon **devDependency** (`^1.94.2`), not a consumer dependency

Published `ember-attacher@4.0.0` (tarball sampled 2026-09-22):

- `files`: `addon-main.js`, `dist` — **no `.scss`**
- `exports["./styles"]`: `./dist/styles/ember-attacher.css`
- `ember-addon.implicit-styles`: `["./dist/styles/ember-attacher.css"]`

That is the v2 equivalent of v1 vendor CSS inclusion ([Embroider v2 spec, `implicit-styles`](https://embroider-build.github.io/embroider/docs/spec.html); [RFC 0507](https://rfcs.emberjs.com/id/0507-embroider-v2-package-format/)).

A leftover root `rollup.config.js` still has `addon.keepAssets(['**/*.css', '**/*.scss'])`. The real build is `addon/rollup.config.mjs`. `keepAssets` is for preserving **JS-imported** CSS ([`@embroider/addon-dev` README](https://github.com/embroider-build/embroider/blob/main/packages/addon-dev/README.md)); `implicit-styles` does not require a JS import, which is why 4.0.0 uses `this.emitFile` instead.

Recompiling `origin/v2-migration`’s `ember-attacher.scss` with Dart Sass `expanded` matches npm 4.0.0 CSS except a trailing newline.

## What SCSS actually compiles

Source on `origin/master` (`addon/styles/`, copied to `addon/src/styles/` on v2 with `@use` instead of `@import`):

| File | Lines | Role |
| --- | ---: | --- |
| `ember-attacher.scss` | 137 | Outer `.ember-attacher` shell, `@each $position`, tooltip chrome |
| `_mixins.scss` | 107 | `arrow`, `circle-transform-hide`, hide/show transforms |
| `variables.scss` | 3 | `$positions`, `$origins`, `$circle-origins` |
| `themes.scss` | 16 | `.ember-attacher-light-theme` color overrides (nested CSS) |
| `addon.scss` / `addon.sass` | 5 | Import graph only |

Sass features in use, and nothing else:

- one `@each` over `('top', 'bottom', 'left', 'right')`
- four mixins that are `@if` trees on `$position` / `$animation`
- `nth` / `index` to pick `transform-origin`
- `$width * .5` for the 10px arrow → `±5px` offsets
- `@import` / `@use` to stitch files

No functions, no maps, no color math, no theming API. Animations (`fade`, `fill`, `none`, `shift`, `scale`, `perspective`) are class names the component already applies (`ember-attacher-${animation}` in `addon/components/attach-popover.js`). Placement is a DOM attribute, `x-placement`, including hyphenated values; selectors use the prefix form `[x-placement^=#{$position}]` so `top-start` still hits `top` ([issue #139](https://github.com/kybishop/ember-attacher/issues/139) / [PR #143](https://github.com/kybishop/ember-attacher/pull/143)).

Compiled sizes (Dart Sass `expanded`, this machine):

| Entry | Lines | Bytes | Light theme |
| --- | ---: | ---: | --- |
| v1 `addon.scss` | 278 | 8643 | yes |
| v2 / npm 4.0.0 `ember-attacher.scss` | 263–264 | 8236 | **no** |

The position/animation/arrow/tooltip-chrome rules are identical in both. The **only** visual delta is the light-theme block at the top of the v1 output.

Tooltip chrome that must stay (from compiled CSS / `ember-attacher.scss`):

- `.ember-attacher`: `position: absolute; top: 0; left: 0; display: none; perspective: 800px; z-index: 9999;`
- `.ember-attacher-tooltip`: `#333` background, `4px` radius, `max-width: 400px`, padding, antialiased type
- `div[x-arrow]`: 10×10 square, `#333` fill/border, rotated per side
- `div[x-circle]`: fill animation disc (`scale(0)` hidden, `scale(1.2)` shown)
- `@media (max-width: 450px)` max-width clamp

`.ember-attacher-light-theme` exists only in `themes.scss` and is not referenced in templates, defaults, or README. v1 still ships it; 4.0.0 dropped it because the rollup entry skipped `addon.scss`.

## Options compared

### 1. Check in compiled CSS (recommended)

**What:** Treat npm 4.0.0’s `dist/styles/ember-attacher.css` as source. Optionally prepend the flattened light-theme rules. Copy the file into `dist/styles/` in Rollup (`emitFile` / `fs.readFileSync`, not `sass.compile`). Keep `implicit-styles` and `exports["./styles"]`. Delete `*.scss` / `*.sass` and drop `sass` from the addon package.

**Why it is smallest:** The conversion already happened at 4.0.0 publish time. No rewrite of the 4 × animation matrix. Consumer CSS stays byte-identical to beta (or beta + 14 theme lines). `sass` is already absent from 4.0.0 `dependencies`.

**Rollup note:** Do not rely on `addon.keepAssets(['**/*.css'])` alone unless a JS module imports the stylesheet. 4.0.0 never imported it; `implicit-styles` reads a package-relative path. A tiny copy plugin (the current `scssHandler` minus `sass.compile`) is the least-change path.

**v1 master (if anyone still ships 3.x from it):** putting `addon/styles/ember-attacher.css` (or `addon.css`) in the addon styles tree and removing `ember-cli-sass` / `sass` from `dependencies` is the same idea. 4.1.0 is the v2 line; do this work there.

### 2. Hand-expand mixins

**What:** Rewrite `ember-attacher.scss` as authored CSS, inlining `arrow()` / hide / show transforms per position, dropping `_mixins.scss` and `variables.scss`.

**Output:** The same ~260 lines already in `dist/styles/ember-attacher.css`. Native CSS nesting could keep a shape closer to the SCSS, but that is a second dialect for older Ember vendor CSS, not a smaller change.

**Cost:** Manual transcription of every `@if` branch with no visual gain over checking in the compiler output. Higher chance of dropping a placement or animation.

**When it would win:** Only if the team wanted a human-nested source file *and* rejected a generated CSS blob. That is an authoring preference, not a packaging requirement.

### 3. CSS custom properties for themes

**What:** Replace `#333` / light-theme hexes with `--ea-bg`, `--ea-color`, `--ea-arrow-border`, etc., and maybe `--ea-show-transform` per placement.

**Does not drop Sass by itself:** The Sass cost is the position/animation `@each` + mixins, not the theme file. `themes.scss` is already static color overrides (nesting only).

**Visual / contract risk:** Custom properties are a new public styling API. Default tooltip chrome would still need the same computed values. Position-specific `transform` strings (`translateY(-10px) rotateX(0)` vs `translateX(10px) scale(1)`) do not collapse cleanly into a few variables without restating the same four-side matrix.

**When it would win:** A later theming feature. Not the smallest 4.1.0 path.

## Implementation sketch (do not do in this research)

On `origin/v2-migration` / 4.1.0 packaging:

1. Copy npm 4.0.0 `package/dist/styles/ember-attacher.css` to `addon/src/styles/ember-attacher.css`.
2. Prepend the flattened `.ember-attacher-light-theme` rules if 3.x chrome parity is required (diff vs `sass addon.scss` is that block only).
3. Change `scssHandler` to emit that `.css` file; delete `import * as sass from 'sass'`.
4. Remove `sass` from `addon/package.json` `devDependencies`.
5. Delete `addon/src/styles/*.{scss,sass}`.
6. Leave `ember-addon.implicit-styles` and `exports["./styles"]` pointing at `./dist/styles/ember-attacher.css`.

Out of scope for the addon package: `test-app` still uses `ember-cli-sass` for its own `app.scss` (demo layout, `.custom-popover-css`). That is not published.

## Sources

- `addon/styles/ember-attacher.scss`, `_mixins.scss`, `variables.scss`, `themes.scss`, `addon.scss`, `addon.sass` on `origin/master` (`601cb0d`)
- `addon/src/styles/*` and `addon/rollup.config.mjs` (`scssHandler`) on `origin/v2-migration` (`7e3246d`)
- npm `ember-attacher@4.0.0` tarball: `package/package.json` (`ember-addon.implicit-styles`, `exports["./styles"]`), `package/dist/styles/ember-attacher.css`
- [Embroider v2 package spec — `implicit-styles`](https://embroider-build.github.io/embroider/docs/spec.html)
- [RFC 0507 — implicit styles as vendor.css](https://rfcs.emberjs.com/id/0507-embroider-v2-package-format/)
- [`@embroider/addon-dev` `keepAssets`](https://github.com/embroider-build/embroider/blob/main/packages/addon-dev/README.md)
- Component class/attribute wiring: `addon/templates/components/attach-popover.hbs`, `addon/components/attach-popover.js` (`x-placement`, `ember-attacher-${animation}`)
- Defaults: `addon/defaults.js` (`tooltipClass: 'ember-attacher-floating ember-attacher-tooltip'`)
