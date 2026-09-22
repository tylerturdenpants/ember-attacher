# Elegant replacement for the meta parent-finder

Research for [#1059](https://github.com/tylerturdenpants/ember-attacher/issues/1059). Snapshot date: 2026-09-22. No template or component change in this branch.

**Sources:** `origin/master` `601cb0d` (`addon/templates/components/attach-popover.hbs`, `addon/components/attach-popover.js`); `origin/v2-migration` (`addon/src/components/basic-attacher.hbs` / `.js`); Glimmer conversion [#772](https://github.com/tylerturdenpants/ember-attacher/commit/0f59d2ead923c8ca58691c385599dfc5b352fe87); HTML Living Standard (meta content model, `hidden`, hidden-elements UA sheet, in-body parser); CSS Selectors Level 3 `:empty`; CSS Display / Flexbox (`display: none` is not a flex item). `@explicitTarget` tests on both branches.

## Verdict

**Keep `<meta hidden>` in 4.x.** There is no valid, elegant finder that preserves implicit nested usage *and* leaves the host's layout, accessibility tree, `:empty`, and flex box-tree undisturbed. Any element child fails `:empty` while it is mounted. The only nodes that do not fail `:empty` are comments and zero-length text; Glimmer cannot hang `{{did-insert}}` on either. A pattern with no extra node is a 5.x contract break (modifier-only / explicit-target-only). Switching the tag to `<span hidden>` or `<template>` would make the markup more content-model-valid and would not improve the elegance bar.

## Why a finder exists

The 3.x contract is: nest the attachment in the target.

```hbs
<button>
  Click me
  <AttachTooltip>I'm a tooltip!</AttachTooltip>
</button>
```

([README.md](https://github.com/tylerturdenpants/ember-attacher/blob/601cb0d/README.md))

Glimmer components have no `this.element` and no `@tagName('')` wrapper. The floating node cannot be used to read that parent, because by default it is **portaled** out of the host:

- `DEFAULTS.floatingElementContainer` is `'.ember-application'` (`addon/defaults.js`).
- `DEFAULTS.renderInPlace` is `false`.
- The template wraps the `.ember-attacher` node in `MaybeInElement`, which is `{{#in-element}}` unless `@renderInPlace` is set.

Once portaled, `floatingElement.parentElement` is the destination, not the implicit target. Show/hide listeners and Floating UI `computePosition` / `autoUpdate` all use `_currentTarget`, which is `explicitTarget || parentElement`. That parent must be discovered **before** (or independently of) the portaled node.

`lazyRender` (default `false`) makes this stricter: `renderFloatingElement` is false until `_currentTarget` exists *and* (if lazy) `_mustRender` is true, so the floating node is not in the DOM at all on first paint. Event listeners still have to land on the target. The finder is the only insert hook in that state.

```124:126:addon/components/attach-popover.js
  get renderFloatingElement() {
    return (this.renderInPlace || this._currentTarget) && (!this.lazyRender || this._mustRender);
  }
```

## What the finder does today

`origin/master` — `addon/templates/components/attach-popover.hbs`:

```1:3:addon/templates/components/attach-popover.hbs
{{~#unless this.renderFloatingElement}}
  <meta hidden {{did-insert this.onParentFinderInsert}} {{did-update this.onIsShownChange this.isShown}}/>
{{~/unless~}}
```

`origin/v2-migration` — identical markup in `addon/src/components/basic-attacher.hbs`. `<AttachPopover>` / `<AttachTooltip>` only wrap `BasicAttacher`; they do not introduce a second finder.

Insert reads the host and initializes:

```297:300:addon/components/attach-popover.js
  onParentFinderInsert(element) {
    this.parentElement = element.parentElement;
    this._initializeAttacher();
  }
```

```354:356:addon/components/attach-popover.js
  _initializeAttacher() {
    this._removeEventListeners();
    this._currentTarget = this.args.explicitTarget || this.parentElement;
```

`{{~ ~}}` is deliberate: the Glimmer conversion also landed “Remove excess whitespace content”, and `tests/integration/components/ember-attacher/ember-attacher-test.js` asserts `wrapper.textContent === ''` for `<div id='wrapper'><AttachPopover /></div>`.

Two skip paths already exist:

| Situation | Finder rendered? | How the parent / target is obtained |
| --- | --- | --- |
| Default (portal, not lazy) | Yes, **first paint only**. After `_currentTarget` is set, `renderFloatingElement` becomes true, the `<meta>` unmounts, and the floating node is portaled away. | `onParentFinderInsert` → `parentElement` |
| `@lazyRender={{true}}` until first show | Yes, until `_mustRender` | Same |
| `@renderInPlace={{true}}` (also Fastboot: `_renderInPlace` when `document` is missing) | No (`renderFloatingElement` is true) | `didInsertFloatingElement` uses `floatingElement.parentElement` |
| `@explicitTarget={{element}}` | Finder still mounts until `_currentTarget` is set; target does not have to be the parent | `_initializeAttacher` prefers `args.explicitTarget` |

`parentNotFound` is tracked on both branches and never read. Dead state, not a second finder.

## Why the floating node cannot supply the parent

Default destination is `.ember-application`. `MaybeInElement` moves the `.ember-attacher` div there (`insertBefore=null` / append). Parent of that div is therefore the application root, not the button the user nested in.

`didInsertFloatingElement` only copies `floatingElement.parentElement` when `renderInPlace` is true — the one case where the floating node is still a child of the implicit target.

Even if the portal were dropped, `lazyRender` would still need a pre-show insert hook in the host, because the floating node does not exist yet.

## `@explicitTarget` is the additive escape, not a finder replacement

Shipped in 3.x. 2.0 renamed `popperTarget` → `explicitTarget` (`docs/upgrade-guide-2.0.md`). Tests pass a live `HTMLElement` (`tests/integration/components/ember-attacher/explicit-target-test.js` on master; same file under `test-app/` on `v2-migration`):

- Nested in `#old-target` with `@explicitTarget={{null}}` → implicit parent (describedby + focus-show on old).
- Then set `@explicitTarget` to `#new-target` → listeners and `aria-describedby` move.

It does **not** remove the need for a finder when the arg is omitted. Making it the only way to pick a target would break nested `<AttachTooltip>` / `<AttachPopover>` — that is the 5.x “drop the parent finder” line, not 4.x.

## How `<meta>` got here

Classic (`@tagName('')`) planted an **empty text node** in `init` and dumped it into the template:

```js
this._parentFinder = self.document ? self.document.createTextNode('') : '';
```

```hbs
{{unbound this._parentFinder}}
```

`_currentTarget = this.explicitTarget || this._parentFinder.parentNode`. Selectors Level 3 `:empty` ignores comment nodes and text nodes whose data has **zero length**, so that text node did not fail `:empty`. It also left `textContent` empty.

[#772](https://github.com/tylerturdenpants/ember-attacher/commit/0f59d2ead923c8ca58691c385599dfc5b352fe87) (Glimmer) could not keep that: Glimmer interpolates values as strings, not pre-created Nodes, and `{{did-insert}}` only runs on **elements**. Commit messages in that PR:

1. “Adds the hacky way to find the parent element”
2. “Uses `meta` tag instead of the `wbr` to render nothing”
3. “makes the helper `meta` element hidden”
4. “Prevents from rendering the `meta` in case of `renderInPlace`”

`<wbr>` is valid phrasing (so it is legal inside a `<button>`), but it is a **line-break opportunity**. It is not in the HTML UA “hidden elements” list, so it can change wrapping of the host’s text. `<meta>` was chosen because the UA sheet already treats it as not rendered.

## The elegance bar, applied

The issue asks for a valid HTML node that does not disturb **layout, accessibility, `:empty`, or flex of the host**, *or* a pattern that needs no extra node.

### Constraints from specs

- **Layout / flex.** HTML rendering “hidden elements” expects `display: none` for `meta`, `template`, `script`, `style`, … ([rendering.html#hidden-elements](https://html.spec.whatwg.org/multipage/rendering.html#hidden-elements)). The global `hidden` attribute in the Hidden state is also “will not be rendered”, typically `display: none` ([interaction.html#the-hidden-attribute](https://html.spec.whatwg.org/multipage/interaction.html#the-hidden-attribute)). CSS Display: `display: none` generates no boxes. CSS Flexbox: children with `display: none` are not flex items. Author CSS that sets `display` on `meta` or `[hidden]` can override this; that is a spec caveat, not unique to this addon.
- **Accessibility.** `display: none` (and `hidden`) omit the node from the accessibility tree. The README nested-in-`<button>` case keeps the button’s accessible name from its text; the finder is not interactive content.
- **`:empty`.** Element children always make the host non-`:empty`, even if those children are `display: none` or `hidden` ([Selectors 3 `:empty`](https://drafts.csswg.org/selectors-3/#empty-pseudo); MDN). Comments do not. Zero-length text does not.
- **Validity.** `meta` is metadata content. It is phrasing/flow **only if `itemprop` is set** ([semantics.html#the-meta-element](https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element)). Nested in a `<button>` (phrasing, no interactive descendants) a bare `<meta hidden>` is invalid. Adding `itemprop` just to satisfy the content model would leak into microdata if an ancestor has `itemscope` — not elegant.

HTML *parser* “in body”: a `<meta>` start tag is a parse error and is processed as “in head” ([parsing-main-inbody](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody)). Ember builds the finder with DOM APIs, so it stays under the host. Fastboot forces render-in-place, so the finder is not serialized. This is not a 4.x hydration landmine; it is a reason not to treat “put meta in the body HTML string” as a general pattern.

### Candidates

| Candidate | Valid in a `<button>`? | Layout / flex / a11y | `:empty` of host | Implicit nested usage | Elegant 4.x? |
| --- | --- | --- | --- | --- | --- |
| **Keep `<meta hidden>`** | No (metadata, no `itemprop`) | UA `display: none` + `hidden` | Fails while mounted; default path unmounts after first paint | Yes | **Best available** — already the Glimmer replacement for “render nothing” |
| `<wbr>` | Yes (phrasing) | Can insert a wrap opportunity | Fails while mounted | Yes | Rejected in #772 |
| `<span hidden>` / other hidden phrasing | Yes | `hidden` → not rendered | Fails while mounted | Yes | More valid, looks like leftover UI, no `:empty` win |
| `<template>` | Yes (phrasing / metadata / script-supporting); UA `display: none` | Not rendered | Fails while mounted | Yes | Valid, but it is a template-contents element, not a finder; collides with `.gjs` `<template>` if 4.x ever moves off `.hbs` |
| `<meta itemprop>` | Yes (phrasing when `itemprop` is present) | Same as meta | Fails while mounted | Yes | Spec-legal only by faking microdata |
| Empty text node (classic) | N/A | No boxes | Does not fail `:empty` | Yes, in classic | **Not expressible** in Glimmer (`did-insert` needs an element; `{{value}}` stringifies a Node) |
| HTML comment | N/A | No boxes | Does not fail `:empty` | Would, if insert-hookable | Handlebars `{{! }}` emits no DOM node; modifiers do not attach to comments |
| No extra node (modifier on the host / explicit-only) | N/A | Host untouched | Untouched | **No** — callers must mark the target | **5.x** |

A custom helper-manager that stuffed a zero-length text node into the DOM would recreate classic `:empty` behavior. That is not a Glimmer public pattern and is not more elegant than `<meta>`.

## 4.x vs 5.x

- **4.x (this issue):** keep the finder so nested usage stays the default. `@explicitTarget` remains the additive opt-out. Do not retag the finder for validity theatre.
- **5.x:** drop the parent finder. Implicit target goes away; callers use a host modifier and/or an explicit target only.

## Decision input (not an implement-now change)

No 4.x template change. If a later 4.x cleanup wants a comment-only note: `parentNotFound` is unused. Skipping the finder when `@explicitTarget` is already a DOM node would be a micro-optimization, not a replacement, and would still need the finder for the implicit default.
