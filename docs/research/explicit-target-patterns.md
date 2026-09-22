# Explicit-target patterns in ember-velcro and ember-primitives

Research for [#1042](https://github.com/tylerturdenpants/ember-attacher/issues/1042). Snapshot date: 2026-09-22. No ember-attacher API change in this branch.

**Sources:** [CrowdStrike/ember-velcro](https://github.com/CrowdStrike/ember-velcro) `ce1d9ff` (npm `ember-velcro@2.2.0`); [universal-ember/ember-primitives](https://github.com/universal-ember/ember-primitives) `8cbb7db` (`ember-primitives@0.62.0`); ember-attacher `origin/master` `601cb0d`; [#109](https://github.com/tylerturdenpants/ember-attacher/issues/109).

## Verdict

ember-velcro and ember-primitives never infer a parent. Callers always designate the target. They do it in three ways that can sit **beside** ember-attacher's implicit-parent contract without a 3.x break, plus one portal API that is a **destination**, not a positioning target.

| Pattern | Upstream exports | 3.x-safe beside implicit parent? |
| --- | --- | --- |
| **A. Arg on the attachment: Element (already shipped)** | ember-attacher `@explicitTarget` | Yes — already the 3.x stop-gap |
| **B. Arg on the attachment: CSS selector or Element** | `{{velcro}}` / `{{anchorTo}}` positional `string \| HTMLElement \| SVGElement` | Yes — additive widening of `@explicitTarget` |
| **C. Yielded hook + loop / reference + floating modifiers** | `<Velcro>` `hook`/`loop`; `<FloatingUI>` `reference`/`floating`; `<Popover>` `reference`/`Content` | Yes — only if nested-in-parent remains the default and this is an extra yield |
| **D. Register/connect function** | `velcro.setHook`; `FloatingUI`/`Popover` `setReference` | Yes — extra yield for contextual components ([#109](https://github.com/tylerturdenpants/ember-attacher/issues/109) @mriska) |
| **E. Portal name / selector / Element** | `<Portal @to>` / `@wormhole`; `<PortalTarget @name>`; `TARGETS` / `PORTALS` | No as a *target* API. This is where content **renders**, analogous to `@floatingElementContainer`, not what it **anchors to** |

Requiring any of C–E as the only way to pick a target, or dropping implicit parent, would break the 3.x component contract.

## ember-attacher today (implicit parent + Element arg)

3.x public usage is nested in the parent. README:

```hbs
<button>
  Click me
  <AttachTooltip>I'm a tooltip!</AttachTooltip>
</button>
```

The parent is discovered with a hidden `<meta>` (`onParentFinderInsert` → `element.parentElement`) and used as the target unless `@explicitTarget` is set:

```354:356:addon/components/attach-popover.js
  _initializeAttacher() {
    this._removeEventListeners();
    this._currentTarget = this.args.explicitTarget || this.parentElement;
```

`@explicitTarget` is watched:

```13:13:addon/templates/components/attach-popover.hbs
      {{did-update this.onTargetOrTriggerChange this.hideOn this.showOn @explicitTarget}}
```

It is a **DOM node**, not a selector. Passing a string still does what [#109](https://github.com/tylerturdenpants/ember-attacher/issues/109) reported for the old `popperTarget`: `_currentTarget.addEventListener` throws. The README still marks it “NOT RECOMMENDED” / “may be removed” and points at #109. Tests pass an `HTMLElement` from `find('#new-target')` (`tests/integration/components/ember-attacher/explicit-target-test.js`).

`@floatingElementContainer` already accepts `Element | string` (string → `document.querySelectorAll`, assert exactly one). That is the **destination** axis, not the target axis. 2.0 renamed `popperTarget` → `explicitTarget` (`docs/upgrade-guide-2.0.md`).

#109 consensus: Element arg is needed (contextual yielded attachments). Selector strings were requested. Destruction of an explicit target was left unresolved. Coordinate with that issue; do not treat explicit targeting as a new 4.x-only need.

## ember-velcro (public: `Velcro`, `velcro`)

Package `ember-velcro` 2.2.0. Public JS:

```ts
export { default as Velcro } from './components/velcro';
export { default as velcro } from './modifiers/velcro';
```

([`ember-velcro/src/index.ts`](https://github.com/CrowdStrike/ember-velcro/blob/ce1d9fff73a6215a952357e7e39d15390624f605/ember-velcro/src/index.ts)). Template registry: `Velcro`, `velcro`. App-js also registers `./components/velcro/index.js` and `./modifiers/velcro.js`.

### `{{velcro}}` — modifier on the floating element

[`ember-velcro/src/modifiers/velcro.ts`](https://github.com/CrowdStrike/ember-velcro/blob/ce1d9fff73a6215a952357e7e39d15390624f605/ember-velcro/src/modifiers/velcro.ts)

| Slot | Name | Type / default |
| --- | --- | --- |
| Element | (the floating node) | `HTMLElement` |
| Positional 0 | `referenceElement` | `string \| HTMLElement \| SVGElement` — **required** |
| Named | `strategy` | `Strategy`, default `'fixed'` |
| Named | `offsetOptions` | `OffsetOptions`, default `0` |
| Named | `placement` | `Placement`, default `'bottom'` |
| Named | `flipOptions` | `FlipOptions` |
| Named | `shiftOptions` | `ShiftOptions` |
| Named | `hideOptions` | in the type only; **not read** in `modify()` (hide is hardcoded `referenceHidden` + `escaped`) |
| Named | `middleware` | `Middleware[]`, default `[]` |
| Named | `setVelcroData` | `Middleware['fn']` |

String positional → `document.querySelector`. Asserts the result is `HTMLElement | SVGElement`. README:

```hbs
<div id="hook">The `reference` element (the hook)</div>
<div {{velcro "#hook"}}>The `floating` element (the loop)</div>
```

Tests use selector strings (`test-app/tests/integration/modifiers/velcro-test.gts`). No implicit parent.

### `<Velcro>` — yielded hook / loop / setHook

[`ember-velcro/src/components/velcro/index.ts`](https://github.com/CrowdStrike/ember-velcro/blob/ce1d9fff73a6215a952357e7e39d15390624f605/ember-velcro/src/components/velcro/index.ts) + [`index.hbs`](https://github.com/CrowdStrike/ember-velcro/blob/ce1d9fff73a6215a952357e7e39d15390624f605/ember-velcro/src/components/velcro/index.hbs)

Named args (forwarded to the loop modifier): `middleware`, `placement`, `strategy`, `flipOptions`, `hideOptions`, `shiftOptions`, `offsetOptions`.

Yield hash:

| Name | Kind | Role |
| --- | --- | --- |
| `hook` | modifier (`Element: HTMLElement \| SVGElement`) | marks the target |
| `setHook` | `(element: HTMLElement \| SVGElement) => void` | same, for composing into another modifier ([PR #186](https://github.com/CrowdStrike/ember-velcro/pull/186)) |
| `loop` | modifier, **only after `hook` is set** (`{{if this.hook (modifier this.velcroLoop this.hook …)}}`) | marks the floating node; first positional is the hook element |
| `data` | Floating UI middleware args | `x`, `y`, `placement`, `rects`, `elements`, … |

```hbs
<Velcro as |velcro|>
  <div {{velcro.hook}}>Velcro hook</div>
  <div {{velcro.loop}}>Velcro loop stuck to Velcro hook!</div>
</Velcro>
```

`<Velcro>` has **no DOM of its own**. Target is whichever element gets `hook` / `setHook`. Tests: `test-app/tests/integration/components/velcro-test.gts` (`hook` and `setHook` paths).

## ember-primitives (fork of velcro, plus Popover / Portal)

Docs: “[this project is a fork [of ember-velcro], and ditches the velcro (hook / loop) verbiage](https://github.com/universal-ember/ember-primitives/blob/8cbb7dbb7a23d14e9163ed99a11380247eb6d28b/docs-app/app/templates/5-floaty-bits/floating-ui.gjs.md)”. There is **no `<Tooltip>` export**. Tooltip in docs is `<Popover>` plus CSS; `TARGETS.tooltip` is a portal *destination*.

Barrel (`ember-primitives/src/index.ts`) exports `Popover`, `Portal`, `PortalTargets`, `TARGETS as PORTALS`. Positioning primitives are **not** on the barrel; they are:

```ts
export { FloatingUI } from './floating-ui/component.gts';
export { anchorTo } from './floating-ui/modifier.ts';
```

Import path: `ember-primitives/floating-ui` ([`ember-primitives/src/floating-ui.ts`](https://github.com/universal-ember/ember-primitives/blob/8cbb7dbb7a23d14e9163ed99a11380247eb6d28b/ember-primitives/src/floating-ui.ts)). `package.json` `exports["./*"]` maps that.

### `{{anchorTo}}` — same shape as `{{velcro}}`

[`ember-primitives/src/floating-ui/modifier.ts`](https://github.com/universal-ember/ember-primitives/blob/8cbb7dbb7a23d14e9163ed99a11380247eb6d28b/ember-primitives/src/floating-ui/modifier.ts)

Positional 0: `referenceElement: string | HTMLElement | SVGElement` (selector or node). Named: `strategy` (`'fixed'`), `offsetOptions` (`0`), `placement` (`'bottom'`), `flipOptions`, `shiftOptions`, `hideOptions` (typed, unused; hide still hardcoded), `middleware` (`[]`), `setData`.

```hbs
<div id="reference">...</div>
<div {{anchorTo "#reference"}}>...</div>
```

Tests: `test-app/tests/floating-ui/modifier-test.gts`.

### `<FloatingUI>` — yielded `reference` / `floating` / `setReference`

[`ember-primitives/src/floating-ui/component.gts`](https://github.com/universal-ember/ember-primitives/blob/8cbb7dbb7a23d14e9163ed99a11380247eb6d28b/ember-primitives/src/floating-ui/component.gts). No own DOM. Named args match `anchorTo` (`middleware`, `placement`, `strategy`, `flipOptions`, `hideOptions`, `shiftOptions`, `offsetOptions`).

Block params:

1. `reference` — modifier on the target (`HTMLElement | SVGElement`)
2. `floating` — `undefined` until a reference exists, then `anchorTo` bound to that element
3. `util` — `{ setReference: (element: HTMLElement | SVGElement) => void, data?: MiddlewareState }`

```hbs
<FloatingUI as |reference floating|>
  <button {{reference}}>...</button>
  <menu {{floating}}>...</menu>
</FloatingUI>
```

`setReference` exists for the same reason as `setHook`: one modifier on the trigger that both registers the target and attaches click/open behavior. Tests: `test-app/tests/floating-ui/component-main-test.gts`.

### `<Popover>` — `reference` + `Content` + `setReference` + `arrow`

Export: `Popover` from `ember-primitives` / `ember-primitives/components/popover`. [`ember-primitives/src/components/popover.gts`](https://github.com/universal-ember/ember-primitives/blob/8cbb7dbb7a23d14e9163ed99a11380247eb6d28b/ember-primitives/src/components/popover.gts)

Named args forwarded to `<FloatingUI>`: `flipOptions`, `middleware`, `offsetOptions`, `placement` (`top|bottom|left|right` ± `-start`/`-end`), `shiftOptions`, `strategy`.

Yield hash:

| Name | Kind |
| --- | --- |
| `reference` | same as FloatingUI’s `reference` modifier |
| `setReference` | `(element: HTMLElement \| SVGElement) => void` |
| `Content` | component: wraps the floating node with `popover="manual"` + `showPopover()`, applies the floating modifier. `@as?: string` (tag name, default `"div"`) |
| `data` | Floating UI state |
| `arrow` | modifier for an arrow element |

`<Popover>` does not infer a parent. The target is `{{p.reference}}` (or `setReference`). Docs use that for both popovers and tooltip-like UI (`docs-app/app/templates/5-floaty-bits/popover.gjs.md`). Layering uses the Popover API, not a portal.

`<Menu>` (`ember-primitives/src/components/menu.gts`) is a consumer of this pattern: its trigger modifier calls `setReference(element)` so the trigger is also the Floating UI reference.

### Portal / PortalTargets — destination, not target

Exports: `Portal` (`ember-primitives/components/portal` or barrel), `wormhole()` helper; `PortalTargets`, `PortalTarget`, `TARGETS` (barrel also `PORTALS`).

[`Portal`](https://github.com/universal-ember/ember-primitives/blob/8cbb7dbb7a23d14e9163ed99a11380247eb6d28b/ember-primitives/src/components/portal.gts) args:

| Arg | Type | Meaning |
| --- | --- | --- |
| `@to` | portal name (`popover` / `tooltip` / `modal`), CSS selector, or `Element` | **where** to teleport |
| `@append` | `boolean`, default false | append vs replace |
| `@wormhole` | `string \| Element` | ember-wormhole-style id/selector/element |

[`PortalTargets`](https://github.com/universal-ember/ember-primitives/blob/8cbb7dbb7a23d14e9163ed99a11380247eb6d28b/ember-primitives/src/components/portal-targets.gts) renders three `data-portal-name` nodes:

```ts
export const TARGETS = Object.freeze({
  popover: "ember-primitives__portal-targets__popover",
  tooltip: "ember-primitives__portal-targets__tooltip",
  modal: "ember-primitives__portal-targets__modal",
});
```

`<PortalTarget @name={{string}}>` registers an extra destination. `findNearestTarget` walks ancestors. This matches ember-attacher `@floatingElementContainer` / `@renderInPlace`, not `_currentTarget`.

## What would break 3.x

- Defaulting to “no target until a hook/reference is set” (velcro/FloatingUI/Popover) instead of parent.
- Making a wrapping `<Velcro>`/`<FloatingUI>`/`<Popover>` required so the nested-in-parent template stops working.
- Replacing `<AttachPopover>` / `<AttachTooltip>` with a floating-element-only modifier as the sole public API.
- Treating `@to` / `PORTALS.tooltip` as the positioning target.
- Removing `@explicitTarget` (already in 3.x tests and the 2.0 rename).

## 3.x-compatible adoption sketch (decision input, not an implement-now recommendation)

Keep implicit parent as the default: `_currentTarget = explicitTarget || parentElement`. Nested `<AttachTooltip>` in a button stays valid.

Anything below is optional additive surface. None of it is required to close the research question.

1. **Keep `@explicitTarget` as `Element`.** It already sits beside implicit parent. Promoting it out of “may be removed” is a docs/contract clarification, not a new API. Addresses #109’s Element path and the contextual-component yield (`(component 'attach-tooltip' explicitTarget=element)`).

2. **Widen `@explicitTarget` to `string | Element` (pattern B).** Resolve strings the way `{{velcro}}` / `{{anchorTo}}` do (`querySelector`), or the way `@floatingElementContainer` already does (`querySelectorAll` + assert one match). Fallback to parent when the arg is `null`/`undefined`. That is the selector request in #109. Do not treat a missing match as “use parent” if a string was passed — that would silently attach to the wrong node; fail like velcro’s `assert('no reference element defined', …)`.

3. **Optional yielded `hook` / `setTarget` (patterns C/D)** on the existing components, used only when the caller wants a target that is not the parent. If neither the yield nor `@explicitTarget` is used, parent stays. This covers velcro’s `setHook` / primitives’ `setReference` (one modifier that both registers the target and binds click) without a wrapping pair.

4. **Optional extra export** of an `{{anchorTo}}`-style modifier on the floating node is a new public name, so it cannot break 3.x by existing. It cannot *replace* the nested component.

5. **Do not reuse Portal `@to` / `TARGETS.*` for targeting.** If 4.1.0 grows destination options, keep them on `@floatingElementContainer`.

6. **Destruction** (#109 @kybishop): velcro/FloatingUI drop the pair when the hook/reference element unmounts (modifier destructor / `hook` becoming unset so `loop` is not yielded). An Element-valued `@explicitTarget` still needs the caller to clear it; that is today’s 3.x behavior and can stay.

Decision fork for 4.1.0: **B only** (selector widening) vs **B + D** (selector + `setTarget` yield) vs **status quo A** (Element arg, implicit parent). C as a required wrapping component is the one fork that is not 3.x-compatible.
