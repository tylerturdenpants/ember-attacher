# ember-attacher 5.0 Upgrade Guide

`ember-attacher` 5.0.0 completes the cleanup begun with 4.4.0's additive APIs and `until: '5.0.0'` deprecations. The addon is now authored in strict `.gts` / `.ts` with generated `.d.ts` & Glint declarations, runloop-free scheduling, single-pass in-place Top-Layer rendering, native Web Animations / `@starting-style` lifecycle, modern accessibility defaults, and a pruned API surface.

## Compatibility & Platform Floor

- **`ember-source`:** `>= 4.12` LTS (tested across Classic 4.12 / 5.12 / 6.12 and Vite 4.12–7.4 / Canary).
- **Node.js:** `>= 20` LTS.
- **TypeScript / Glint:** Declarations and `EmberAttacherRegistry` are emitted directly from addon `.ts`/`.gts` sources and published from `'ember-attacher'`, `'ember-attacher/template-registry'`, and `'ember-attacher/test-support'`.
- **Styles:** Packaged plain CSS (`ember-attacher/styles` and `implicit-styles`) with zero Sass dependency and strict CSP compatibility (`--ember-attacher-transition-duration` driven via CSSOM).
- **Top-Layer entry/exit transitions:** `@starting-style` and `transition-behavior: allow-discrete` enhance Chrome 117+, Safari 17.5+, and Firefox 129+. Older engines show immediately on entry and fall back to a `hideDuration` exit timer cleanly.

---

## 1. Bind Explicit Targets (`<AttachTooltip>` / `<AttachPopover>` Assert Without One)

Implicit parent target resolution (`<button>Label <AttachTooltip>...</AttachTooltip></button>`) is removed in `5.0.0`.

In `5.0.0`, `<AttachTooltip>` and `<AttachPopover>` assert in debug builds when initial mount completes with no target binding mechanism supplied (while staying inert in production and SSR and never falling back to `document.body`).

Valid target bindings:

- `@target` (`Element | string | VirtualElement`) — nullable reactive bindings like `@target={{this.dynamicTarget}}` are valid when `@target` is passed explicitly (`'target' in args`).
- `<:target>` block parameter modifier (`<:target as |target|>`)
- Yielded `{{a.target data}}` modifier or `a.setTarget(el, data)`
- Declarative HTML invokers matching `@id`: `[popovertarget="<id>"]` or `[interestfor="<id>"]`

### Simple text tooltips: `{{tooltip}}` modifier

Backed by a single document-scoped Top-Layer DOM node and a `300ms` warm delay-group handoff across adjacent tooltips:

```hbs
{{!-- 4.x (removed) --}}
<button type="button">
  Save
  <AttachTooltip @placement="top">Save changes</AttachTooltip>
</button>

{{!-- 5.0 --}}
<button type="button" {{tooltip "Save changes" placement="top"}}>
  Save
</button>
```

### Rich content or shared multi-target tooltips: `<:target>` / `<:content>` blocks

```hbs
<AttachTooltip>
  <:target as |target|>
    <button type="button" {{target}}>Help</button>
  </:target>
  <:content>
    Rich <strong>HTML</strong> tooltip
  </:content>
</AttachTooltip>
```

For lists or grids, pass row data to `{{target row}}` to share one attachment instance across items (`a.data` yields the active item's payload). When a third-party widget destroys and recreates target elements under the same selector, call `a.setTarget(newEl)` or use `{{a.target}}`; see the [Recipes](../../README.md#recipes) in the README for examples (`boundary`, virtual targets + `animationFrame: true`, `{{#in-element}}` + `@renderInPlace`, and `a.setTarget()`).

### External targets & declarative triggers: `@target`, `[popovertarget]`, `[interestfor]`

```hbs
{{!-- Via @target (Element, unique CSS selector, or VirtualElement) --}}
<button id="menu-btn" type="button">Options</button>
<AttachPopover @target="#menu-btn">
  Menu items
</AttachPopover>

{{!-- Native HTML popovertarget pairing --}}
<button type="button" popovertarget="help-popover">Help</button>
<AttachPopover @id="help-popover">
  Help panel
</AttachPopover>

{{!-- Declarative [interestfor] hover/focus tooltip pairing --}}
<button type="button" interestfor="field-tip">Info</button>
<AttachTooltip @id="field-tip">
  Explains what this control does.
</AttachTooltip>
```

### Custom markup with zero wrapper elements: `<Attacher as |a|>`

```hbs
<Attacher @showOn="click" @hideOn="click clickout escapekey" @lazyRender={{true}} as |a|>
  <button type="button" {{a.target}}>Open</button>
  {{#if a.shouldRender}}
    <div class="my-panel" {{a.attachment}}>
      Panel placed at {{a.placement}}
      <div class="my-arrow" {{a.arrow}}></div>
      <button type="button" {{on "click" a.hide}}>Close</button>
    </div>
  {{/if}}
</Attacher>
```

---

## 2. In-Place Top-Layer `[popover="manual"]` Host (No `{{#in-element}}`)

In 4.x, `<AttachTooltip>` and `<AttachPopover>` wrapped a `<meta hidden>` marker and teleported the host node into `.ember-application` via `{{#in-element}}` (`MaybeInElement`) / `@floatingElementContainer`.

In **`5.0.0`**:

- Component hosts (`<AttachTooltip>`, `<AttachPopover>`) render `<div class="ember-attacher" popover="manual">` **directly in place in 1 render pass** (`@floatingElementContainer`, `<meta hidden>`, and `MaybeInElement` are removed).
- When shown, `showPopover()` promotes `.ember-attacher` into the browser **Top Layer**, escaping ancestor `overflow` clipping and stacking contexts without moving DOM nodes.
- Pass `@renderInPlace={{true}}` to omit `popover="manual"` and render purely in place (using `[data-open]` without Top-Layer promotion).
- In environments without native Popover API support (e.g. Safari `< 17`), the host falls back to `[data-open]` / `[data-closing]` in place cleanly without `popover` attributes (note: without Top Layer, `overflow: hidden` ancestors can clip an in-place attachment).
- Only the singleton `{{tooltip}}` modifier pool (`TooltipDomHost`) appends its shared host node imperatively to `modalContainer || ownerRootElement || document.body`.
- **Test impact:** Application/integration tests that previously queried `.ember-application > .ember-attacher` should query the rendered element directly by ID/selector or render inside `#ember-testing` (since `.ember-attacher` stays in place in DOM order even when promoted to the Top Layer).

---

## 3. Native Animations, Selectors & Performance

`ember-attacher` 5.0 replaces `@ember/runloop` timers and class-toggling animation hacks with native CSS + Web Animations (`WAAPI`):

- **Entry/exit CSS pipeline:** Open state toggles `:is(:popover-open, .\:popover-open, [data-open]):where(:not([data-closing]))` with `@starting-style`, `transition-property: transform, opacity, display, overlay;`, and `transition-behavior: allow-discrete;`.
- **Exit lifecycle:** Closing sets `aria-hidden="true"` and `[data-closing]` (`pointer-events: none` so closing overlays never steal clicks), awaits `floatingElement.getAnimations({ subtree: true })` (falling back to a `hideDuration` `setTimeout` timer when `getAnimations()` returns empty), then clears duration and calls `hidePopover()`.
- **Instant show/hide (`0ms`):** `@showDuration={{0}}` and `@hideDuration={{0}}` complete synchronously in 0 frames with zero rAF or timer delay.
- **Reduced motion:** Spatial motion transforms are gated inside `@media (prefers-reduced-motion: no-preference)`. Under `@media (prefers-reduced-motion: reduce)`, delays are `0ms` and opacity fade duration is capped at `min(var(--ember-attacher-transition-duration, 0ms), 100ms)`.
- **GPU hygiene:** Idle attachments no longer carry permanent `will-change: transform` or `perspective: 800px` contexts.
- **DOM / attribute changes:**
  - `data-placement` is now set alongside `x-placement` (`x-placement` remains populated for 5.0 migration compatibility).
  - `div[x-circle]` was replaced by `.ember-attacher-fill-circle`.
  - `x-arrow` was removed from arrow elements (style `.ember-attacher-arrow` instead).
  - Internal `.ember-attacher-show` and `.ember-attacher-hide` classes were removed.

---

## 4. Accessibility Contracts & 5.0 Defaults

### `<AttachPopover>` defaults

| Option | 4.x Default | 5.0 Default |
|---|---|---|
| `@showOn` | `'mouseenter focus'` | `'click'` |
| `@hideOn` | `'mouseleave blur escapekey'` | `'click clickout escapekey'` |
| `@interactive` | `false` | `true` |
| `@lazyRender` | `false` | `true` |

Pass `@showOn`, `@hideOn`, `@interactive`, or `@lazyRender` explicitly when hover-triggered `<AttachPopover>` behavior is desired.

### Other 5.0 defaults

- **`@autoUpdate`:** Defaults to `true` (tracks scroll, resize, and layout shifts via Floating UI `autoUpdate` only while open, and stops immediately on hide/teardown).
- **WCAG 1.4.13 Hoverable Tooltips (`@interactive`):** `<AttachTooltip>` and `{{tooltip}}` now default `@interactive={{true}}` with the automatic diagonal `safePolygon` pointer corridor so magnification and pointer users can hover onto tooltip content without it disappearing. Pass `@interactive={{false}}` (or `interactive=false` on `{{tooltip}}`) to opt out.

### Smart Tooltip ARIA

- **Nameless triggers** (e.g., an icon-only `<button><svg aria-hidden="true" .../></button>` with no accessible name): binds `aria-labelledby` upfront pointing to the tooltip ID so screen readers name the control from the tooltip even before opening.
- **Duplicate descriptions:** when a tooltip's text matches the trigger's existing accessible name (e.g., `<button aria-label="Save">` with tooltip `"Save"`), duplicate `aria-describedby` is suppressed.
- **Supplemental descriptions:** otherwise, token-safe `aria-describedby` is bound only while the tooltip is open, preserving any existing caller tokens.

---

## 5. Removed 4.x Components, Arguments & APIs

`<BasicAttacher>` and every deprecated 4.x argument/helper have been removed from runtime code and TypeScript declarations:

| Removed in 5.0 | Replacement |
|---|---|
| `<BasicAttacher>` component & module | `<AttachTooltip>`, `<AttachPopover>`, `<Attacher>`, or `{{tooltip}}` |
| `@configKey` | `<AttachTooltip>`, `<AttachPopover>`, or `@ariaRole="tooltip"` |
| Implicit parent target | `@target`, `<:target>`, `{{a.target}}`, `a.setTarget()`, `[popovertarget]`, or `[interestfor]` |
| `@explicitTarget` | `@target` |
| `{{a.reference}}` | `{{a.target}}` |
| `a.setReference(...)` | `a.setTarget(...)` |
| `@flip="top left"` | `@middleware={{array (flip fallbackPlacements=(array "top" "left"))}}` (default `flip()` always runs unless a `flip` entry overrides it, e.g. `{ name: 'flip', fn: () => ({}) }` to disable) |
| `@overflowPadding={{8}}` | `shift({ padding: 8 })` / `flip({ padding: 8 })` via `@middleware` (default `shift({ limiter: limitShift(), padding: 5 })` always runs unless a `shift` entry overrides it) |
| `@floatingUiOptions` | `@placement`, `@strategy`, and `@middleware` |
| `@floatingElementContainer` | Built-in Top-Layer `[popover="manual"]` host (no selector needed) or `@renderInPlace={{true}}` |
| `@isOffset` | Remove; diagonal `safePolygon` corridor is automatic when `@interactive={{true}}` |
| `@style` | CSS classes (`@class` / `class="..."`) or `--ember-attacher-*` custom properties |
| `@additionalClass` | `@class` or `class="..."` |
| `@onInitializeAttacher` | Element modifier on the Target or Attachment |
| `@onWillDestroy` | Element modifier teardown or `registerDestructor` |

Floating UI middleware builders are re-exported directly from `'ember-attacher'`:
`{ arrow, autoPlacement, flip, hide, inline, limitShift, offset, shift, size }`.

---

## 6. Testing Helpers

Import `isVisible` from `'ember-attacher/test-support'`:

```js
import { isVisible } from 'ember-attacher/test-support';
```
