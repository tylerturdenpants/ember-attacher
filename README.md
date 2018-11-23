# ember-attacher

[![npm version](https://badge.fury.io/js/ember-attacher.svg)](http://badge.fury.io/js/ember-attacher)
[![Download count all time](https://img.shields.io/npm/dt/ember-attacher.svg)](https://www.npmjs.com/package/ember-attacher)
[![npm](https://img.shields.io/npm/dm/ember-attacher.svg)](https://www.npmjs.com/package/ember-attacher)
[![Ember Observer Score](http://emberobserver.com/badges/ember-attacher.svg)](http://emberobserver.com/addons/ember-attacher)
[![Build Status](https://travis-ci.org/kybishop/ember-attacher.svg?branch=master)](https://travis-ci.org/kybishop/ember-attacher)

Tooltips and popovers made easy.
Just drop an `{{#attach-tooltip}}` or `{{#attach-popover}}` in a parent and your popper is ready to go!

```hbs
<button>
  Click me

  {{#attach-tooltip}}
    I'm a tooltip!
  {{/attach-tooltip}}
</button>

<button class="other-button">
  No click me!

  {{#attach-popover class="ember-attacher-popper"
                    hideOn='click'
                    isShown=true
                    showOn='click'}}
    I'm a popover!
  {{/attach-popover}}
</button>
```

See [the example site](https://kybishop.github.io/ember-attacher/) for a demonstration of all
available options.

## Installation

```bash
ember install ember-attacher
```

## Components

### `{{#attach-popover}}`

A popover attacher.
 - Has no default class or roles.
 - Does not modify the target in any way.
 - Adds `aria-hidden` attribute to the popper element

### `{{#attach-tooltip}}`

A tooltip attacher. Subclass of `{{#attach-popover}}`
- Has the default class `'ember-attacher-popper ember-attacher-tooltip'`
  - The default tooltip classes can be modified by altering the `tooltipClass`
    default. See [here](#user-defined-defaults) for details on editing default values.
- Default `role` attribute of `tooltip`.
- Causes the target to gain an `aria-describedby` attribute set to the tooltip's ID.

## Options

Below is a list of all available options, along with their defaults.

```javascript
{
  // The animation used to present the animation.
  // Options: ['fade', 'fill', 'none', 'perspective', 'scale', 'shift']
  animation: 'fill',

  // Whether or not an arrow will be displayed next to the attachment.
  arrow: false,

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

  // Interactive tooltips will not close when clicked or hovered over.
  interactive: false,

  // Set this to true if you have an interactive attachment that hides on mouseout and the
  // attachment is offset from its target. This should only be the case if you are using custom
  // CSS that offsets that attachment.
  isOffset: false,

  // Whether or not the attachment is initially shown.
  isShown: false,

  // If true, the attachment will only be inserted into the DOM on the first "show" trigger.
  // Useful for performance reasons, but will hide your attachment from search engines.
  lazyRender: false,

  // An options object that will be merged into popperOptions.
  modifiers: null,

  // A function to be fired when the attachment's visibility changes. The new visibility is passed
  // to the function as an arg.
  onChange: null,

  // The initial position of the attachment.
  // Options: ['left', 'right', 'top', 'bottom']
  placement: 'top',

  // The container where the attachment's DOM will be inserted.
  popperContainer: '.ember-application',

  // An options object that will be passed to Popper.js, the positioning library.
  popperOptions: null,

  // NOT RECOMMENDED: We currently allow you to pass an explicit target, but this may be removed
  // in a future release.
  // Please provide your thoughts here: https://github.com/kybishop/ember-attacher/issues/109
  popperTarget: null,

  // Whether or not to render the attachment in place in the DOM, as opposed to
  // on the popperContainer. NOTE: Rendering in place can cause z-index issues.
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
  useCapture: false
}
```

## User-defined defaults

User-defined defaults can be set in the consuming app or addon's config/environment.js. These defaults will be applied to every `{{#ember-attacher}}` and `{{#attach-tooltip}}`

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

The full list of editable defaults can be seen [here](https://github.com/kybishop/ember-attacher/blob/master/addon/defaults.js).

## Styles

`ember-attacher` provides [styles](https://github.com/kybishop/ember-attacher/blob/master/addon/styles/addon.scss#L85) for the default tooltip class, `ember-attacher-tooltip`, but no styles are included for `{{attach-popover}}`.

Example styling for a popover [can be found in the dummy app](https://github.com/kybishop/ember-attacher/blob/master/tests/dummy/app/styles/app.scss#L132). Note how the arrow must also be styled to match the popover (background color, size, etc.)

## Testing

Use the `isVisible()` test helper to check if an attachment is visible.

```javascript
import { click, find } from 'ember-native-dom-helpers';
import { isVisible } from 'ember-attacher';

test('example', async function(assert) {
  this.render(hbs`
    <button id="toggle">
      Click me, captain!

      {{#attach-popover id='attachment'
                        hideOn='click'
                        showOn='click'}}
        Click-toggled popover
      {{/attach-popover}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await click('#toggle');

  // You can also pass in a selector
  assert.equal(isVisible('#attachment'), true, 'Now shown');
});
```

# Development setup

### Installation

* `git clone` this repository
* `yarn install`

### Running Tests

* `ember test`
* `ember test --serve`

This addon uses ember-try to test against multiple versions of Ember:

* `ember try:each`
* `ember try:one ember-release --- ember test --serve`

### Running the dummy app

* `ember server`
* Visit your app at http://localhost:4200.

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).

# FAQ

### How are animations implemented?

Attachments are composed of two containers:
- [An outer container](https://github.com/kybishop/ember-attacher/blob/master/addon/templates/components/attach-popover.hbs#L2) for positioning (via [ember-popper](https://github.com/kybishop/ember-popper)/[popper.js](https://github.com/FezVrasta/popper.js)).
- [An inner container](https://github.com/kybishop/ember-attacher/blob/master/addon/templates/components/attach-popover.hbs#L12) for the content. This is the container that is animated.

The outer container is positioned right next to the target via the CSS `transform` property. The inner container is required because animations also use `transform`, which would otherwise conflict with the container's position.

`transform` and `tansition-duration` are the CSS magic that allows animations to smoothly shift up/down, left/right, etc.

Note that animations require an implementation for each position (left, right, top, and bottom):
- https://github.com/kybishop/ember-attacher/blob/master/addon/styles/addon.scss#L67
- https://github.com/kybishop/ember-attacher/blob/master/addon/styles/_mixins.scss#L75

# Credits

- [tippy.js](https://github.com/atomiks/tippyjs), the library that inspired
  ember-attacher.
- [popper.js](https://github.com/FezVrasta/popper.js), the library that powers
  positioning (via [ember-popper](https://github.com/kybishop/ember-popper))
- [ember-tooltips](https://github.com/sir-dunxalot/ember-tooltips), the addon that
  influenced much of ember-attacher's API.
