# ember-attacher

An Ember addon for positioning and managing tooltips, popovers, and attached overlays relative to a DOM element or virtual coordinates.

## Language

**Attachment**:
The floating UI element (tooltip, popover, or non-modal dialog) whose position and visibility are managed relative to a target.
_Avoid_: Floating element, popup, overlay

**Target**:
The DOM element or virtual coordinate source (`getBoundingClientRect`) that an attachment is positioned against.
_Avoid_: Reference, anchor, trigger element

**Trigger**:
The user or programmatic interaction (such as `mouseenter`, `focus`, `click`, `interest`, or `popovertarget`) that shows or hides an attachment.
_Avoid_: Event, invoker

**Host**:
The rendering container or browser layer where an attachment lives in the DOM, such as an `{{#in-element}}` portal, the browser top layer (`popover`), or a `<dialog>` element.
_Avoid_: Container, wormhole, portal target

