import { assert, warn } from '@ember/debug';
import { isElementTarget } from './target-resolution.js';

/**
 * Whether the current browser environment supports Top-Layer `[popover="manual"]`.
 *
 * @returns {boolean}
 */
export function supportsPopoverHost() {
  return (
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.showPopover === 'function'
  );
}

/**
 * Find the nearest open modal `<dialog>` (`dialog:modal`) enclosing a context node,
 * so Top-Layer attachments opened inside `showModal()` stay DOM-inside the modal
 * and do not become inert.
 *
 * @param {Element | null | undefined} contextNode
 * @returns {Element | null}
 */
export function getModalDialogContainer(contextNode) {
  if (!isElementTarget(contextNode) || typeof contextNode.closest !== 'function') {
    return null;
  }

  try {
    return contextNode.closest('dialog:modal');
  } catch {
    return null;
  }
}

/**
 * Resolve the DOM destination element for `MaybeInElement`.
 *
 * @param {{
 *   renderInPlace: boolean,
 *   parentElement: Element | null,
 *   maybeContainer: Element | string | null | undefined,
 *   hasCustomContainer: boolean,
 *   modalContainer: Element | null,
 *   usePopoverHost: boolean,
 * }} options
 * @returns {Element | undefined}
 */
export function resolveHostContainer({
  renderInPlace,
  parentElement,
  maybeContainer,
  hasCustomContainer,
  modalContainer,
  usePopoverHost,
}) {
  if (renderInPlace) {
    return parentElement;
  }

  if (maybeContainer instanceof Element) {
    return maybeContainer;
  }

  if (!hasCustomContainer && modalContainer) {
    return modalContainer;
  }

  if (typeof maybeContainer === 'string') {
    const possibleContainers = document.querySelectorAll(maybeContainer);

    // DEFAULTS.floatingElementContainer is '.ember-application'; embedded or
    // standalone Top-Layer mounts without .ember-application fall back to body.
    if (possibleContainers.length === 0 && !hasCustomContainer && usePopoverHost) {
      return document.body;
    }

    assert(
      `floatingElementContainer selector "${maybeContainer}" found ` +
        `${possibleContainers.length} possible containers when there should be exactly 1`,
      possibleContainers.length === 1
    );

    return possibleContainers[0];
  }

  return undefined;
}

/**
 * Promote a `[popover]` host element into the browser Top Layer.
 * If `showPopover()` throws, logs a debug warning and removes `[popover]` so the
 * `{{#in-element}}` portal fallback stays visible instead of matching UA `:not(:popover-open)`.
 *
 * @param {Element | null | undefined} el
 */
export function showPopoverHost(el) {
  if (
    el &&
    el.isConnected &&
    el.hasAttribute('popover') &&
    typeof el.showPopover === 'function'
  ) {
    try {
      if (!el.matches(':popover-open')) {
        el.showPopover();
      }
    } catch (error) {
      warn(
        `[ember-attacher] Top-layer showPopover failed: ${error?.message ?? error}`,
        false,
        { id: 'ember-attacher.popover-error' }
      );
      el.removeAttribute('popover');
    }
  }
}

/**
 * Remove a `[popover]` host element from the browser Top Layer.
 *
 * @param {Element | null | undefined} el
 */
export function hidePopoverHost(el) {
  if (
    el &&
    el.isConnected &&
    el.hasAttribute('popover') &&
    typeof el.hidePopover === 'function'
  ) {
    try {
      if (el.matches(':popover-open')) {
        el.hidePopover();
      }
    } catch (error) {
      warn(
        `[ember-attacher] Top-layer hidePopover failed: ${error?.message ?? error}`,
        false,
        { id: 'ember-attacher.popover-error' }
      );
    }
  }
}
