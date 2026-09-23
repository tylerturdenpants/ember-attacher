# How To Contribute

## Installation

* `git clone <repository-url>`
* `cd my-addon`
* `pnpm install`

## Linting

* `pnpm lint:hbs`
* `pnpm lint:js`
* `pnpm lint:js -- --fix`

## Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

## Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://cli.emberjs.com/release/](https://cli.emberjs.com/release/).

## Releasing

Published package is `addon/` (`pnpm release` from that directory). Ship **4.1.0** to npm `latest`; leave **4.0.0** on `beta`. Do not `npm dist-tag add ember-attacher@4.0.0 latest`.
