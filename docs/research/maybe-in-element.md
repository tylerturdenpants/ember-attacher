# Research: is `ember-maybe-in-element` still required after v2?

**Issue:** [#1046](https://github.com/tylerturdenpants/ember-attacher/issues/1046)
**Roadmap item:** [#774](https://github.com/tylerturdenpants/ember-attacher/issues/774) (“Remove `ember-maybe-in-element` from the dependencies”)
**Branches inspected:** `origin/master` (v1 addon, 3.2.0) and `origin/v2-migration` (v2 addon, 4.0.0)
**This note does not remove the dependency.**

## Verdict

**Droppable in 4.1.0 without raising the minimum Ember version.**

`ember-maybe-in-element` is a convenience wrapper around Ember’s built-in `{{#in-element}}`. Native `{{#in-element}}` has been public API since Ember 3.20, which is already the floor this addon claims (README) and is below the floor it actually tests (`ember-lts-3.28`).

Dropping the npm dependency does **not** break the component contract, provided the replacement keeps today’s `renderInPlace` / append-to-container behaviour. The public interface (`<AttachPopover>` / `<AttachTooltip>`, `@renderInPlace`, `environment.js` defaults, CSS class names) does not expose `MaybeInElement`.

It is **not** “required after v2.” The v2 packaging change does not create a new need for this classic addon; if anything it makes the classic dependency more awkward.

It is **not** “droppable only after raising min Ember.” The Ember versions this addon already claims all have native `{{#in-element}}`.

## Ember versions this addon claims

| Source | Ember floor | Ember ceiling |
| --- | --- | --- |
| README Compatibility (`origin/master` and `origin/v2-migration`) | v3.20 | v5.12 |
| ember-try + CI (`ember-lts-3.28` … `ember-lts-5.12` on both branches) | 3.28 | 5.12 (+ release/beta/canary allowed-to-fail) |

There is no `ember-source` peerDependency on either branch. The dependabot ignore comment “until we drop lts-3.16 support” is stale: v3.0.0 already dropped `ember-in-element-polyfill` and 3.16 as a breaking change ([#843](https://github.com/tylerturdenpants/ember-attacher/pull/843), CHANGELOG).

## What `ember-maybe-in-element` actually is

Pinned here as `^2.1.0`. The addon’s own README states that:

```hbs
{{#maybe-in-element el renderInPlace insertBefore=null}}The block{{/maybe-in-element}}
```

is equivalent to:

```hbs
{{#if renderInPlace}}The block{{else}}{{#in-element el insertBefore=null}}The block{{/in-element}}{{/if}}
```

The 2.1.0 component template is that expansion, with no extra JS:

```hbs
{{#if @renderInPlace}}{{yield}}{{else}}{{#in-element @destinationElement insertBefore=null}}{{yield}}{{/in-element}}{{/if}}
```

([DockYard/ember-maybe-in-element@v2.1.0 `maybe-in-element.hbs`](https://github.com/DockYard/ember-maybe-in-element/blob/v2.1.0/addon/components/maybe-in-element.hbs))

2.1.0 is a **classic v1 addon**. Its runtime dependencies are `ember-cli-babel`, `ember-cli-htmlbars`, and `ember-cli-version-checker`. It does **not** depend on `ember-in-element-polyfill` (that polyfill is only mentioned as `"after": "ember-in-element-polyfill"` in `ember-addon`). Native `{{#in-element}}` is assumed.

## Current usage in ember-attacher

One call site, same contract on both branches.

**`origin/master`** — `addon/templates/components/attach-popover.hbs`:

```hbs
<MaybeInElement @destinationElement={{this._floatingElementContainer}} @renderInPlace={{@renderInPlace}}>
  <div class="ember-attacher" ...>
    ...
  </div>
</MaybeInElement>
```

**`origin/v2-migration`** — `addon/src/components/basic-attacher.hbs` (same invocation). `<AttachPopover>` / `<AttachTooltip>` only forward `@renderInPlace` into `BasicAttacher`.

No JS file imports `MaybeInElement`. Resolution is classic-addon component lookup.

Related public contract (must be preserved, not removed with the wrapper):

- `@renderInPlace` arg, `environment.js` / `DEFAULTS.renderInPlace: false`
- `@floatingElementContainer` / default `'.ember-application'`
- Fastboot: `_renderInPlace` is forced `true` when `document` is missing so the attachment is not teleported into a missing DOM

`_floatingElementContainer` already special-cases `_renderInPlace` (uses `parentElement` when rendering in place). The template still passes the raw `@renderInPlace` arg into `MaybeInElement`, not `_renderInPlace`. A drop should copy that pairing unless Fastboot behaviour is intentionally changed.

## Native `{{#in-element}}` on claimed Ember versions

Public since Ember 3.20:

- [RFC 287](https://github.com/emberjs/rfcs/blob/master/text/0287-promote-in-element-to-public-api.md) (`release-versions.ember-source: v3.20.0`)
- [Ember 3.20 release post](https://blog.emberjs.com/ember-3-20-released/)
- Source docs on the 3.20.0 and 3.28.12 tags (`packages/@ember/-internals/glimmer/lib/syntax/in-element.ts`, `@public`)
- Still documented as public on Ember 5.12 (`Ember.Templates.helpers` / `in-element`) and later

Syntax on every claimed version is the block form:

```hbs
{{#in-element this.destinationElement insertBefore=null}}
  ...
{{/in-element}}
```

Default `{{#in-element}}` **replaces** the destination’s contents. `insertBefore=null` **appends**. ember-attacher’s default destination is `.ember-application`. Replacing that node would wipe the app. `ember-maybe-in-element` always passes `insertBefore=null`; any inlined replacement must do the same.

RFC 287 considered baking “render in place” into Ember itself and left it unresolved, pointing at `ember-maybe-in-element`. Ember never added `@renderInPlace` to the helper. The `{{#if}}` / `{{else}}` split is still the supported way to get that behaviour.

## Component contract

From `CONTEXT.md`: 4.1.0 must keep the 3.x public template interface — nested `<AttachPopover>` / `<AttachTooltip>`, existing args, events, CSS class names, and `environment.js` config.

`MaybeInElement` is not part of that interface. Consumers never invoke it. `renderInPlace` and `floatingElementContainer` stay as args regardless of whether teleport is implemented by DockYard’s wrapper or by inlined `{{#in-element}}`.

v2 does not change this: `origin/v2-migration` still lists `ember-maybe-in-element` as a runtime dependency of the v2 package and still uses the same template call. Packaging-major (4.0.0 on `beta`) did not remove the need *or* create a new one.

## If a later change drops it

Not done in this research. A behaviour-preserving replacement is the wrapper’s own expansion, with `insertBefore=null` mandatory:

```hbs
{{#if @renderInPlace}}
  {{!-- attachment markup --}}
{{else}}
  {{#in-element this._floatingElementContainer insertBefore=null}}
    {{!-- same attachment markup --}}
  {{/in-element}}
{{/if}}
```

Duplicating the inner block is the only real cost of dropping the wrapper (the reason the wrapper exists). A local private component in this repo would avoid both the duplicate block and the classic-addon dependency.

## Sources

- This repo: `addon/templates/components/attach-popover.hbs` (`origin/master`); `addon/src/components/basic-attacher.hbs` (`origin/v2-migration`); `addon/components/attach-popover.js` / `addon/src/components/basic-attacher.js`; `addon/defaults.js`; README Compatibility; `tests/dummy/config/ember-try.js` / `test-app/config/ember-try.js`; `.github/workflows/ci.yml`; CHANGELOG v3.0.0 / PR #843; issue #774
- [ember-maybe-in-element 2.1.0 README and template](https://github.com/DockYard/ember-maybe-in-element)
- [RFC 287](https://github.com/emberjs/rfcs/blob/master/text/0287-promote-in-element-to-public-api.md)
- [Ember 3.20 release notes](https://blog.emberjs.com/ember-3-20-released/)
- Ember source `in-element.ts` on tags `v3.20.0` and `v3.28.12`
- [Ember 5.12 API: `in-element`](https://api.emberjs.com/ember/5.12/classes/Ember.Templates.helpers/methods/in-element?anchor=in-element)
