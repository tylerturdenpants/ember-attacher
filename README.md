# ember-attacher

Tooltips and popovers made easy. Just drop an ember-attacher in a parent, or
give it a target, and your popper is ready to go!

```html
<button>
  Click me

  {{#ember-attacher popperClass="popper tooltip"}}
    I'm a tooltip!
  {{/ember-attacher}}
</button>

<button class="other-button">No click me!</button>

{{#ember-attacher target=".other-button" popperClass="popper tooltip"}}
  I'm also a tooltip!
{{/ember-attacher}}
```

See [the example site](https://kybishop.github.io/ember-attacher/) for a list of all
available options.

## Installation

```bash
ember install ember-attacher
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
