import { warn } from '@ember/debug';
import { isElementTarget } from './target-resolution';

/**
 * Whether the current browser environment supports Top-Layer `[popover="manual"]`.
 */
export function supportsPopoverHost(): boolean {
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
 */
export function getModalDialogContainer(contextNode: unknown): Element | null {
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
 * Promote a `[popover]` host element into the browser Top Layer.
 * If `showPopover()` throws, logs a debug warning and removes `[popover]` so the
 * in-place host remains visible instead of matching UA `:not(:popover-open)`.
 */
export function showPopoverHost(el: Element | null | undefined): void {
  if (
    el instanceof HTMLElement &&
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
        `[ember-attacher] Top-layer showPopover failed: ${(error as Error)?.message ?? error}`,
        false,
        { id: 'ember-attacher.popover-error' }
      );
      el.removeAttribute('popover');
    }
  }
}

/**
 * Remove a `[popover]` host element from the browser Top Layer.
 */
export function hidePopoverHost(el: Element | null | undefined): void {
  if (
    el instanceof HTMLElement &&
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
        `[ember-attacher] Top-layer hidePopover failed: ${(error as Error)?.message ?? error}`,
        false,
        { id: 'ember-attacher.popover-error' }
      );
    }
  }
}
