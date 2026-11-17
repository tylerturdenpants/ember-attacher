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

const CORRIDOR_BUFFER = 2;

function isPointInRect(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function pointInQuad(px, py, x1, y1, x2, y2, x3, y3, x4, y4) {
  return (
    pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) ||
    pointInTriangle(px, py, x1, y1, x3, y3, x4, y4)
  );
}

/**
 * Determine whether the cursor lies inside either rect or the diagonal safe-polygon
 * corridor between the mouseleave exit point on the Target (or the Target's facing edge
 * when synthetic events omit pointer coordinates) and the facing edge of the Attachment.
 *
 * Unlike an 8-corner bounding convex hull, this corridor only spans the gap between
 * the Target's facing edge and the Attachment's facing edge, so exiting laterally
 * into adjacent UI beside the Target never keeps the Attachment stuck open.
 *
 * Supports both DOM Elements and Floating UI VirtualElements via `getBoundingClientRect()`.
 *
 * @param {MouseEvent | { clientX: number, clientY: number }} event
 * @param {{ x: number, y: number } | null | undefined} origin
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} target
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} floatingElement
 * @returns {boolean}
 */
export function isCursorInSafePolygon(event, origin, target, floatingElement) {
  if (
    !event ||
    !target ||
    !floatingElement ||
    typeof target.getBoundingClientRect !== 'function' ||
    typeof floatingElement.getBoundingClientRect !== 'function'
  ) {
    return false;
  }

  const targetRect = target.getBoundingClientRect();
  const floatingRect = floatingElement.getBoundingClientRect();

  if (floatingRect.width === 0 && floatingRect.height === 0) {
    return false;
  }

  const px = event.clientX;
  const py = event.clientY;

  if (isPointInRect(px, py, targetRect) || isPointInRect(px, py, floatingRect)) {
    return true;
  }

  const hasRealOrigin =
    Boolean(origin) &&
    (origin.x !== 0 ||
      origin.y !== 0 ||
      isPointInRect(0, 0, targetRect));

  // Attachment is above target: gap is between floatingRect.bottom and targetRect.top
  if (floatingRect.bottom <= targetRect.top + CORRIDOR_BUFFER) {
    const bx = floatingRect.left - CORRIDOR_BUFFER;
    const by = floatingRect.bottom;
    const cx = floatingRect.right + CORRIDOR_BUFFER;
    const cy = floatingRect.bottom;
    if (hasRealOrigin) {
      return pointInTriangle(px, py, origin.x, origin.y + CORRIDOR_BUFFER, bx, by, cx, cy);
    }
    return pointInQuad(
      px,
      py,
      targetRect.left,
      targetRect.top + CORRIDOR_BUFFER,
      targetRect.right,
      targetRect.top + CORRIDOR_BUFFER,
      cx,
      cy,
      bx,
      by
    );
  }

  // Attachment is below target: gap is between targetRect.bottom and floatingRect.top
  if (floatingRect.top >= targetRect.bottom - CORRIDOR_BUFFER) {
    const bx = floatingRect.left - CORRIDOR_BUFFER;
    const by = floatingRect.top;
    const cx = floatingRect.right + CORRIDOR_BUFFER;
    const cy = floatingRect.top;
    if (hasRealOrigin) {
      return pointInTriangle(px, py, origin.x, origin.y - CORRIDOR_BUFFER, bx, by, cx, cy);
    }
    return pointInQuad(
      px,
      py,
      targetRect.left,
      targetRect.bottom - CORRIDOR_BUFFER,
      targetRect.right,
      targetRect.bottom - CORRIDOR_BUFFER,
      cx,
      cy,
      bx,
      by
    );
  }

  // Attachment is to the left of target: gap is between floatingRect.right and targetRect.left
  if (floatingRect.right <= targetRect.left + CORRIDOR_BUFFER) {
    const bx = floatingRect.right;
    const by = floatingRect.top - CORRIDOR_BUFFER;
    const cx = floatingRect.right;
    const cy = floatingRect.bottom + CORRIDOR_BUFFER;
    if (hasRealOrigin) {
      return pointInTriangle(px, py, origin.x + CORRIDOR_BUFFER, origin.y, bx, by, cx, cy);
    }
    return pointInQuad(
      px,
      py,
      targetRect.left + CORRIDOR_BUFFER,
      targetRect.top,
      targetRect.left + CORRIDOR_BUFFER,
      targetRect.bottom,
      cx,
      cy,
      bx,
      by
    );
  }

  // Attachment is to the right of target: gap is between targetRect.right and floatingRect.left
  if (floatingRect.left >= targetRect.right - CORRIDOR_BUFFER) {
    const bx = floatingRect.left;
    const by = floatingRect.top - CORRIDOR_BUFFER;
    const cx = floatingRect.left;
    const cy = floatingRect.bottom + CORRIDOR_BUFFER;
    if (hasRealOrigin) {
      return pointInTriangle(px, py, origin.x - CORRIDOR_BUFFER, origin.y, bx, by, cx, cy);
    }
    return pointInQuad(
      px,
      py,
      targetRect.right - CORRIDOR_BUFFER,
      targetRect.top,
      targetRect.right - CORRIDOR_BUFFER,
      targetRect.bottom,
      cx,
      cy,
      bx,
      by
    );
  }

  return false;
}
