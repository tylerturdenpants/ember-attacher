# ember-attacher 2.0

## Quick Summary

- ember-popper was replaced by the [Floating UI](https://github.com/floating-ui/floating-ui)
- ember edition was changed to "octane"
- ember-test-waiters are used now to wait until positioning inside `requestAnimationFrame` happen in tests
- we dropped support for node < 12 and ember-source < 3.16

## Details

### API Changes

- instead of popper [modifiers](https://popper.js.org/docs/v2/modifiers/) you should use Floating UI [middleware](https://floating-ui.com/docs/middleware).
  You can import the default ones (like [offset](https://floating-ui.com/docs/offset) or [flip](https://floating-ui.com/docs/flip)) directly from `@floating-ui/dom`

  For example
  ```js
  const modifiers = { offset: { offset: 10 } };
  ```
  will become
  ```js
  import { offset } from '@floating-ui/dom';
  ...
  const middleware = [offset(10)]
  ```
- `popperContainer` is `floatingElementContainer` now 
- `popperOptions` is `floatingUiOptions` now. The object is passed to Floating UI [computePosition](https://floating-ui.com/docs/computePosition) function.
- `popperTarget` is `explicitTarget` now.
- Instead of `registerAPI` used to update your tooltip or popover manually, you should use `autoUpdate` [option](https://github.com/tylerturdenpants/ember-attacher#options).
  It  adds listeners that will automatically call an update function when necessary (if the user scrolls or resizes the screen, etc.).
- For more details see Floating UI [migration guide](https://floating-ui.com/docs/migration). Pay attention that `ember-attacher` v1 used Popper v1.

### IDs and CSS classes changes

- The prefix for the default floating element's `id` is now "-floating" instead of "-popper".
- The default `ember-attacher-popper` class is now `ember-attacher-floating`

### Compatibility

For Ember.js below the v3.20 you may need to install [@ember/render-modifiers](https://github.com/emberjs/ember-render-modifiers) (`ember install @ember/render-modifiers`).

The addon may work with the ember-source < 3.16, yet the support is not guaranteed.
