/**
 * Target resolution seam for BasicAttacher.
 *
 * Keeps listener target and Floating UI reference selection in one private
 * module so explicit targets (elements, virtual references, and selectors)
 * can be resolved cleanly without cluttering positioning or lifecycle logic.
 */

/**
 * Determine whether a target is a DOM Element.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isElementTarget(value) {
  return typeof Element !== 'undefined' && value instanceof Element;
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

  if (isElementTarget(value)) {
    return false;
  }

  return typeof value.getBoundingClientRect === 'function';
}

/**
 * Extract the DOM Element that should receive event listeners.
 * Real Elements receive events directly. Virtual references may provide a
 * `contextElement`; virtual references without a contextElement attach no listeners.
 *
 * @param {Element | { getBoundingClientRect: Function, contextElement?: Element } | null | undefined} target
 * @returns {Element | null}
 */
export function getListenerTarget(target) {
  if (isElementTarget(target)) {
    return target;
  }

  if (isVirtualReference(target) && isElementTarget(target.contextElement)) {
    return target.contextElement;
  }

  return null;
}

/**
 * Resolve the attachment target from an explicit target or implicit parent element.
 *
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} explicitTarget
 * @param {Element | null | undefined} parentElement
 * @returns {Element | { getBoundingClientRect: Function } | null}
 */
export function resolveAttachmentTarget(explicitTarget, parentElement) {
  if (explicitTarget != null) {
    return explicitTarget;
  }

  return parentElement ?? null;
}
