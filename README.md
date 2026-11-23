# ember-attacher

[![npm version](https://badge.fury.io/js/ember-attacher.svg)](http://badge.fury.io/js/ember-attacher)
[![Download count all time](https://img.shields.io/npm/dt/ember-attacher.svg)](https://www.npmjs.com/package/ember-attacher)
[![npm](https://img.shields.io/npm/dm/ember-attacher.svg)](https://www.npmjs.com/package/ember-attacher)
[![Ember Observer Score](http://emberobserver.com/badges/ember-attacher.svg)](http://emberobserver.com/addons/ember-attacher)
[![GitHub CI](https://github.com/tylerturdenpants/ember-attacher/actions/workflows/ci.yml/badge.svg)](https://github.com/tylerturdenpants/ember-attacher/actions/workflows/ci.yml)

## Compatibility

* Ember.js v4.12 LTS through v6.x and v7.x (including Embroider + Vite and classic builds)
* Ember CLI v4.12 or above
* Node.js v20 LTS or above
* Full TypeScript & Glint `.d.ts` declarations (`ember-attacher`, `ember-attacher/template-registry`, `ember-attacher/test-support`)

Tooltips and popovers for Ember powered by `@floating-ui/dom` and native Top-Layer `[popover="manual"]` hosts.

### `<template>` (`.gjs` / `.gts`)

```gts
import { AttachPopover, AttachTooltip, offset, tooltip } from 'ember-attacher';

const offsetMiddleware = [offset(12)];

<template>
  <button type="button" {{tooltip "Quick singleton tooltip" placement="top"}}>
    Singleton modifier
  </button>

  <AttachTooltip @placement="top-start">
    <:target as |target|>
      <button type="button" {{target}}>Hover me</button>
    </:target>
    <:content>
      I'm a rich <strong>HTML</strong> tooltip!
    </:content>
  </AttachTooltip>

  <button id="menu-trigger" type="button">
    Click me
  </button>
  <AttachPopover
    @target="#menu-trigger"
    @class="ember-attacher-popover"
    @middleware={{offsetMiddleware}}
  >
    I'm an interactive popover!
  </AttachPopover>
</template>
```

### Loose templates (`.hbs`)

```hbs
{{!-- External target --}}
<button id="external-target" type="button">Target</button>
<AttachPopover @target="#external-target">
  I'm attached to #external-target!
</AttachPopover>

{{!-- Native HTML invokers ([popovertarget] / [interestfor]) --}}
<button type="button" interestfor="hint-tooltip">Details</button>
<AttachTooltip @id="hint-tooltip">
  Declarative tooltip via interestfor
</AttachTooltip>
```

See [the example site](https://tylerturdenpants.github.io/ember-attacher/) for a live gallery of placements and animations.

## Installation

```bash
ember install ember-attacher
```

If you're upgrading to **5.0** from 4.x, see the [5.0 upgrade guide](./addon/docs/upgrade-guide-5.0.md).
If you're upgrading from **3.x to 4.x**, see the [4.1 upgrade guide](./addon/docs/upgrade-guide-4.1.md).
If you're upgrading from **1.x to 2.x**, see the [2.0 upgrade guide](./addon/docs/upgrade-guide-2.0.md).

## Components & Modifiers

### `{{tooltip}}` modifier

`{{tooltip "Text" class="hint"}}` attaches a tooltip to a void or simple element such as `<button>` or `<input>`. Uncontrolled `{{tooltip}}` modifiers in the document share one singleton `.ember-attacher` DOM node with a `300ms` warm delay-group handoff across adjacent tooltips, while controlled `{{tooltip "..." isShown=...}}` modifiers allocate a dedicated host instance so concurrent or hover tooltips never steal or hide them.

### `<AttachTooltip/>`

A target-attached tooltip component (default `ariaRole="tooltip"`).

* Must be bound to a Target (`@target`, `<:target>`, `{{a.target}}`, `a.setTarget()`, `[popovertarget]`, or `[interestfor]`). Asserts in debug if no target binding is provided (nullable reactive `@target={{this.target}}` is supported). Relative `@target` tokens (`:previous`, `:previous(selector)`, `:closest(selector)`, `:parent`) resolve from the in-place Host without wrapper elements or `<meta hidden>`.
* Has the default class `'ember-attacher-floating ember-attacher-tooltip'` (configurable via `tooltipClass`).
* Hoverable by default (`@interactive={{true}}`) per WCAG 1.4.13 with an automatic `safePolygon` diagonal pointer corridor (pass `@interactive={{false}}` to opt out).
* Smart Tooltip ARIA: binds `aria-labelledby` upfront on nameless triggers (such as icon buttons), suppresses duplicate `aria-describedby` when tooltip text matches the trigger's accessible name, and otherwise binds open-only token-safe `aria-describedby`.

### `<AttachPopover/>`

An interactive popover component (default `ariaRole="dialog"`, `showOn="click"`, `hideOn="click clickout escapekey"`, `interactive=true`, `lazyRender=true`).

* Must be bound to a Target (`@target`, `<:target>`, `{{a.target}}`, `a.setTarget()`, `[popovertarget]`, or relative tokens such as `@target=":previous"`).
* Has **no default visual look** by default (tooltip styles are not applied automatically); pass `@class="ember-attacher-popover"` or configure `ENV.emberAttacher.popoverClass` (or `popover.popoverClass`) to opt into default styling. Arrows and `--ember-attacher-*` tokens work with any custom `@class`.
* Renders `<div class="ember-attacher" popover="manual">` in place in 1 pass and promotes to the browser Top Layer on open (`@renderInPlace={{true}}` opts out of Top Layer).
* While mounted, sets `aria-haspopup` (matching `@ariaRole` or `'dialog'`), `aria-controls`, and `aria-expanded` on the Target when not already provided by the caller.
* Restores focus to the Target when dismissed via `Escape` while focus is inside the popover.

### `<Attacher as |a|>`

The headless primitive yielding `{ target, attachment, arrow, setTarget, show, hide, toggle, update, isShown, shouldRender, data, placement, middlewareData }`. Use `{{a.target data}}` to share one overlay across list items, `{{a.attachment}}` on your own floating element, and `{{a.arrow}}` on an optional arrow element.

## Options

Below are the 5.0 defaults (shared defaults from `addon/src/defaults.ts`; `<AttachPopover>` overrides `showOn: 'click'`, `hideOn: 'click clickout escapekey'`, and `lazyRender: true`):

```typescript
{
  // Animation used to present and dismiss the attachment:
  // 'fade' | 'fill' | 'none' | 'perspective' | 'scale' | 'shift'
  animation: 'fill',

  // Whether an arrow element is rendered and positioned by Floating UI.
  arrow: false,

  // Keeps position updated while open via Floating UI autoUpdate().
  // Pass `true` or Floating UI AutoUpdateOptions (e.g. `{ ancestorScroll: false }`), or `false`.
  autoUpdate: true,

  // Class(es) applied to the inner attachment container.
  class: null,

  // Delay in milliseconds before the attachment hides.
  hideDelay: 0,

  // Duration in milliseconds of the hide transition.
  hideDuration: 300,

  // Space-delimited events that hide the attachment:
  // 'click' | 'clickout' | 'mouseleave' | 'blur' | 'focusout' | 'escapekey' | null
  // (<AttachPopover> defaults to 'click clickout escapekey')
  hideOn: 'mouseleave blur escapekey',

  // Keeps attachment open while pointer/focus enters it or traverses the safePolygon corridor.
  interactive: true,

  // Controlled visibility flag.
  isShown: false,

  // Defers rendering inner content until the attachment is first triggered.
  // (<AttachPopover> defaults to true)
  lazyRender: false,

  // Floating UI middleware array merged and deduplicated by `m.name`.
  // Default `flip()` and `shift({ limiter: limitShift(), padding: 5 })` apply unless overridden.
  // Pass `hide()` when you want attachments to hide once their target scrolls out of a clipping container.
  // Re-exported builders from 'ember-attacher':
  // { arrow, autoPlacement, flip, hide, inline, limitShift, offset, shift, size }
  middleware: null,

  // Shorthand Floating UI offset() option (number or OffsetOptions), prepended unless @middleware already has `offset`.
  // When active, `.ember-attacher[data-offset]` uses Floating UI for the resting gap instead of `--ember-attacher-distance`.
  offset: null,

  // Invoked with the new visibility boolean when the attachment shows or hides.
  onChange: null,

  // Initial Floating UI placement:
  // 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end'
  // | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end'
  placement: 'top',

  // Default inner class applied to <AttachPopover> (configured via ENV.emberAttacher; '' keeps popovers unstyled).
  popoverClass: '',

  // Renders in place without promoting to the browser Top Layer ([popover="manual"]).
  renderInPlace: false,

  // Delay in milliseconds before the attachment shows.
  showDelay: 0,

  // Duration in milliseconds of the show transition.
  showDuration: 300,

  // Space-delimited events that show the attachment:
  // 'mouseenter' | 'focus' | 'click' | null
  // (<AttachPopover> defaults to 'click')
  showOn: 'mouseenter focus',

  // CSS positioning strategy used by Floating UI ('absolute' | 'fixed').
  strategy: 'absolute',

  // Attach Target (`Element | CSS selector | relative token (':previous' | ':previous(...)' | ':closest(...)' | ':parent') | VirtualElement`).
  target: null,

  // Registers target/document event listeners in the capture phase.
  useCapture: false,
}
```

## Recipes

### Encapsulated sibling / relative targets (`:previous`, `:closest(...)`, `:parent`)

Because 5.0 renders `.ember-attacher` directly in place, encapsulated popover or tooltip components can target an adjacent trigger without `<meta hidden>` or `ember-ref-bucket`:

```hbs
{{!-- Preferred: sibling placement keeps valid HTML and stacks cleanly (skipping .ember-attacher siblings) --}}
<button type="button">Options</button>
<AttachTooltip @target=":previous">Quick hint</AttachTooltip>
<AttachPopover @target=":previous(button)" @offset={{8}}>
  Menu items
</AttachPopover>
```

Use `:closest(<selector>)` to resolve an ancestor wrapper (starting from `parentElement`), or `:parent` for non-interactive parent containers (avoid nesting interactive popovers inside `<button>` or `<a>`).

### Pinning and flipping within a custom boundary

Pass Floating UI `flip` and `shift` options with a custom `boundary` element via `@middleware` to keep an attachment constrained inside a scroll area or layout panel:

```gts
import { tracked } from '@glimmer/tracking';
import { modifier } from 'ember-modifier';
import { AttachPopover, flip, shift } from 'ember-attacher';

export default class BoundaryDemo {
  @tracked containerEl = null;

  registerContainer = modifier((element) => {
    this.containerEl = element;
  });

  get boundaryMiddleware() {
    if (!this.containerEl) return [];
    return [
      flip({ boundary: this.containerEl }),
      shift({ boundary: this.containerEl, padding: 8 }),
    ];
  }

  <template>
    <div {{this.registerContainer}}>
      <button id="panel-btn" type="button">Options</button>
      <AttachPopover @target="#panel-btn" @middleware={{this.boundaryMiddleware}}>
        Stays within containerEl
      </AttachPopover>
    </div>
  </template>
}
```

### Coordinate / virtual targets (`VirtualElement`, no DOM trigger)

Pass any `{ getBoundingClientRect() }` object to `@target` with `@showOn={{null}}` and controlled `@isShown` (or `a.show(virtualTarget)`). Add `@autoUpdate={{hash animationFrame=true}}` when tracking moving coordinates or externally animated elements:

```gts
import { hash } from '@ember/helper';
import { AttachPopover } from 'ember-attacher';

const cursorTarget = {
  getBoundingClientRect() {
    return { x: 160, y: 120, top: 120, left: 160, right: 160, bottom: 120, width: 0, height: 0 };
  },
};

<template>
  <AttachPopover
    @target={{cursorTarget}}
    @showOn={{null}}
    @isShown={{true}}
    @autoUpdate={{hash animationFrame=true}}
  >
    Positioned at virtual coordinates
  </AttachPopover>
</template>
```

### Portal / body-level stacking with `{{#in-element}}` + `@renderInPlace`

By default, components promote in place to the browser Top Layer (`popover="manual"`). When you want explicit DOM container placement and `z-index` stacking instead, opt out of Top Layer with `@renderInPlace={{true}}` inside `{{#in-element}}`:

```hbs
{{#in-element this.portalContainer insertBefore=null}}
  <AttachPopover
    @target="#trigger"
    @renderInPlace={{true}}
    @class="my-z-indexed-popover"
  >
    Rendered inside portalContainer with traditional CSS stacking
  </AttachPopover>
{{/in-element}}
```

### Re-binding externally replaced DOM elements (`@target` / `a.setTarget`)

String selectors in `@target` resolve once when `@target` mounts or changes. If a third-party widget (such as a calendar or data grid) tears down and recreates target nodes without re-rendering your template, pass a tracked element via `@target={{this.targetEl}}` (or use `<AttachPopover @target={{null}} as |a|>` and call `a.setTarget(el, data)`):

```gts
import { tracked } from '@glimmer/tracking';
import { AttachPopover } from 'ember-attacher';

export default class ExternalWidgetOverlay {
  @tracked targetEl = null;
  @tracked activeEvent = null;

  // Hook into widget mount / click callbacks:
  onWidgetItemMounted = (el, eventData) => {
    this.targetEl = el;
    this.activeEvent = eventData;
  };

  <template>
    <AttachPopover @target={{this.targetEl}}>
      {{this.activeEvent.title}}
    </AttachPopover>
  </template>
}
```

## User-defined defaults

User-defined defaults can be configured in the consuming app's `config/environment.js`:

```javascript
// config/environment.js
module.exports = function (environment) {
  let ENV = {
    emberAttacher: {
      showDuration: 200,
      hideDuration: 200,
      tooltip: {
        animation: 'fade',
        arrow: true,
      },
      popover: {
        animation: 'shift',
        arrow: false,
      },
    },
  };
  return ENV;
};
```

See [defaults.ts](./addon/src/defaults.ts) for all configurable keys.

## Styles

`ember-attacher` provides CSS for the default tooltip class, `ember-attacher-tooltip` (`ember-attacher/styles`, also auto-injected via `ember-addon.implicit-styles` when the host app depends on `ember-attacher` directly). If an intermediate addon only lists `ember-attacher` as a `peerDependency`, the host app must also depend on `ember-attacher` directly or `import 'ember-attacher/styles';`. `<AttachPopover>` has no packaged look unless you opt in with `@class="ember-attacher-popover"` or configure `ENV.emberAttacher.popoverClass` (arrow and fill-backdrop geometry work with any `@class` without needing `.ember-attacher-popover`).

Default token values use `:where()` so an app class can override them even if addon `implicit-styles` load last.

```css
.ember-attacher-tooltip,
.ember-attacher-popover {
  --ember-attacher-fill: #333;
  --ember-attacher-text: #fff;
  --ember-attacher-radius: 4px;
  --ember-attacher-border: var(--ember-attacher-fill);
  --ember-attacher-border-width: 0px; /* set to 1px+ when you need a visible border */
  --ember-attacher-arrow-size: 10px;
  /* Optional independent pointer dimensions (default to arrow-size * √2 and / √2):
     --ember-attacher-arrow-width: 12px;
     --ember-attacher-arrow-height: 5px; */
  --ember-attacher-padding: 0.5rem 1rem;
  --ember-attacher-shadow: none;
  --ember-attacher-max-width: 400px;
  --ember-attacher-font-size: inherit;
  --ember-attacher-line-height: inherit;
  --ember-attacher-text-align: center;
}
```

`.ember-attacher-light-theme` reassigns those same tokens (fill `#f3f6f9`, text `#203d5d`, border `#ced2e2`, `border-width: 1px`, and box shadow).

Outer wrapper tokens on `.ember-attacher`:
* `--ember-attacher-distance` (default `10px`): inner animation gap when Floating UI `offset()` is not active.
* `--ember-attacher-slide-distance` (defaults to `var(--ember-attacher-distance, 10px)`): entry/exit animation travel distance when `@offset` or `offset()` middleware sets `[data-offset]`.
* `--ember-attacher-z-index` (default `9999`): stacking context (used for non-Top-Layer / `@renderInPlace` hosts).
* `--ember-attacher-transition-duration` (default `0ms`): driven via CSSOM from `@showDuration` / `@hideDuration` (strict CSP `style-src` compatible without `'unsafe-inline'`). Spatial transforms opt in under `@media (prefers-reduced-motion: no-preference)`, and `@media (prefers-reduced-motion: reduce)` caps opacity transitions to `min(var(--ember-attacher-transition-duration, 0ms), 100ms)`.

Set outer tokens on `.ember-attacher` or an ancestor container. `--ember-attacher-offset` and `--ember-attacher-arrow-rotate` remain internal.

## Architecture & Animations

Attachments use two nested elements rendered directly in place (1 pass):

* **Outer host** (`.ember-attacher[popover="manual"]`, see [attacher-overlay.gts](./addon/src/lib/attacher-overlay.gts)): promoted to the Top Layer via `showPopover()`, positioned relative to the Target by `@floating-ui/dom`, and annotated with `data-placement` / `x-placement` plus `data-open` / `data-closing`.
* **Inner content container**: hosts visual styles, the optional `.ember-attacher-arrow`, and `.ember-attacher-fill-circle` backdrop. Keeping inner animations decoupled from Floating UI's outer coordinates avoids layout interference while Top-Layer transitions animate entry via `@starting-style` and exit via `transition-behavior: allow-discrete` + Web Animations (`getAnimations({ subtree: true })`).

See [ember-attacher.css](./addon/src/styles/ember-attacher.css) for the full placement and animation definitions.

## Testing

Use the `isVisible()` helper from `'ember-attacher/test-support'`:

```javascript
import { click, find, render } from '@ember/test-helpers';
import { isVisible } from 'ember-attacher/test-support';

test('example', async function (assert) {
  await render(hbs`
    <button id="toggle" type="button">
      Click me, captain!
    </button>

    <AttachPopover
      @id="attachment"
      @target="#toggle"
      @hideOn="click"
      @showOn="click"
    >
      Click-toggled popover
    </AttachPopover>
  `);

  const attachment = find('#attachment');

  assert.false(isVisible(attachment), 'Initially hidden');

  await click('#toggle');

  // You can also pass in a selector
  assert.true(isVisible('#attachment'), 'Now shown');
});
```

`import { isVisible } from 'ember-attacher'` is also supported for convenience.

To check that an open attachment actually sits next to its target, use `assertAttached()`. It pushes one QUnit result listing every problem it finds: not visible, wrong `data-placement`, wrong side, gap larger than `maxGap` (default `24`px), no cross-axis overlap with the target, arrow not pointing at the target, overflowing the viewport, or covered by another element.

```javascript
import { triggerEvent } from '@ember/test-helpers';
import { assertAttached } from 'ember-attacher/test-support';

await triggerEvent('#trigger', 'mouseenter');
assertAttached(assert, '#tip', '#trigger', { placement: 'bottom' });
```

## Development setup

See the [Contributing](CONTRIBUTING.md) guide for details.

## Credits

* [tippy.js](https://github.com/atomiks/tippyjs), the library that inspired ember-attacher.
* [floating-ui](https://github.com/floating-ui/floating-ui), the library that powers positioning.
* [ember-tooltips](https://github.com/sir-dunxalot/ember-tooltips), the addon that influenced much of ember-attacher's initial API.
