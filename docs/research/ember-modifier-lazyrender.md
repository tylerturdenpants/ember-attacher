# ember-modifier replacement that does not revive lazyRender sticky

**Ticket:** [#1044](https://github.com/tylerturdenpants/ember-attacher/issues/1044)
**Decision:** replace `@ember/render-modifiers` with **first-run-guarded `modify()`** (class-based `ember-modifier` v4), not a 1:1 swap of `did-update` for a function modifier.
**Do not revive:** [#957](https://github.com/tylerturdenpants/ember-attacher/issues/957) (first `lazyRender` show stuck until a second hover).

## Answer

[#932](https://github.com/tylerturdenpants/ember-attacher/pull/932) mapped `{{did-update this.onTargetOrTriggerChange …}}` onto a function modifier. Function modifiers (and class `modify()`) **always run on install**. `{{did-update}}` **does not**.

On the first `lazyRender` show, that extra install call re-ran `_initializeAttacher` after `_showAfterDelay` had already attached hide listeners, and while `_isHidden` was still `true`. `_initializeAttacher` therefore stripped the hide listeners and did not put them back. Mouseleave did nothing. The second hover did not swap DOM, so the modifier did not re-install, hide listeners survived, and hide worked.

[#958](https://github.com/tylerturdenpants/ember-attacher/pull/958) restored `did-insert` / `did-update` / `will-destroy`, so the floating element's first paint no longer re-initialized the attacher. That is why 3.1.1 fixed [#957](https://github.com/tylerturdenpants/ember-attacher/issues/957).

The v2-safe replacement is **first-run-guarded `modify()`**: skip the first `modify()` for every former `did-update` site; use a `didSetup` flag for former `did-insert` sites; register element teardown with `registerDestructor` in the constructor, not a function-modifier return destructor (that runs again before every update).

## Lifecycle that `lazyRender` depends on

`renderFloatingElement` keeps the floating node out of the DOM until the first show:

```124:126:addon/components/attach-popover.js
  get renderFloatingElement() {
    return (this.renderInPlace || this._currentTarget) && (!this.lazyRender || this._mustRender);
  }
```

Until then the template mounts only a parent-finder `<meta>`:

```1:3:addon/templates/components/attach-popover.hbs
{{~#unless this.renderFloatingElement}}
  <meta hidden {{did-insert this.onParentFinderInsert}} {{did-update this.onIsShownChange this.isShown}}/>
{{~/unless~}}
```

Default triggers are `showOn: 'mouseenter focus'` and `hideOn: 'mouseleave blur escapekey'` (`addon/defaults.js`). Sequence on a healthy first hover:

1. `did-insert onParentFinderInsert` sets `parentElement` and calls `_initializeAttacher`.
2. `_initializeAttacher` removes listeners, sets `_currentTarget`, adds **show** listeners. Hide listeners are added only if `!this._isHidden || this.isShown`. On first hover `_isHidden` is still `true` and `@isShown` is the default `false`, so hide listeners are **not** added here.

```354:365:addon/components/attach-popover.js
  _initializeAttacher() {
    this._removeEventListeners();
    this._currentTarget = this.args.explicitTarget || this.parentElement;
    this._addListenersForShowEvents();

    if (!this._isHidden || this.isShown) {
      this._addListenersForHideEvents();

      // Even if the attachment is already shown, we still want to
      // call this._show() to make sure its position is updated for a potentially new target.
      this._show();
    }
  }
```

3. Mouseenter → `_showAfterDelay` sets `_mustRender = true`, **adds hide listeners**, then debounces `_show`.
4. The `<meta>` unmounts; the floating element mounts. `did-insert didInsertFloatingElement` stores `_floatingElement`. The `did-update` modifiers on that node **do not run**.
5. `_startShowAnimation` polls until `_floatingElement` exists, then positions and sets `_isHidden = false` on a later rAF. Hide listeners from step 3 are still on the target, so mouseleave hides.

`_isHidden = false` is assigned only after that second rAF (`_startShowAnimation`), so any `_initializeAttacher` that runs between steps 3 and 5 sees `_isHidden === true` and `isShown === false`, strips hide listeners, and does not restore them.

## What #932 changed

Commit `24ab755` (`Drop @ember/render-modifiers (#932)`, merged 2024-03-07, released as 3.1.0) replaced `@ember/render-modifiers` with `ember-modifier@^4.1.0` and turned component actions into instance-field function modifiers.

| Before (`did-insert` / `did-update` / `will-destroy`) | After (#932 function modifiers) | Runs on first insert of the floating element? |
| --- | --- | --- |
| `{{did-insert this.didInsertFloatingElement}}` | `{{this.initializeAttacher}}` | Yes, both (intended) |
| `{{did-update this.onIsShownChange this.isShown}}` | `{{this.onIsShownChange this.isShown}}` | **did-update: no. Function modifier: yes.** |
| `{{did-update this.onTargetOrTriggerChange this.hideOn this.showOn @explicitTarget}}` | `{{this.onTargetOrTriggerChange this.hideOn this.showOn @explicitTarget}}` | **did-update: no. Function modifier: yes.** |
| `{{did-update this.onOptionsChange … this._currentTarget …}}` | `{{this.onOptionsChange … this._currentTarget …}}` | **did-update: no. Function modifier: yes.** |
| `{{will-destroy this.willDestroyFloatingElement}}` | destructor returned from `initializeAttacher` | On element destroy; function-modifier destructor also runs **before every re-run** |

The replacement that broke hide:

```js
onTargetOrTriggerChange = modifier((_, _positional) => {
  once(this, '_initializeAttacher', ..._positional);
});
```

`once()` only coalesces duplicate schedules in the same run loop. It does not skip the first install. After `_showAfterDelay` has already attached hide listeners, that `once` still fires `_initializeAttacher` at the end of the loop.

`onIsShownChange` on install is usually a no-op (`isShown === false` and `_isHidden === true`). It is not the sticky path. `onOptionsChange` calling `_update` on install is a secondary race (positioning / `_cleanup` before `_floatingElement` is settled) but is not required to explain mouseleave-dead.

`initializeAttacher` returning `() => this._cleanup?.()` is the wrong teardown shape for a function modifier: the [ember-modifier README](https://github.com/ember-modifier/ember-modifier/blob/master/README.md) states the returned destructor runs **just before the next update and when the element is removed**. Class modifiers should `registerDestructor(this, cleanup)` in the constructor so teardown is destroy-only.

## Why the first show stuck (and the second did not)

1. `_showAfterDelay` adds `mouseleave` → `_hideOnMouseLeaveTarget`.
2. `_mustRender` swaps `<meta>` for the floating node.
3. #932's function modifiers **install** on that new node. `onTargetOrTriggerChange` schedules `_initializeAttacher`.
4. `_initializeAttacher` → `_removeEventListeners()` removes the hide listeners from step 1. The `!this._isHidden \|\| this.isShown` gate is false, so they are not re-added.
5. Mouseleave has no listener. The tooltip stays up. That is [#957](https://github.com/tylerturdenpants/ember-attacher/issues/957).
6. Second hover: `_mustRender` is already true, so the floating node is not recreated, the function modifiers do not re-install, `_showAfterDelay` adds hide listeners again, and they stick. Matches the reporter: *“If I mouse over it again, it hides properly, but that first render is quite sticky.”*

Without `lazyRender`, the floating node is already in the DOM from the first paint. Function-modifier install happens **before** any hover, while there are no hide listeners to strip. Later `_showAfterDelay` adds them and nothing re-installs. That is why the dummy site (lazyRender off until toggled after load) often did not reproduce, and why hide tests that start from `@isShown=true` did not catch it.

## Why the revert fixed it

[#958](https://github.com/tylerturdenpants/ember-attacher/pull/958) (`b2d5a68`, merged 2024-04-30 as 3.1.1) is a straight revert of `24ab755` for `attach-popover.{js,hbs}` plus `package.json` / lockfile. It does not add a new hide-listener fix.

Restored `{{did-update this.onTargetOrTriggerChange …}}` does not run when the floating element is first inserted. Hide listeners from `_showAfterDelay` survive. hoylemd confirmed 3.1.1 on [#957](https://github.com/tylerturdenpants/ember-attacher/issues/957).

## Official modifier semantics (do not collapse these three)

`{{did-update}}` (RFC 311, restated in [emberjs/ember-render-modifiers#16](https://github.com/emberjs/ember-render-modifiers/pull/16)):

> This modifier is activated only on updates to its arguments (both positional and named). It does not run during or after initial render, or before element destruction.

`{{did-insert}}` runs only when the element is inserted. `{{will-destroy}}` runs immediately before the element is removed.

Function `modifier()` and class `modify()` ([ember-modifier README](https://github.com/ember-modifier/ember-modifier/blob/master/README.md), [MIGRATIONS.md](https://github.com/ember-modifier/ember-modifier/blob/master/MIGRATIONS.md)):

- The callback / `modify()` **runs the first time the element is inserted**, then again when consumed tracked state changes.
- A function-modifier **return destructor** runs before the next update **and** on element removal.
- Class teardown is `registerDestructor` from `@ember/destroyable`, typically in the constructor so it is destroy-only.
- `didInstall()` → `modify()` gated by a `didSetup` flag (run setup once).
- `didUpdateArguments()` → `modify()` that **saves previous values and skips work that should not run on install**.

v4 of `ember-modifier` is itself a v2 addon (README: Ember.js ≥ 3.24, embroider / ember-auto-import v2). That is the packaging reason to leave `@ember/render-modifiers`. Mapping `did-update` onto an unguarded `modifier()` callback is not a semantics-preserving swap.

## Correct v2 pattern: first-run-guarded `modify()`

Keep three modifier roles. Do not merge them into one function modifier per element.

### 1. Install-only (former `did-insert`) — `didSetup` gate

`didInsertFloatingElement`, `didInsertArrow`, `onParentFinderInsert`. Per MIGRATIONS.md `didInstall()`:

```js
import Modifier from 'ember-modifier';

export default class DidInsertFloatingElementModifier extends Modifier {
  didSetup = false;

  modify(element, _positional, { component }) {
    if (this.didSetup) {
      return;
    }
    this.didSetup = true;
    component._floatingElement = element;
    if (component.renderInPlace) {
      component.parentElement = element.parentElement;
      component._initializeAttacher();
    }
  }
}
```

`onParentFinderInsert` may call `_initializeAttacher()` immediately on that first install (that is the current `did-insert` contract). Do not also call it from an unguarded update modifier on the same first paint.

### 2. Update-only (former `did-update`) — skip first `modify()`

`onTargetOrTriggerChange`, `onIsShownChange`, `onOptionsChange`. This is the load-bearing pattern. First `modify()` is a no-op; later runs are the old `did-update` bodies.

```js
import Modifier from 'ember-modifier';

export default class OnTargetOrTriggerChangeModifier extends Modifier {
  didSetup = false;

  modify(_element, _positional, { component }) {
    if (!this.didSetup) {
      this.didSetup = true;
      return;
    }
    component._initializeAttacher();
  }
}
```

Same shape for `onIsShownChange` and `onOptionsChange`. Consume only the args that should retrigger (pass them as modifier args, as the current `did-update` sites already do). Do not wrap `_initializeAttacher` in `once()` as a substitute for skipping install.

### 3. Destroy-only (former `will-destroy`) — constructor `registerDestructor`

```js
import Modifier from 'ember-modifier';
import { registerDestructor } from '@ember/destroyable';

function cleanup(instance) {
  instance.component?._cleanup?.();
}

export default class WillDestroyFloatingElementModifier extends Modifier {
  component = null;

  constructor(owner, args) {
    super(owner, args);
    registerDestructor(this, cleanup);
  }

  modify(_element, _positional, { component }) {
    this.component = component;
  }
}
```

Do not `return () => this._cleanup?.()` from a function modifier used as `will-destroy`. That destructor would also run on argument updates.

Install-only and destroy-only can live on one class (`didSetup` setup + constructor destructor) if they share an element. Update-only must stay a **separate** modifier instance so its first `modify()` skip does not swallow the insert setup.

A function modifier with a local `let first = true` can emulate (2), but class-based `modify()` is the documented v4 API for “fine-grained control of updates” and for constructor-scoped destructors. Prefer that on a v2 addon.

## Tests the next implementation must add

Current coverage does not exercise the sticky path:

- `tests/integration/components/ember-attacher/lazy-render-test.js` only asserts the yield appears after click. It never mouseleaves.
- `hide-on-mouseleave-test.js` uses `@isShown=true` and default `lazyRender=false`, so the floating node exists before hover and hide listeners are added from `_initializeAttacher`'s `isShown` branch.

Add an integration test: `lazyRender=true`, default `showOn`/`hideOn`, `mouseenter` on the target, assert visible, `mouseleave`, assert hidden — **on that first cycle**, not after a second hover. That test would have failed on #932 and must stay green on any ember-modifier rewrite.

## Implementation notes (not done here)

- Do not change production code in this research. The live template is still `did-insert` / `did-update` / `will-destroy`.
- `ember-modifier` belongs in the v2 addon's `dependencies` when this ships; `@ember/render-modifiers` can then leave.
- Native `modifier()` from `@ember/modifier` (RFC 811) is the same install-then-update callback model. If Ember's copy is used later, keep the first-run guard. It does not make an unguarded function modifier safe.
- Do not pass `@tracked _currentTarget` into an update modifier unless a target **identity** change should re-run options/`_update`. #932 did, which would re-fire `onOptionsChange` on every `_initializeAttacher` assignment (autotracking treats a set as a change even when the value is the same).

## Sources

- [#957](https://github.com/tylerturdenpants/ember-attacher/issues/957) — first `lazyRender` show sticky; 3.1.1 confirmed fixed.
- [#932](https://github.com/tylerturdenpants/ember-attacher/pull/932) / `git show 24ab755` — drop `@ember/render-modifiers`.
- [#958](https://github.com/tylerturdenpants/ember-attacher/pull/958) / `git show b2d5a68` — revert.
- `addon/components/attach-popover.js`, `addon/templates/components/attach-popover.hbs`, `addon/defaults.js` at `origin/master`.
- [ember-modifier README](https://github.com/ember-modifier/ember-modifier/blob/master/README.md) — function modifier runs on insert; returned destructor runs before next update and on remove; class `modify()` + `registerDestructor`.
- [ember-modifier MIGRATIONS.md](https://github.com/ember-modifier/ember-modifier/blob/master/MIGRATIONS.md) — `didInstall` → `didSetup` in `modify()`; `didUpdateArguments` → compare previous values / skip install; `willDestroy` → `registerDestructor`.
- [ember-render-modifiers#16](https://github.com/emberjs/ember-render-modifiers/pull/16) quoting RFC 311 — `did-update` does not run on initial render.
- Ember guides: `{{did-update}}` “does not run on the initial insertion but is triggered by subsequent changes in its arguments.”
