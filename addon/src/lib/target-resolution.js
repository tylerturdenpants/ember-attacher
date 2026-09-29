/**
 * Target resolution seam for BasicAttacher (#1052).
 *
 * Keeps listener + Floating UI reference selection in one private module so
 * explicit-target work (#1049) can extend selector and virtual-reference
 * support without touching show/hide or positioning.
 */

/**
 * @param {object} options
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} options.explicitTarget
 * @param {Element | null | undefined} options.parentElement Implicit parent from the meta finder.
 * @returns {Element | { getBoundingClientRect: Function } | null}
 */
export function resolveAttachmentTarget({ explicitTarget, parentElement }) {
  if (explicitTarget != null) {
    return explicitTarget;
  }

  return parentElement ?? null;
}

/**
 * Floating UI virtual references are plain objects with `getBoundingClientRect`.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isVirtualReference(value) {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  if (typeof Element !== 'undefined' && value instanceof Element) {
    return false;
  }

  return typeof value.getBoundingClientRect === 'function';
}
