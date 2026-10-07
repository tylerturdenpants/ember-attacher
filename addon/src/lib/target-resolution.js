/**
 * Target resolution seam for BasicAttacher (#1052 / #1049).
 *
 * Keeps listener + Floating UI reference selection in one private module so
 * explicit-target work can extend selector and virtual-reference support
 * without touching show/hide or positioning.
 */

import { assert } from '@ember/debug';

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

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isElementTarget(value) {
  return typeof Element !== 'undefined' && value instanceof Element;
}

/**
 * Resolve a public `@explicitTarget` value (Element | selector | virtual ref).
 *
 * Selector strings use `querySelectorAll` and must match exactly one node
 * (same contract as `@floatingElementContainer`).
 *
 * @param {Element | string | { getBoundingClientRect: Function } | null | undefined} value
 * @param {ParentNode | Document | null | undefined} root
 * @returns {Element | { getBoundingClientRect: Function } | null}
 */
export function coerceExplicitTarget(value, root) {
  if (value == null) {
    return null;
  }

  if (isElementTarget(value) || isVirtualReference(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const doc = root ?? (typeof document !== 'undefined' ? document : null);
    assert(
      `explicitTarget selector "${value}" cannot be resolved without a document`,
      doc != null
    );

    const matches = doc.querySelectorAll(value);

    assert(
      `explicitTarget selector "${value}" found ${matches.length} possible targets when there should be exactly 1`,
      matches.length === 1
    );

    return matches[0];
  }

  assert(
    'explicitTarget must be an Element, a CSS selector string, or a Floating UI virtual reference with getBoundingClientRect',
    false
  );

  return null;
}

/**
 * Pick the Floating UI reference: explicit arg, then yielded registration, then parent.
 *
 * @param {object} options
 * @param {Element | string | { getBoundingClientRect: Function } | null | undefined} options.explicitTarget
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} options.registeredTarget
 * @param {Element | null | undefined} options.parentElement Implicit parent from the meta finder.
 * @param {ParentNode | Document | null | undefined} [options.root]
 * @returns {Element | { getBoundingClientRect: Function } | null}
 */
export function resolveAttachmentTarget({
  explicitTarget,
  registeredTarget,
  parentElement,
  root,
}) {
  if (explicitTarget != null) {
    return coerceExplicitTarget(explicitTarget, root);
  }

  if (registeredTarget != null) {
    return registeredTarget;
  }

  return parentElement ?? null;
}

/**
 * Event listeners need a real Element. Virtual refs may supply `contextElement`.
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
