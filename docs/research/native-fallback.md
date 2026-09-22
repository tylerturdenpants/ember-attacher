# Native Popover API with Floating UI fallback

Research for [#1058](https://github.com/tylerturdenpants/ember-attacher/issues/1058). Snapshot date: 2026-09-22. No native popover path was implemented in this branch.

**Sources:** [MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API); [MDN `HTMLElement.popover`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/popover) (feature detection); [MDN `showPopover()` / `source`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/showPopover); [MDN Using the Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using); [HTML Standard — popover](https://html.spec.whatwg.org/dev/popover.html); [MDN `anchor-name`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name); [MDN `position-anchor`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-anchor); [MDN `position-area`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-area); [MDN Using CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Using); [MDN `position-try` / try options](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Try_options_hiding); [CSS Anchor Positioning Module Level 1](https://www.w3.org/TR/css-anchor-position-1/); [MDN `HTMLDialogElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement); [MDN `<dialog>` + `popover`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog); caniuse [`popover` / `HTMLElement.popover`](https://caniuse.com/mdn-api_htmlelement_popover), [`css-anchor-positioning`](https://caniuse.com/css-anchor-positioning); ember-attacher `origin/master` `601cb0d` and `origin/v2-migration` `addon/src/components/{attach-popover,basic-attacher}.*`.

## Verdict

**4.x can feature-detect the Popover API and CSS anchor positioning and keep Floating UI as the fallback. That is the only honest native story for 4.x.** Native-only (no fallback) is **5.x**.

The 3.x component contract does not map onto `popover="auto"` / `popover="hint"` light dismiss, `<dialog>.showModal()`, or a host-tag change from `<div>` to `<dialog>`. Those would change hide/clickout/interactive behaviour, multi-attachment stacking, and the DOM callers already query. A 4.x native path that keeps the contract has to use **`popover="manual"`** (if it uses popover at all) and **named CSS anchors** (if it uses anchors at all), and still run today’s show/hide listeners.

**Do not put this in 4.1.0.** 4.1.0 is the first `latest` of the v2-addon line (3.3.0 → 4.1.0, one upgrade). Dual positioning/top-layer paths, UA `display: none !important` vs our animation model, and CSS-anchor “partial” engine support are too much risk for that ship. Land it as a **later 4.x minor** once 4.1.0 is out on Floating UI only.

## Ember-attacher today

On `master`, positioning and show/hide live in `addon/components/attach-popover.js`. On `v2-migration` the same logic moved to `addon/src/components/basic-attacher.js`; `attach-popover.js` there is a thin wrapper (`ariaRole` default `'dialog'`). A 4.x native path would land on that basic attacher, not the wrapper.

Public contract that a native path must keep:

| Promise | How it works today |
| --- | --- |
| Nested in the parent (implicit target) | Parent finder `<meta>` → `element.parentElement`; `@explicitTarget` overrides |
| `showOn` / `hideOn` space-delimited events | JS listeners on the target and `document` (`useCapture` optional) |
| Defaults | `showOn: 'mouseenter focus'`; `hideOn: 'mouseleave blur escapekey'` — **not** `clickout` |
| `clickout` | Document `click` / `touchend`. Clicking the **target never** hides. Clicking the **attachment** hides iff `interactive=false` |
| `interactive` | Mouse/focus/clickout treat target **and** attachment as inside. `mouseleave` installs document `mousemove` until both are left |
| `isOffset` | Extra hit-region between target and attachment while interactive + mouseleave |
| Show/hide animation | `display` none↔block, `visibility: hidden` until positioned, then `ember-attacher-show` / `-hide` keyed off **`x-placement`** |
| Position | `computePosition` writes `left`/`top`; optional `autoUpdate`; `@placement`, `@flip`, `@overflowPadding` / `shift`+`limitShift`, `@arrow`, `@middleware`, `@floatingUiOptions` |
| Portal | `MaybeInElement` into `@floatingElementContainer` (default `.ember-application`) unless `@renderInPlace` |
| Visibility API | `@isShown`, yielded `hide()`, `@onChange`, `aria-hidden`, tooltip `aria-describedby` |
| Fastboot | `self.document` missing → force `renderInPlace`; no `computePosition` |

`_hideOnClickOut` (master L696–705 / v2 equivalent):

```js
const targetReceivedClick = this._currentTarget.contains(event.target);
if (this.interactive) {
  if (!targetReceivedClick && !this._floatingElement.contains(event.target)) {
    this._hideAfterDelay();
  }
} else if (!targetReceivedClick) {
  this._hideAfterDelay();
}
```

CSS animations are cartesian over `x-placement` (`addon/styles/ember-attacher.scss` / v2 `addon/src/styles/ember-attacher.scss`): `div[x-arrow]`, `div[x-circle]`, `.ember-attacher-fill` / `-fade` / `-shift` / `-scale` / `-perspective`. Dropping `x-placement` without rewriting that sheet is a visual break.

## Feature detection (4.x)

All of these are client-only. Fastboot has no `HTMLElement` / `document`; the Floating UI (or no-op) path stays the SSR answer.

### Popover API

MDN’s documented check:

```js
function supportsPopover() {
  return typeof HTMLElement !== 'undefined'
    && Object.hasOwn(HTMLElement.prototype, 'popover');
}
```

Pair with method checks if we call them: `'showPopover' in HTMLElement.prototype`. `hint` is a later value than `auto`/`manual` — detect separately (`popover.popover = 'hint'` round-trip, or caniuse `popover: hint`) and do not assume it from `popover` presence. `showPopover({ source })` (implicit CSS anchor + focus order) is a **separate** capability; do not treat it as implied by `popover`.

Caniuse `HTMLElement.popover` (snapshot 2026-09-22): **~92.5%** global. Chrome/Edge 114+, Firefox 125+, Safari 17+, iOS Safari **partial 17.0–18.2** (light-dismiss bugs), full 18.3+. Baseline Newly available January 2025; web-features explorer expects Widely available **2027-07-27**.

### CSS `anchor-name` / `position-anchor`

JS:

```js
function supportsAnchorPositioning() {
  return typeof CSS !== 'undefined'
    && CSS.supports('anchor-name: --ea')
    && CSS.supports('position-anchor: --ea')
    && CSS.supports('position-area: top');
}
```

CSS: `@supports (anchor-name: --ea) and (position-anchor: --ea) and (position-area: top)`.

Flip-class fallbacks: `CSS.supports('position-try-fallbacks: flip-block')` (or `top`) — **not** implied by `anchor-name`. Arrow restyle on fallback needs anchored container queries (`container-type: anchored`) — Level 2, weaker coverage than Level 1.

Caniuse `css-anchor-positioning` (snapshot 2026-09-22): **~86%** but still marked **partial** in Chromium and Firefox; Safari 26.x partial, **27+ supported**. Chrome/Edge 125+, Firefox 147+ (Jan 2026), Safari 26+. Baseline Newly available January 2026. Named anchors work across a portal (name, not ancestor). Implicit ancestor anchors **do not** work once `MaybeInElement` moves the attachment.

### `HTMLDialogElement`

```js
typeof HTMLDialogElement === 'function'
  && typeof HTMLDialogElement.prototype.show === 'function'
  && typeof HTMLDialogElement.prototype.showModal === 'function'
```

Baseline **Widely available** since March 2022. This is not a positioning API and is not the interesting 4.x gate. See [Dialog](#dialog-is-not-a-drop-in-attachment).

### Combined 4.x native gate

Use native **only** when all of:

1. `supportsPopover()` and `supportsAnchorPositioning()` (or a chosen *subset* — popover-only vs anchors-only; see slices below).
2. No `@middleware` array the app supplied.
3. No `@floatingUiOptions` that would change `computePosition`.
4. Document exists (not Fastboot).

Otherwise Floating UI. Missing either browser API is enough to stay on Floating UI; do not mix “popover without a fallback for anchors” in 4.x.

## What can be feature-detected in 4.x (with fallback)

### Slice A — CSS anchors as `computePosition` replacement

When the gate passes **and** the instance is in the mappable subset:

| Today | Native stand-in |
| --- | --- |
| Unique `anchor-name` on the target | `--ea-{guid}`; clear on destroy / target change |
| `position: fixed` + `position-anchor` + `position-area` on the attachment | `@placement` `top`/`bottom`/`left`/`right` |
| `position-try-fallbacks` | `@flip` space-delimited list, approximately |
| Layout engine | `@autoUpdate` becomes a no-op (scroll/resize reflow is free) |
| Portal | Keep `MaybeInElement`; named anchors are not a DOM-parent contract |

Must reset popover UA insets if the host is also a popover (`margin: 0; inset: auto`) — [MDN `position-area`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-area) already warns default popover `margin`/`inset` fight `position-area`.

Still our JS: `showOn`/`hideOn`, delays, `interactive`, `isOffset`, `isShown`, `lazyRender`, `aria-*`, yielded `hide()`.

`x-placement`: CSS does not set it. Animations and arrows need it. A 4.x native *position* path must either (1) keep writing `x-placement` from JS (read used `position-area`, or keep a cheap `computePosition` just for the attribute — defeating the point), or (2) rewrite the animation sheet. Treat (2) as extra work in the later 4.x minor, not a silent swap.

### Slice B — `popover="manual"` for top layer

When `supportsPopover()`:

- Set `popover="manual"` on the existing **`<div class="ember-attacher">`**. Do not switch the tag.
- Show/hide with `showPopover()` / `hidePopover()` **in addition to** today’s listeners, sequenced around animation.
- Manual state: no light dismiss, no “one auto at a time”, no Esc from the UA. That is what preserves default `hideOn` (no `clickout`) and multiple attachments.
- Top layer: `@renderInPlace` z-index / overflow clipping gets better without changing `@floatingElementContainer`.

UA stylesheet conflict (HTML rendering; MDN Using the Popover API): a closed popover is `display: none !important` until `:popover-open`. Our hide animation keeps `display: block` and fades opacity/transform. Native popover hide is a **different animation model** (`:popover-open`, `@starting-style`, discrete `display` / `overlay` transitions). A 4.x path has to either:

- call `showPopover()` **before** the show animation and delay `hidePopover()` until `hideDuration` elapses (so `:popover-open` stays true while we fade), or
- rewrite animations to the UA popover model.

Do not call `hidePopover()` at the start of `_hide()`; that would snap `display: none` and skip the hide animation.

### Slice C — both

Popover (top layer + stacking) **and** named anchors (position). Still `manual`. Still our listeners. This is the 4.x “native fallback” end state, behind the combined gate, with Floating UI for everyone else.

`showPopover({ source: target })` can create an implicit anchor (MDN) so we might skip setting `anchor-name` on the target — **only** where `options.source` is supported. Detect it separately; older popover browsers still need the named-anchor CSS.

## What must stay on Floating UI (4.x, even in capable browsers)

| Reason | Contract bit |
| --- | --- |
| No CSS equivalent | `@middleware` (arbitrary Floating UI middleware) |
| No CSS equivalent | `@floatingUiOptions` forwarded into `computePosition` |
| Not 1:1 | `@overflowPadding` / `shift({ limiter: limitShift() })` — `position-try` is overflow-of-CB, not padding-limited shift |
| Weak / later CSS | `@arrow: true` until anchored container queries can restyle `x-arrow` on fallback; today’s arrows are `x-placement` SCSS |
| No UA equivalent | `@isOffset` cursor-between-target-and-attachment |
| Behaviour mismatch | `popover="auto"`/`"hint"` vs `clickout` (see below) |
| SSR | Fastboot |
| Engine holes | Any browser failing the gate (~8% without popover, ~14% without anchors, union larger; Chromium/Firefox anchors still **partial**) |
| Visual | `x-placement` animation/arrow/fill (`x-circle`) until the sheet is rewritten |

**`clickout` vs light dismiss** is a hard mismatch, not a detection miss:

- Ours: click **target** → do not hide; click **attachment** → hide if `interactive=false`.
- `auto`/`hint` light dismiss: click outside the popover (including the **target**, unless it is an invoker) → hide; click **inside** the popover → do not hide.

So native light dismiss is closer to `interactive=true` **and** treats target clicks as outside. Default `hideOn` does not even include `clickout`. Using `auto`/`hint` as the 4.x default would add click-outside and Esc-from-UA, close sibling `auto` popovers, and hide on target click. That is a component-contract break → **5.x**.

## Dialog is not a drop-in attachment

| API | What it does | Ember-attacher |
| --- | --- | --- |
| `showModal()` | Top layer, `::backdrop`, **rest of document inert** | Tooltips/popovers are not modal. Inert page breaks the target (hover/focus/click). **Never 4.x.** |
| `show()` | Modeless, not top layer | No positioning vs target. Weaker than popover+anchors. |
| `<dialog popover>` | Valid combo (MDN): dialog *semantics* + popover *control* | Host tag becomes `<dialog>`. Callers and tests look for `div.ember-attacher` / `.ember-attacher-tooltip`. Role is already `dialog` (popover) / `tooltip` (tooltip) on a **div**. Tag change is a DOM-contract break → **5.x** unless we keep the div. |

4.x may keep `role="dialog"` on a `div` (today). It may use the Popover API on that div. It should not `showModal()` and should not require `<dialog>` as the host.

## 4.1.0 vs later 4.x

| Ship | Native fallback? | Why |
| --- | --- | --- |
| **4.1.0** | **No** | First `latest` of the packaging major. 3.x apps upgrade once. Native dual-path (UA `display:none !important`, `inset` reset, `x-placement`, partial CSS anchors, iOS popover history) is unrelated to “is this a v2 addon?” and can delay or flake that upgrade. 4.1.0 stays 100% Floating UI (`computePosition` / `autoUpdate` as now). |
| **Later 4.x minor** | **Yes, behind the gate** | Additive: same `<AttachPopover>` / `<AttachTooltip>`, same args, same events, same class names. Feature-detect slices A→B→C; Floating UI otherwise. Opt-in config (`emberAttacher.nativeFallback: true`) is allowed if we want a kill switch; default-on is fine only after tests cover both paths. |
| **5.x** | Native **only** | See next section. |

A later 4.x minor can ship slice-by-slice (anchors without popover, or manual popover without anchors) as long as each slice keeps the fallback. Shipping popover+anchors together is nicer for authors (one “native” story) but is not required for the first later-minor.

## What is only honest as 5.x (no fallback)

CONTEXT.md: 5.x is the major for contract breaks — native-only, dropping the parent finder, raising min Ember. Native-only belongs there, not in 4.x.

5.x may:

- Drop `@floating-ui/dom` and the Floating UI path entirely; require Popover API **and** CSS anchor positioning (Safari 27+ / equivalent as the floor, once caniuse partials clear).
- Default to `popover="hint"` (tooltips) / `"auto"` (popovers) and **change** `hideOn`/`clickout`/`interactive` to UA light dismiss + close-request (Esc). Document that target-click and attachment-click semantics follow the spec, not 3.x `_hideOnClickOut`.
- Replace `x-placement` animations with `:popover-open` + `@starting-style`.
- Optionally host in `<dialog popover>` without `showModal()`.
- Drop `@middleware` / `@floatingUiOptions` (or keep them as no-ops with a deprecation in 4.x first).
- Drop the parent finder (separate 5.x item; not this ticket).
- Stop portaling for z-index (top layer), while still deciding where Ember renders the tree.

5.x must not pretend `showModal()` is an attachment. Modal inert is a different product.

## Recommendation

1. **4.1.0:** Floating UI only. Do not implement native popovers, CSS anchors, or `<dialog>` as the host.
2. **Later 4.x minor:** native fallback = feature-detected **`popover="manual"` + named `anchor-name` / `position-anchor` / `position-area`**, existing show/hide/clickout/interactive JS, Floating UI when the gate fails or `@middleware` / `@floatingUiOptions` / `@arrow` / `@isOffset` need it.
3. **5.x:** no fallback; UA light dismiss; new animation model; optional `<dialog popover>`; drop Floating UI.

Do not treat “native-only” as in-scope for 4.x.
