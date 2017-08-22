# ember-attacher

[![npm version](https://badge.fury.io/js/ember-attacher.svg)](http://badge.fury.io/js/ember-attacher)
![Download count all time](https://img.shields.io/npm/dt/ember-attacher.svg)
[![npm](https://img.shields.io/npm/dm/ember-attacher.svg)]()
[![Ember Observer Score](http://emberobserver.com/badges/ember-attacher.svg)](http://emberobserver.com/addons/ember-attacher)
[![Build Status](https://travis-ci.org/kybishop/ember-attacher.svg)](https://travis-ci.org/kybishop/ember-attacher)

Tooltips and popovers made easy. Just drop an ember-attacher in a parent, or
give it a target, and your popper is ready to go!

```html
<button>
  Click me

  {{#ember-attacher popperClass="ember-attacher-popper ember-attacher-tooltip"}}
    I'm a tooltip!
  {{/ember-attacher}}
</button>

<button class="other-button">No click me!</button>

{{#ember-attacher target=".other-button" popperClass="ember-attacher-popper ember-attacher-tooltip"}}
  I'm also a tooltip!
{{/ember-attacher}}
```

See [the example site](https://kybishop.github.io/ember-attacher/) for a list of all
available options.

## Installation

```bash
ember install ember-attacher
```

## User-defined defaults

User-defined defaults can be set in the consuming app or addon's config/environment.js. These defaults will be applied to every `{{#ember-attacher}}`

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
