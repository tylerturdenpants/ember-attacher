# ember-attacher 5.0 Upgrade Guide

`ember-attacher` 4.4 introduces the additive explicit-target and non-wrapper APIs (`{{tooltip}}`, `<Attacher>`, `@target`, `<:target>`/`<:content>` blocks, and `[popovertarget]` pairing) alongside `until: '5.0.0'` deprecations so you can migrate incrementally before upgrading to `5.0.0`.

## Compatibility & Platform Floor (5.0)

- **`ember-source`:** `>= 4.12` LTS (4.x supports `3.28` through `7.x`).
- **Node.js:** `>= 20` LTS.
- **TypeScript / Glint:** Full `.d.ts` declarations and `EmberAttacherRegistry` are published directly from `'ember-attacher'`, `'ember-attacher/template-registry'`, and `'ember-attacher/test-support'`.
- **Styles:** Packaged plain CSS (`ember-attacher/styles` and `implicit-styles`) with zero Sass dependency and strict CSP compliance (`--ember-attacher-transition-duration` applied via CSSOM).

---

## 1. Bind Explicit Targets (Implicit Parent Target Removed in 5.0)

Attaching implicitly to a parent DOM element (`<button>Label <AttachTooltip>...</AttachTooltip></button>`) is deprecated in `4.4` (`ember-attacher.implicit-parent-target`) and removed in `5.0`. In `5.0`, an attachment with no bound Target asserts in debug builds and stays inert in production and SSR (it never falls back to `document.body`).

Choose whichever 4.4 explicit-target pattern fits your call site:

### Simple text tooltips: `{{tooltip}}` modifier

Backed by a single document-scoped Top-Layer DOM node and a `300ms` warm delay-group handoff across adjacent tooltips:

```hbs
{{!-- Before --}}
<button type="button">
  Save
  <AttachTooltip @placement="top">Save changes</AttachTooltip>
</button>

{{!-- After (4.4+) --}}
<button type="button" {{tooltip "Save changes" placement="top"}}>
  Save
</button>
```

### Rich content or shared multi-target tooltips: `<:target>` / `<:content>` blocks

```hbs
{{!-- Before --}}
<button type="button">
  Help
  <AttachTooltip>Rich <strong>HTML</strong> tooltip</AttachTooltip>
</button>

{{!-- After (4.4+) --}}
<AttachTooltip>
  <:target as |target|>
    <button type="button" {{target}}>Help</button>
  </:target>
  <:content>
    Rich <strong>HTML</strong> tooltip
  </:content>
</AttachTooltip>
```

For lists or grids, pass row data to `{{target row}}` to share one attachment instance across items (`a.data` yields the active item's payload).

### External targets: `@target` or `[popovertarget]`

```hbs
{{!-- Via @target (Element, unique CSS selector, or VirtualElement) --}}
<button id="menu-btn" type="button">Options</button>
<AttachPopover @target="#menu-btn" @showOn="click" @hideOn="click clickout escapekey">
  Menu items
</AttachPopover>

{{!-- Or native HTML popovertarget pairing --}}
<button type="button" popovertarget="help-popover">Help</button>
<AttachPopover @id="help-popover">
  Help panel
</AttachPopover>
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

## 2. Deprecated Arguments & APIs (`until: '5.0.0'`)

All legacy options below remain functional in `4.4.0` with `until: '5.0.0'` deprecation warnings and are removed in `5.0.0`:

| Deprecated in 4.4 | Deprecation ID | 4.4+ / 5.0 Replacement |
|---|---|---|
| Implicit parent element | `ember-attacher.implicit-parent-target` | `{{tooltip}}`, `@target`, `{{a.target}}`, `<:target>`, or `[popovertarget]` |
| `@explicitTarget` | `ember-attacher.arg.explicit-target` | `@target` |
| `{{a.reference}}` | `ember-attacher.api.reference` | `{{a.target}}` |
| `a.setReference(...)` | `ember-attacher.api.set-reference` | `a.setTarget(...)` |
| `@flip` | `ember-attacher.arg.flip` | `@middleware={{array (flip fallbackPlacements=...)}}` via `flip` imported from `'ember-attacher'` |
| `@overflowPadding` | `ember-attacher.arg.overflow-padding` | `shift({ padding })` / `flip({ padding })` via `@middleware` |
| `@floatingUiOptions` | `ember-attacher.arg.floating-ui-options` | `@placement`, `@strategy`, and `@middleware` |
| `@floatingElementContainer` | `ember-attacher.arg.floating-element-container` | Default Top-Layer `[popover="manual"]` Host (no portal selector needed), or `@renderInPlace={{true}}` |
| `@isOffset` | `ember-attacher.arg.is-offset` | Remove; diagonal `safePolygon` hover corridor is automatic when `@interactive={{true}}` |
| `@style` | `ember-attacher.arg.style` | CSS classes (`@class` / `class="..."`) or `--ember-attacher-*` custom properties |
| `@additionalClass` | `ember-attacher.arg.additional-class` | `@class` or `class="..."` |
| `@onInitializeAttacher` | `ember-attacher.arg.on-initialize-attacher` | Element modifier on the Target or Attachment |
| `@onWillDestroy` | `ember-attacher.arg.on-will-destroy` | Element modifier teardown or `registerDestructor` |
| `@configKey` / `<BasicAttacher>` | *(removed in 5.0)* | `<AttachTooltip>`, `<AttachPopover>`, `<Attacher>`, or `{{tooltip}}` |

Re-exported Floating UI middleware builders can be imported directly from `'ember-attacher'`:
`{ arrow, autoPlacement, flip, hide, inline, limitShift, offset, shift, size }`.

---

## 3. Default Behavior Changes in 5.0

In `4.x`, all component defaults remain unchanged for backwards compatibility. In **`5.0.0`**, the following defaults change:

### `<AttachPopover>` defaults in 5.0

| Option | 4.x Default | 5.0 Default |
|---|---|---|
| `@showOn` | `'mouseenter focus'` | `'click'` |
| `@hideOn` | `'mouseleave blur escapekey'` | `'click clickout escapekey'` |
| `@interactive` | `false` | `true` |
| `@lazyRender` | `false` | `true` |

If you want hover-triggered `<AttachPopover>` behavior in 5.0 (or already opt into explicit triggers in 4.4), pass `@showOn`, `@hideOn`, `@interactive`, and `@lazyRender` explicitly.

### `@autoUpdate` default in 5.0

- **`4.x`:** `false`
- **`5.0`:** `true` while open (automatically tracks scroll, resize, and layout shifts via Floating UI `autoUpdate` only while visible, stopping cleanly on hide/teardown).

---

## 4. Testing Helpers

Import `isVisible` from `'ember-attacher/test-support'`:

```js
import { isVisible } from 'ember-attacher/test-support';
```
