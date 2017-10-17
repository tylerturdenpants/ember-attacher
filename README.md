# ember-attacher

[![npm version](https://badge.fury.io/js/ember-attacher.svg)](http://badge.fury.io/js/ember-attacher)
![Download count all time](https://img.shields.io/npm/dt/ember-attacher.svg)
[![npm](https://img.shields.io/npm/dm/ember-attacher.svg)]()
[![Ember Observer Score](http://emberobserver.com/badges/ember-attacher.svg)](http://emberobserver.com/addons/ember-attacher)
[![Build Status](https://travis-ci.org/kybishop/ember-attacher.svg)](https://travis-ci.org/kybishop/ember-attacher)

Tooltips and popovers made easy.
Just drop an attach-tooltip or ember-attacher in a parent and your popper is ready to go!

```html
<button>
  Click me

  {{#attach-tooltip}}
    I'm a tooltip!
  {{/attach-tooltip}}
</button>

<button class="other-button">
  No click me!

  {{#ember-attacher class="custom-popover-css"
                    hideOn='click'
                    isShown=true
                    showOn='click'}}
    I'm a popover!
  {{/ember-attacher}}
</button>
```

See [the example site](https://kybishop.github.io/ember-attacher/) for a list of all
available options.

## Installation

```bash
ember install ember-attacher
```

## Components

### `{{#ember-attacher}}`

The base component.
 - Has no default class or roles.
 - Does not modify the target in any way.

### `{{#attach-tooltip}}`

A tooltip attacher.
- Has the default class `'ember-attacher-popper ember-attacher-tooltip'`
  - The default tooltip classes can be modified by altering the `tooltipClass`
    default. See [here](#user-defined-defaults) for details on editing default values.
- Default `role` attribute of `tooltip`.
- Causes the target to gain an `aria-describedby` attribute set to the tooltip's ID.


## User-defined defaults

User-defined defaults can be set in the consuming app or addon's config/environment.js. These defaults will be applied to every `{{#ember-attacher}}` and `{{#attach-tooltip}}`

```javascript
// config/environment/js

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

# Credits

- [tippy.js](https://github.com/atomiks/tippyjs), the library that inspired
  ember-attacher.
- [popper.js](https://github.com/FezVrasta/popper.js), the library that powers
  positioning (via [ember-popper](https://github.com/kybishop/ember-popper))
- [ember-tooltips](https://github.com/yapplabs/ember-tether), the addon that
  influenced much of ember-attacher's API.
