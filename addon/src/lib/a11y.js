/**
 * Accessibility and ARIA attribute management for BasicAttacher.
 *
 * Manages token-safe open-only `aria-describedby` for tooltips, automatic
 * disclosure attributes (`aria-expanded`, `aria-controls`, `aria-haspopup`)
 * for popovers when not supplied by callers, and focus restoration on Escape.
 */

import { runInDebug, warn } from '@ember/debug';

const KNOWN_HASPOPUP_ROLES = new Set(['dialog', 'menu', 'listbox', 'tree', 'grid', 'true', 'false']);

function splitTokens(value) {
  return value ? value.trim().split(/\s+/).filter(Boolean) : [];
}

/**
 * Tracks and restores ARIA attributes owned by a single BasicAttacher instance
 * without clobbering pre-existing caller attributes or tokens.
 */
export class AttachmentAriaController {
  _boundTarget = null;
  _isTooltip = false;
  _attachmentId = null;
  _ariaRole = undefined;
  _addedDescribedByToken = false;
  _ownsHasPopup = false;
  _ownsControls = false;
  _ownsExpanded = false;

  /**
   * Bind ARIA metadata to a target Element (no-op when target is null/non-Element).
   *
   * @param {Element | null} target
   * @param {{ isTooltip: boolean, id: string, ariaRole?: string, isOpen: boolean }} options
   */
  bind(target, { isTooltip, id, ariaRole, isOpen }) {
    if (
      this._boundTarget &&
      (this._boundTarget !== target ||
        this._attachmentId !== id ||
        this._isTooltip !== isTooltip ||
        this._ariaRole !== ariaRole)
    ) {
      this.unbind();
    }

    if (!target || typeof target.setAttribute !== 'function') {
      return;
    }

    this._boundTarget = target;
    this._isTooltip = isTooltip;
    this._attachmentId = id;
    this._ariaRole = ariaRole;

    if (!isTooltip) {
      if (!target.hasAttribute('aria-haspopup')) {
        const role = ariaRole || 'dialog';

        runInDebug(() => {
          warn(
            `[ember-attacher] Unrecognized aria-haspopup role "${role}". Expected one of: dialog, menu, listbox, tree, grid.`,
            KNOWN_HASPOPUP_ROLES.has(role),
            { id: 'ember-attacher.unrecognized-aria-haspopup' }
          );
        });

        target.setAttribute('aria-haspopup', role);
        this._ownsHasPopup = true;
      }

      if (!target.hasAttribute('aria-controls')) {
        target.setAttribute('aria-controls', id);
        this._ownsControls = true;
      }

      if (!target.hasAttribute('aria-expanded')) {
        target.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        this._ownsExpanded = true;
      }
    }

    this.setOpen(isOpen);
  }

  /**
   * Update open/closed ARIA state on the bound target.
   *
   * @param {boolean} isOpen
   */
  setOpen(isOpen) {
    const target = this._boundTarget;
    if (!target) {
      return;
    }

    if (this._isTooltip) {
      this._setDescribedByOpen(target, isOpen);
    } else if (this._ownsExpanded) {
      target.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }

  /**
   * Remove only the attributes and tokens added by this controller.
   */
  unbind() {
    const target = this._boundTarget;
    if (!target) {
      return;
    }

    if (this._addedDescribedByToken) {
      this._removeDescribedByToken(target, this._attachmentId);
      this._addedDescribedByToken = false;
    }

    if (this._ownsHasPopup) {
      target.removeAttribute('aria-haspopup');
      this._ownsHasPopup = false;
    }

    if (this._ownsControls) {
      target.removeAttribute('aria-controls');
      this._ownsControls = false;
    }

    if (this._ownsExpanded) {
      target.removeAttribute('aria-expanded');
      this._ownsExpanded = false;
    }

    this._boundTarget = null;
    this._attachmentId = null;
    this._isTooltip = false;
    this._ariaRole = undefined;
  }

  _setDescribedByOpen(target, isOpen) {
    const id = this._attachmentId;
    if (!id) {
      return;
    }

    if (isOpen) {
      const tokens = splitTokens(target.getAttribute('aria-describedby'));
      if (!tokens.includes(id)) {
        tokens.push(id);
        target.setAttribute('aria-describedby', tokens.join(' '));
        this._addedDescribedByToken = true;
      }
    } else if (this._addedDescribedByToken) {
      this._removeDescribedByToken(target, id);
      this._addedDescribedByToken = false;
    }
  }

  _removeDescribedByToken(target, token) {
    if (!token) {
      return;
    }

    const remaining = splitTokens(target.getAttribute('aria-describedby')).filter((t) => t !== token);
    if (remaining.length > 0) {
      target.setAttribute('aria-describedby', remaining.join(' '));
    } else {
      target.removeAttribute('aria-describedby');
    }
  }
}

/**
 * Restore focus to the Target if focus currently lives inside the floating attachment
 * or on another element outside the Target when dismissed via Escape.
 *
 * @param {Element | null} target
 * @param {Element | null} floatingElement
 */
export function restoreFocusOnEscape(target, floatingElement) {
  if (!target || typeof target.focus !== 'function' || typeof document === 'undefined') {
    return;
  }

  const active = document.activeElement;
  if (active === target) {
    return;
  }

  const focusInsideAttachment = Boolean(floatingElement && active && floatingElement.contains(active));
  if (focusInsideAttachment) {
    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  }
}
