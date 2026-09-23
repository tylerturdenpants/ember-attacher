# ember-attacher 4.1

4.1.0 is the first npm `latest` of the v2 addon line. Skip **4.0.0** — that tag stayed on `beta`.

## Quick summary

- Packaging is a [v2 Ember addon](https://rfcs.emberjs.com/id/0507-embroider-v2-package-format/) (Embroider-friendly). Your templates stay the same.
- Nested `<AttachTooltip>` / `<AttachPopover>`, existing args, events, CSS class names, and `environment.js` defaults are unchanged.
- The addon no longer depends on `ember-cli-sass`, `ember-maybe-in-element`, or `@ember/render-modifiers`.
- Default tooltip styles ship as CSS, not Sass (`ember-attacher/styles`, also applied via `implicit-styles`).

## Install

```bash
ember install ember-attacher@^4.1.0
```

If you only added these for ember-attacher, you can drop them from the app:

- `ember-maybe-in-element` — 4.x uses Ember’s `{{#in-element}}`
- `@ember/render-modifiers` — only keep this if *your* app uses `{{did-insert}}` / `{{did-update}}`

## Styles

Do not `@import` addon `.scss` / mixins. There is no published Sass API.

Default tooltip classes (`ember-attacher-tooltip`, `.ember-attacher-light-theme`) still apply. Popovers still have **no** packaged look — style `@class` as before. Matching the arrow to the body is still a class on the floating element (same as 3.x).

Apps that opted out of implicit CSS can:

```js
import 'ember-attacher/styles';
```

## Testing

```js
import { isVisible } from 'ember-attacher';
// also: import { isVisible } from 'ember-attacher/test-support';
```

## Compatibility

- Ember.js: same claimed floor as 3.3.x (3.20+). Consuming apps are not limited to Ember 4.
- Node: `16.* || >= 18` (the addon’s `engines`).
- Classic apps need `ember-auto-import` v2 (already required by many addons).

From 1.x, follow [2.0](./upgrade-guide-2.0.md) first (Popper → Floating UI, `explicitTarget`, `ember-attacher-floating`).
