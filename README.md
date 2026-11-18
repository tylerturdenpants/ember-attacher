# ember-attacher

[![npm version](https://badge.fury.io/js/ember-attacher.svg)](http://badge.fury.io/js/ember-attacher)
[![Download count all time](https://img.shields.io/npm/dt/ember-attacher.svg)](https://www.npmjs.com/package/ember-attacher)
[![npm](https://img.shields.io/npm/dm/ember-attacher.svg)](https://www.npmjs.com/package/ember-attacher)
[![Ember Observer Score](http://emberobserver.com/badges/ember-attacher.svg)](http://emberobserver.com/addons/ember-attacher)
[![GitHub CI](https://github.com/tylerturdenpants/ember-attacher/actions/workflows/ci.yml/badge.svg)](https://github.com/tylerturdenpants/ember-attacher/actions/workflows/ci.yml)

## Compatibility

* Ember.js v3.28 through v6.x and v7.x (including Embroider + Vite)
* Ember CLI v3.28 or above
* Node.js v18 or above

Tooltips and popovers made easy.
Just drop an `<AttachTooltip/>` or `<AttachPopover/>` in a parent and your floating element is ready to go!

### `<template>` (`.gjs` / `.gts`)

```gjs
import { AttachPopover, AttachTooltip, offset } from 'ember-attacher';

const offsetMiddleware = [offset(12)];

<template>
  <button type="button">
    Hover me
    <AttachTooltip @placement="top-start">
      I'm a tooltip!
    </AttachTooltip>
  </button>

  <button type="button" class="other-button">
    Click me
    <AttachPopover
      @class="ember-attacher-popover"
      @showOn="click"
      @hideOn="click clickout escapekey"
      @interactive={{true}}
      @middleware={{offsetMiddleware}}
    >
      I'm an interactive popover!
    </AttachPopover>
  </button>
</template>
```

### Loose templates (`.hbs`)

```hbs
<button>
  Click me

  <AttachTooltip>
    I'm a tooltip!
  </AttachTooltip>
</button>

<button class="other-button">
  No click me!

  <AttachPopover 
      @class='ember-attacher'
      @hideOn='click'
      @isShown={{true}}
      @showOn='click'
  >
    I'm a popover!
  </AttachPopover>
</button>
```

You can also target an element outside the parent using `@explicitTarget` (accepting a CSS selector string, an Element, or a Floating UI virtual element):

```hbs
<button id="external-target">Target</button>

<AttachPopover @explicitTarget="#external-target">
  I'm attached to #external-target!
</AttachPopover>
```

See [the example site](https://tylerturdenpants.github.io/ember-attacher/) for a demonstration of all
available options.

## Installation

```bash
ember install ember-attacher
```

If you're upgrading from **3.x to 4.x**, see the [4.1 upgrade guide](./addon/docs/upgrade-guide-4.1.md).
If you're upgrading from 1.x to 2.x, see the [2.0 upgrade guide](./addon/docs/upgrade-guide-2.0.md).


## Components

### `<AttachPopover/>`

A popover attacher.

* Default `role` attribute of `dialog`.
* Adds `aria-hidden` attribute to the floating element.
* While mounted, sets `aria-haspopup` (matching `@ariaRole` or `'dialog'`), `aria-controls`, and
  `aria-expanded` on the Target when those attributes are not already provided by the caller.
* Restores focus to the Target when dismissed via `Escape` while focus is inside the popover.

### `<AttachTooltip/>`

A tooltip attacher. Subclass of `<AttachPopover/>`

* Has the default class `'ember-attacher-floating ember-attacher-tooltip'`
  * The default tooltip classes can be modified by altering the `tooltipClass`
    default. See [here](#user-defined-defaults) for details on editing default values.

* Default `role` attribute of `tooltip`.
* While open, token-safely adds the tooltip's ID to the Target's `aria-describedby`
  (preserving any pre-existing tokens) and removes it again when closed.

### `{{tooltip}}` and `<Attacher>`

`{{tooltip "Text" class="hint"}}` puts a tooltip on a void or simple element such as `<button>` or `<input>`. Every `{{tooltip}}` in the document shares one `.ember-attacher` node. Moving to another tooltip within 300ms skips `showDelay`.

`<Attacher as |a|>` is the headless host. `{{a.target}}` marks a trigger, `{{a.attachment}}` marks the floating element, and `{{a.arrow}}` marks the arrow.

`<AttachTooltip>` and `<AttachPopover>` also take `<:target>` and `<:content>` blocks, `@target` (the same as `@explicitTarget`), and a native `[popovertarget]` button whose value matches `@id`.

## Options

Below is a list of all available options, along with their defaults.

```javascript
{
  // The animation used to present the animation.
  // Options: ['fade', 'fill', 'none', 'perspective', 'scale', 'shift']
  animation: 'fill',

  // Whether or not an arrow will be displayed next to the attachment.
  arrow: false,
    
  // Add listeners that will automatically call an update function
  // Pass `true` to use the Floating UI default options or Options object to override them
  // Example: { ancestorScroll: false }
  // For more details see https://floating-ui.com/docs/autoUpdate 
  autoUpdate: false,

  // A class that will be applied to the attachment.
  class: null,

  // The flip priority of the attacment.
  // Space-delimited string, any combination of ['left', 'right', 'top', 'bottom']
  //
  // Example: 'left top bottom'
  flip: null,

  // The delay, in milliseconds, before the attachment will be hidden.
  hideDelay: 0,

  // The duration, in milliseconds, of the hide animation.
  hideDuration: 300,

  // Events that will cause the attachment to hide, typically in reference to the target.
  //
  // Space-delimited string, any combination of:
  // ['click', 'clickout', 'mouseleave blur escapekey']
  hideOn: 'mouseleave blur escapekey',

  // Interactive attachments stay open while the pointer is over the Target, Attachment, or the
  // automatic safePolygon corridor between them (when hideOn includes mouseleave).
  interactive: false,

  // Kept for compatibility in 4.3. Interactive + mouseleave already uses safePolygon
  // automatically; isOffset will be deprecated in 4.4.
  isOffset: false,

  // Whether or not the attachment is initially shown.
  isShown: false,

  // If true, the attachment will only be inserted into the DOM on the first "show" trigger.
  // Useful for performance reasons, but will hide your attachment from search engines.
  lazyRender: false,

  // A middleware array that will be merged into computePosition options.
  // Built-in Floating UI middleware builders are re-exported from 'ember-attacher':
  // { offset, flip, shift, limitShift, size, inline, hide, autoPlacement, arrow }
  middleware: null,

  // A function to be fired when the attachment's visibility changes. The new visibility is passed
  // to the function as an arg.
  onChange: null,

  // The initial position of the attachment.
  // Options: [
  //   'top', 'top-start', 'top-end',
  //   'right', 'right-start', 'right-end',
  //   'bottom', 'bottom-start', 'bottom-end',
  //   'left', 'left-start', 'left-end'
  // ]
  placement: 'top',

  // The CSS position strategy used by Floating UI ('absolute' | 'fixed').
  strategy: 'absolute',

  // The container where the attachment's DOM will be inserted.
  floatingElementContainer: '.ember-application',

  // An options object that will be passed to Floating UI "computePosition" function.
  floatingUiOptions: null,

  // Explicit attachment target. Default remains the parent element when unset.
  // Accepts an Element, a CSS selector string (exactly one match), or a Floating UI
  // VirtualElement (`{ getBoundingClientRect, getClientRects?, contextElement? }`).
  // The block also yields `setReference` and a `reference` modifier for composition.
  explicitTarget: null,

  // Whether or not to render the attachment in place in the DOM, as opposed to
  // on the floatingElementContainer. NOTE: Rendering in place can cause z-index issues.
  renderInPlace: false,

  // The delay, in milliseconds, before the attachment will be shown.
  showDelay: 0,

  // The duration, in milliseconds, of the show animation.
  showDuration: 300,

  // Events on the target that will cause the attachment to show. For performance reasons, we
  // recommend using some combination of 'mouseenter', 'focus', and 'click'
  showOn: 'mouseenter focus',

  // Whether to add event listeners for attachment show and hide in the capturing phase rather
  // than the bubbling phase. This should be set to true when there are elements on the page that
  // are stopping event propagation in the bubbling phase, and as a result preventing correct
  // showing and hiding of popovers and tooltips.
  useCapture: false,

  // The default padding if collision happens. Set "false" if no collision prevention needed 
  overflowPadding: 5 
}
```

## User-defined defaults

User-defined defaults can be set in the consuming app or addon's config/environment.js. These defaults will be applied to every `<AttachPopover/>` and `<AttachTooltip/>`

```javascript
// config/environment.js

module.exports = function(environment) {
  var ENV = {
    emberAttacher: {
      animation: 'shift',
      arrow: true
    }
  };
}
```

You can also set the user-defined defaults separately like so:

```javascript
// config/environment.js

module.exports = function(environment) {
  var ENV = {
    emberAttacher: {
      tooltip: {
        animation: 'fade',
        arrow: true
      },
      popover: {
        animation: 'shift',
        arrow: false
      }
    }
  };
}
```

And finally you can do shared defaults along with user-defined separated defaults:

```javascript
// config/environment.js

module.exports = function(environment) {
  var ENV = {
    emberAttacher: {
      showDuration: 300,
      hideDuration: 300,
      tooltip: {
        animation: 'fade',
        arrow: true
      },
      popover: {
        animation: 'shift',
        arrow: false
      }
    }
  };
}
```

The full list of editable defaults can be seen [here](https://github.com/kybishop/ember-attacher/blob/master/addon/defaults.js).

## Styles

`ember-attacher` provides CSS for the default tooltip class, `ember-attacher-tooltip` (`ember-attacher/styles`; also injected via `implicit-styles`). `<AttachPopover>` has no packaged look unless you opt in with `@class="ember-attacher-popover"` (same tokens as the tooltip; not applied automatically).

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
  --ember-attacher-padding: 0.5rem 1rem;
  --ember-attacher-shadow: none;
  --ember-attacher-max-width: 400px;
  --ember-attacher-font-size: inherit;
  --ember-attacher-text-align: center;
}
```

`.ember-attacher-light-theme` reassigns those same tokens (fill `#f3f6f9`, text `#203d5d`, border `#ced2e2`, `border-width: 1px`, the existing shadow).

Outer wrapper tokens on `.ember-attacher`:
* `--ember-attacher-distance` (default `10px`): inner animation gap.
* `--ember-attacher-z-index` (default `9999`): stacking context.
* `--ember-attacher-transition-duration` (default `0ms`): driven via CSSOM from `@showDuration` / `@hideDuration` (strict CSP `style-src` compatible without `'unsafe-inline'`), and automatically forced to `0ms` under `@media (prefers-reduced-motion: reduce)`.
Set them on `.ember-attacher` or an ancestor container. `--ember-attacher-offset` and `--ember-attacher-arrow-rotate` stay internal.

Dummy popover example: `@class="ember-attacher-popover custom-popover-css"` in `test-app` (token overrides only). See the [4.1 upgrade guide](./addon/docs/upgrade-guide-4.1.md).

## Testing

Use the `isVisible()` test helper to check if an attachment is visible.

```javascript
import { click, find, render } from '@ember/test-helpers';
import { isVisible } from 'ember-attacher/test-support';

test('example', async function(assert) {
  await render(hbs`
    <button id="toggle" type="button">
      Click me, captain!

      <AttachPopover 
          @id='attachment'
          @hideOn='click'
          @showOn='click'
      >
        Click-toggled popover
      </AttachPopover>
    </button>
  `);

  const attachment = find('#attachment');

  assert.false(isVisible(attachment), 'Initially hidden');

  await click('#toggle');

  // You can also pass in a selector
  assert.true(isVisible('#attachment'), 'Now shown');
});
```

`import { isVisible } from 'ember-attacher'` is also supported for backward compatibility.

## Development setup

See the [Contributing](CONTRIBUTING.md) guide for details.

## FAQ

### How animations are implemented

Attachments are composed of two containers:

* [An outer container](https://github.com/kybishop/ember-attacher/blob/master/addon/templates/components/attach-popover.hbs#L2) for positioning (via [floating-ui](https://github.com/floating-ui/floating-ui)).
* [An inner container](https://github.com/kybishop/ember-attacher/blob/master/addon/templates/components/attach-popover.hbs#L12) for the content. This is the container that is animated.

The outer container is positioned right next to the target via the CSS `transform` property. The inner container is required because animations also use `transform`, which would otherwise conflict with the container's position.

`transform` and `tansition-duration` are the CSS magic that allows animations to smoothly shift up/down, left/right, etc.

Note that animations require an implementation for each position (left, right, top, and bottom):

* <https://github.com/kybishop/ember-attacher/blob/master/addon/styles/addon.scss#L67>

* <https://github.com/kybishop/ember-attacher/blob/master/addon/styles/_mixins.scss#L75>

## Credits

* [tippy.js](https://github.com/atomiks/tippyjs), the library that inspired
  ember-attacher.

* [floating-ui](https://github.com/floating-ui/floating-ui), the library that powers
  positioning

* [ember-tooltips](https://github.com/sir-dunxalot/ember-tooltips), the addon that
  influenced much of ember-attacher's API.
