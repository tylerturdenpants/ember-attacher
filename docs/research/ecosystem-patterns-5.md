# Ecosystem patterns for headless attachers, ARIA defaults, hover corridors, and shared tooltips

Research for [#1099](https://github.com/tylerturdenpants/ember-attacher/issues/1099). Builds on [#1042](https://github.com/tylerturdenpants/ember-attacher/issues/1042) (`docs/research/explicit-target-patterns.md`). Snapshot date: 2026-11-12.

**Primary sources inspected:**
- [CrowdStrike/ember-velcro](https://github.com/CrowdStrike/ember-velcro) (`ember-velcro@2.2.0`, `README.md`, `src/components/velcro/`, `src/modifiers/velcro.ts`)
- [universal-ember/ember-primitives](https://github.com/universal-ember/ember-primitives) (`popover.gts`, `dialog.gts`, `floating-ui/component.gts`)
- [ember-power-addons/ember-basic-dropdown](https://github.com/ember-power-addons/ember-basic-dropdown) (`README.md`)
- [floating-ui/floating-ui](https://github.com/floating-ui/floating-ui) (`packages/react/src/safePolygon.ts`, `hooks/useRole.ts`, `hooks/useDismiss.ts`, `components/FloatingDelayGroup.tsx`, `components/FloatingTree.tsx`)
- [chakra-ui/zag](https://github.com/chakra-ui/zag) (`packages/machines/tooltip/src/{tooltip.connect.ts,tooltip.store.ts}`, `packages/machines/popover/src/popover.connect.ts`)
- [radix-ui/primitives](https://github.com/radix-ui/primitives) (`packages/react/tooltip/src/tooltip.tsx`)
- [atomiks/tippyjs](https://github.com/atomiks/tippyjs) (`src/addons/createSingleton.ts`)
- `ember-attacher` `origin/master` (`addon/src/components/{basic-attacher.js,basic-attacher.hbs,attach-tooltip.js,attach-popover.js}`, `addon/src/lib/dom.js`)

---

## 1. Two-layer architecture (headless core + styled components)

| Library | Low-level primitive | Higher-level / component layer | Key Ember insight |
| --- | --- | --- | --- |
| **ember-velcro** (2.2.0) | `{{velcro target ...}}` modifier + `<Velcro>` (yields `hook`, `setHook`, `loop`, `data`) | None (unopinionated positioning only) | Zero wrapper DOM; `setHook` exists because Ember cannot easily compose two modifiers onto one element ([PR #186](https://github.com/CrowdStrike/ember-velcro/pull/186)). |
| **ember-primitives** | `<FloatingUI>` + `{{anchorTo}}` | `<Popover>` yields `{ reference, setReference, Content, arrow, data }`; `<Dialog>` yields `{ isOpen, open, close, Trigger, Content }` | `<Popover.Content @as="dialog">` promotes to browser top layer via `popover="manual"` + `showPopover()`, sets `overflow: visible` so arrows aren't clipped, and opts out of `popover` when nested inside an existing `[popover]`. |
| **ember-basic-dropdown** | `<BasicDropdown>` (Ember >= 4.12, `.gts`/Glint) | `<dd.Trigger>` + `<dd.Content>` + `{ uniqueId, isOpen, actions: { open, close, toggle, reposition, registerTriggerElement, registerDropdownElement } }` | Separates positioning/portal (`renderInPlace` vs `{{#in-element}}`) from trigger/content wiring; yields deterministic `uniqueId` for ARIA linking. |
| **ember-attacher** (today) | None | `<BasicAttacher>` owns target resolution (`<meta hidden>` parent-finder + `@explicitTarget` + yielded `reference`/`setReference`), triggers, Floating UI positioning, `{{#in-element}}`, and styling hooks | All concerns live in `BasicAttacher` (1000 lines). Splitting **positioning + host** (headless `<Attacher>` / `{{attach}}` modifier) from **tooltip/popover triggers + ARIA + default chrome** (`<AttachTooltip>` / `<AttachPopover>`) lets custom dropdowns/menus reuse positioning/top-layer without tooltip chrome. |

---

## 2. Default ARIA wiring and focus restoration

Today `ember-attacher`:
- Sets `role={{@ariaRole}}` (`tooltip` in `AttachTooltip`, `dialog` in `AttachPopover`) and toggles `aria-hidden` (`'false'` / `'true'`) on the attachment (`basic-attacher.js`).
- Sets `aria-describedby` on the target *only* in `AttachTooltip` (`attach-tooltip.js`), and removes it on destroy—leaving `aria-describedby` pointing at a hidden/unrendered element when closed with `lazyRender`.
- Does **not** set `aria-expanded`, `aria-controls`, or `aria-haspopup` on popover targets, nor restore focus to the target on Escape/close.

What Floating UI `useRole`, Zag.js (`tooltip.connect.ts` / `popover.connect.ts`), and `ember-primitives` `<Dialog>` converge on:

| Attachment Role | Target (Trigger) ARIA | Attachment ARIA | Focus Management |
| --- | --- | --- | --- |
| **Tooltip** (`role="tooltip"`) | `aria-describedby="<attachment-id>"` **only while open** (avoids dangling references with `lazyRender` and top-layer; Floating UI `useRole` and Zag `tooltip.connect.ts` both set `aria-describedby: open ? id : undefined`). | `id="<attachment-id>"`, `role="tooltip"`. No `aria-expanded` or `aria-haspopup`. | Non-focusable; Target retains focus; Escape dismisses without moving focus. |
| **Popover / Non-modal Dialog** (`role="dialog"`) | `aria-expanded="true"\|"false"`, `aria-controls="<attachment-id>"`, `aria-haspopup="dialog"` (when Trigger is rendered/modified). | `id="<attachment-id>"`, `role="dialog"` (or native `<dialog>`). | When dismissed via Escape (or close button) while focus is inside the attachment, restore focus to the Target element (like `<Dialog>`'s trigger modifier in `ember-primitives` and Zag popover). |

---

## 3. Hover safe-polygon vs `isCursorBetween`

`ember-attacher` currently prevents premature close for interactive hover attachments only when `@isOffset={{true}}` via `isCursorBetween()` (`addon/src/lib/dom.js:40-99`), which tests whether `(clientX, clientY)` falls inside the **axis-aligned bounding rectangle** between target and attachment edges.

Limitations of `isCursorBetween()` vs Floating UI's `safePolygon()` (`packages/react/src/safePolygon.ts`):
1. **Axis-aligned box misses diagonal motion** when the attachment is wider/narrower than the target or shifted (`shift()`/`-start`/`-end`), and requires the user to opt into `@isOffset={{true}}` even when `--ember-attacher-distance` or CSS `margin` creates a gap.
2. **Floating UI `safePolygon`**:
   - Builds a **triangular / 4-point corridor polygon** from the pointer exit coordinates `[x, y]` (plus a small `buffer`) to the two corners of the attachment edge facing the target, unioned with the rectangular trough between target and attachment.
   - Tracks `isOverReferenceRect` / `hasLanded` and pointer intent so leaving the target away from the attachment (opposite side) closes immediately, while diagonal traversal toward any corner of the attachment stays open.
   - Aborts closing if a nested child attachment in the tree is currently open (`getNodeChildren`).

For `ember-attacher` 5.0 (or additive 4.x), replacing `isCursorBetween` with a ~60-line dependency-free `isCursorInSafePolygon()` helper (and enabling it automatically whenever `interactive={{true}}`, without needing `@isOffset`) fixes diagonal mouse movement across any placement or CSS gap.

---

## 4. Delay groups and shared / singleton tooltips (#64)

Three established patterns:

1. **Delay Group (`FloatingDelayGroup`, Radix `TooltipProvider` `skipDelayDuration`, Zag `tooltip.store`)**:
   - Each target keeps its own lightweight tooltip state/DOM, but coordinates through a tiny module-level/service store (`{ activeId, isInstantPhase, skipDelayTimer }`).
   - Opening the first tooltip waits for `showDelay` (e.g., 500–700ms). Once open, closing it starts a `skipDelayDuration` window (e.g., 300ms); hovering another tooltip in the group during that window opens **immediately** (`0ms` delay).
   - Zero DOM sharing complexity; solves the main UX reason users ask for singletons.

2. **Shared / Singleton DOM Instance (Tippy `createSingleton` / Zag `triggerValue`)**:
   - Tippy's `createSingleton(instances)` creates one floating element and swaps its target reference + content on trigger hover/focus, disabling `applyStyles` cleanup so CSS transitions animate smoothly between positions (`moveTransition`).
   - Zag's `tooltip` / `popover` supports multiple triggers via `getTriggerProps({ value })`, switching `triggerValue` without closing/reopening.
   - In `ember-attacher`, userland singletons became possible in 4.2 via `@explicitTarget` + `setReference` (#1087), *except* listeners still attach to only **one** `_listenerTarget` at a time and rapid target-swapping can race hide/re-init unless **trigger registration** (N targets) is separated from **attachment host** (1 floating node).

Recommendation for #64: support **both** a lightweight `delayGroup` (group name / service) for separate `<AttachTooltip>` instances AND a multi-target / `registerTrigger` pattern on the headless primitive that retargets a single attachment without tearing down listeners.

---

## 5. Nested attachments and `hideOn="clickout"` (#90)

Why [#90](https://github.com/tylerturdenpants/ember-attacher/issues/90) happens today:
- `ember-attacher` portals attachments to `.ember-application` via `{{#in-element}}`, severing DOM containment (`parentFloatingEl.contains(childFloatingEl)` is `false`).
- `_hideOnClickOut(event)` checks only `elementContainsEvent(target, event)` and `elementContainsEvent(this._floatingElement, event)` (`basic-attacher.js:799-810`). Clicking inside a nested attachment is therefore treated as an outside click on the parent attachment, closing the parent immediately.

How the ecosystem solves it:
1. **Logical tree registry (`FloatingTree` / `useDismiss` in Floating UI)**:
   - Each attachment registers `{ id, parentId }` in a tree; outside-press checks containment across the node **and all open descendant nodes**, skipping dismissal if a child handles the click.
2. **Native Top-Layer `popover="auto"` nesting (WHATWG Popover API)**:
   - When an attachment opens via `showPopover({ source: target })` or from inside an ancestor `[popover]`, the browser maintains the **popover ancestor stack** based on the **source/target relationship**, not DOM containment.
   - Clicking inside a nested `popover="auto"` does **not** light-dismiss ancestor popovers; clicking outside dismisses top-down from the innermost popover; Escape dismisses only the topmost popover.
   - Caveat (`ember-primitives` `popover.gts:80-95`): if using `popover="manual"` and the child DOM *is* nested inside a parent `[popover]` DOM node, promoting the child to the top layer separately can cause stacking glitches unless `showPopover({ source })` or opt-out ordering is used.
3. **4.x / non-native fallback**:
   - Even with `{{#in-element}}`, recording a parent-child link when an attachment's `Target` sits inside an ancestor `.ember-attacher` lets `_hideOnClickOut` walk descendant attachments without requiring React-style context providers.
