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
 * @param {number} x
 * @param {number} y
 * @param {DOMRect | { left: number, top: number, right: number, bottom: number }} rect
 * @returns {boolean}
 */
function isPointInRect(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Ray-casting point-in-polygon test.
 *
 * @param {[number, number]} point
 * @param {Array<[number, number]>} polygon
 * @returns {boolean}
 */
function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let isInside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      isInside = !isInside;
    }
  }

  return isInside;
}

/**
 * Monotone-chain convex hull of 2D points (lower then upper hull).
 *
 * @param {Array<[number, number]>} points
 * @returns {Array<[number, number]>}
 */
function convexHull(points) {
  const sorted = points
    .slice()
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  if (sorted.length <= 1) {
    return sorted;
  }

  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower = [];
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * True when the cursor lies inside either rect or the convex-hull corridor
 * between them (covers diagonal pointer paths between Target and Attachment).
 *
 * Used automatically for interactive attachments whose `hideOn` includes
 * `mouseleave`. Supports DOM Targets and VirtualElements with
 * `getBoundingClientRect()`.
 *
 * @param {MouseEvent | { clientX: number, clientY: number }} event
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} target
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} floatingElement
 * @returns {boolean}
 */
export function isCursorInSafePolygon(event, target, floatingElement) {
  if (!target || !floatingElement) {
    return false;
  }

  if (
    typeof target.getBoundingClientRect !== 'function' ||
    typeof floatingElement.getBoundingClientRect !== 'function'
  ) {
    return false;
  }

  const { clientX, clientY } = event;
  const targetRect = target.getBoundingClientRect();
  const floatingRect = floatingElement.getBoundingClientRect();

  if (
    isPointInRect(clientX, clientY, targetRect) ||
    isPointInRect(clientX, clientY, floatingRect)
  ) {
    return true;
  }

  const hull = convexHull([
    [targetRect.left, targetRect.top],
    [targetRect.right, targetRect.top],
    [targetRect.right, targetRect.bottom],
    [targetRect.left, targetRect.bottom],
    [floatingRect.left, floatingRect.top],
    [floatingRect.right, floatingRect.top],
    [floatingRect.right, floatingRect.bottom],
    [floatingRect.left, floatingRect.bottom],
  ]);

  if (hull.length < 3) {
    return false;
  }

  return isPointInPolygon([clientX, clientY], hull);
}
