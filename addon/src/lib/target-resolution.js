import { assert } from '@ember/debug';

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
 * Supports both options-bag and positional signatures.
 *
 * @param {object | Element | string | { getBoundingClientRect: Function } | null | undefined} optionsOrExplicit
 * @param {Element | { getBoundingClientRect: Function } | null | undefined} [registeredOrParent]
 * @param {Element | null | undefined} [parentElement] Implicit parent from the meta finder.
 * @param {ParentNode | Document | null | undefined} [root]
 * @returns {Element | { getBoundingClientRect: Function } | null}
 */
export function resolveAttachmentTarget(
  optionsOrExplicit,
  registeredOrParent,
  parentElement,
  root
) {
  let explicitTarget;
  let registeredTarget;
  let parent;
  let searchRoot;

  if (
    optionsOrExplicit != null &&
    typeof optionsOrExplicit === 'object' &&
    !isElementTarget(optionsOrExplicit) &&
    !isVirtualReference(optionsOrExplicit)
  ) {
    ({
      explicitTarget,
      registeredTarget,
      parentElement: parent,
      root: searchRoot,
    } = optionsOrExplicit);
  } else {
    explicitTarget = optionsOrExplicit;
    if (arguments.length <= 2) {
      parent = registeredOrParent;
    } else {
      registeredTarget = registeredOrParent;
      parent = parentElement;
      searchRoot = root;
    }
  }

  if (explicitTarget != null) {
    return coerceExplicitTarget(explicitTarget, searchRoot);
  }

  if (registeredTarget != null) {
    return registeredTarget;
  }

  return parent ?? null;
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
