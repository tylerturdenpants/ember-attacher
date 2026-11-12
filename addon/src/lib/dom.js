/**
 * DOM and event helpers for attachment boundary and cursor detection.
 */

/**
 * Determine whether an event originated from or traversed through a given DOM element.
 *
 * Uses `event.composedPath()` to safely detect clicks on elements that were subsequently
 * removed from the DOM during event handling (e.g. self-disappearing buttons).
 * Falls back to `element.contains(event.target)` when `composedPath` is unavailable.
 *
 * @param {Element | null | undefined} element
 * @param {Event | null | undefined} event
 * @returns {boolean}
 */
export function elementContainsEvent(element, event) {
  if (!element) {
    return false;
  }

  const path = typeof event?.composedPath === 'function' ? event.composedPath() : null;
  if (path && path.length > 0) {
    return path.includes(element);
  }

  return Boolean(event?.target && element.contains(event.target));
}

/**
 * Check if cursor coordinates lie in the geometric gap between the target and floating element.
 *
 * Used for interactive attachments with `isOffset=true` to prevent premature hide
 * while the cursor transitions across the gap between target and attachment.
 *
 * @param {MouseEvent} event
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} target
 * @param {Element | null | undefined} floatingElement
 * @returns {boolean}
 */
export function isCursorBetween(event, target, floatingElement) {
  if (!target || !floatingElement) {
    return false;
  }

  const { clientX, clientY } = event;

  const attachmentPosition = floatingElement.getBoundingClientRect();
  const targetPosition = target.getBoundingClientRect();

  const isBetweenLeftAndRight =
    clientX > Math.min(attachmentPosition.left, targetPosition.left) &&
    clientX < Math.max(attachmentPosition.right, targetPosition.right);

  const isBetweenTopAndBottom =
    clientY > Math.min(attachmentPosition.top, targetPosition.top) &&
    clientY < Math.max(attachmentPosition.bottom, targetPosition.bottom);

  // Check if cursor is between a left-flipped attachment
  if (
    attachmentPosition.right < targetPosition.left &&
    clientX >= attachmentPosition.right &&
    clientX <= targetPosition.left &&
    isBetweenTopAndBottom
  ) {
    return true;
  }

  // Check if cursor is between a right-flipped attachment
  if (
    attachmentPosition.left > targetPosition.right &&
    clientX <= attachmentPosition.left &&
    clientX >= targetPosition.right &&
    isBetweenTopAndBottom
  ) {
    return true;
  }

  // Check if cursor is between a bottom-flipped attachment
  if (
    attachmentPosition.top > targetPosition.bottom &&
    clientY <= attachmentPosition.top &&
    clientY >= targetPosition.bottom &&
    isBetweenLeftAndRight
  ) {
    return true;
  }

  // Check if cursor is between a top-flipped attachment
  if (
    attachmentPosition.bottom < targetPosition.top &&
    clientY >= attachmentPosition.bottom &&
    clientY <= targetPosition.top &&
    isBetweenLeftAndRight
  ) {
    return true;
  }

  return false;
}
