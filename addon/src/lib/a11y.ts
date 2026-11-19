/**
 * Accessibility and ARIA attribute management for ember-attacher.
 *
 * Implements modern-web-guidance smart tooltip ARIA:
 * - Binds token-safe `aria-labelledby` when a trigger has no accessible name of its own.
 * - Suppresses `aria-describedby` when the tooltip text duplicates the trigger's accessible name.
 * - Otherwise binds token-safe open-only `aria-describedby` for tooltips, and automatic
 *   disclosure attributes (`aria-expanded`, `aria-controls`, `aria-haspopup`) for popovers.
 * - Restores focus on Escape when focus lives inside an interactive popover.
 */

import { runInDebug, warn } from '@ember/debug';

const KNOWN_HASPOPUP_ROLES = new Set(['dialog', 'menu', 'listbox', 'tree', 'grid', 'true', 'false']);

function splitTokens(value: string | null | undefined): string[] {
  return value ? value.trim().split(/\s+/).filter(Boolean) : [];
}

function normalizeText(value: unknown): string {
  return value ? String(value).replace(/\s+/g, ' ').trim() : '';
}

function collectAccessibleText(node: Node | null | undefined, ignoreId?: string | null): string {
  if (!node) {
    return '';
  }

  if (node.nodeType === 3 /* Node.TEXT_NODE */) {
    return node.nodeValue || '';
  }

  if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) {
    return '';
  }

  const el = node as Element;

  if (
    (ignoreId && el.id === ignoreId) ||
    el.classList?.contains('ember-attacher') ||
    el.getAttribute('aria-hidden') === 'true' ||
    (el as HTMLElement).hidden
  ) {
    return '';
  }

  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'img' || tag === 'area') {
    return ` ${el.getAttribute('alt') || ''} `;
  }

  if (tag === 'input') {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'button' || type === 'submit' || type === 'reset') {
      return ` ${el.getAttribute('value') || ''} `;
    }
    return '';
  }

  if (tag === 'svg') {
    const svgLabel = el.getAttribute('aria-label');
    if (svgLabel) {
      return ` ${svgLabel} `;
    }
    const titleEl = el.querySelector('title');
    return titleEl ? ` ${titleEl.textContent || ''} ` : '';
  }

  let text = '';
  const children = el.childNodes;
  for (let i = 0; i < children.length; i += 1) {
    text += collectAccessibleText(children[i] as Node, ignoreId);
  }
  return text;
}

/**
 * Resolve a target Element's accessible name per modern-web-guidance rules
 * (`aria-labelledby` excluding `ignoreId`, `aria-label`, text/alt content, `title`).
 *
 * @param {Element | null} target
 * @param {string | null} [ignoreId]
 * @returns {string}
 */
export function getTargetAccessibleName(
  target: Element | null | undefined,
  ignoreId: string | null = null
): string {
  if (!target || typeof target.getAttribute !== 'function') {
    return '';
  }

  const doc = target.ownerDocument || (typeof document !== 'undefined' ? document : null);
  const labelledByIds = splitTokens(target.getAttribute('aria-labelledby')).filter(
    (token) => token !== ignoreId
  );

  if (labelledByIds.length > 0 && doc) {
    const labelText = labelledByIds
      .map((id) => doc.getElementById(id)?.textContent || '')
      .map(normalizeText)
      .filter(Boolean)
      .join(' ');
    if (labelText) {
      return labelText;
    }
  }

  const ariaLabel = normalizeText(target.getAttribute('aria-label'));
  if (ariaLabel) {
    return ariaLabel;
  }

  const contentText = normalizeText(collectAccessibleText(target, ignoreId));
  if (contentText) {
    return contentText;
  }

  return normalizeText(target.getAttribute('title'));
}

/**
 * Tracks and restores ARIA attributes owned by a single AttacherCore instance
 * without clobbering pre-existing caller attributes or tokens.
 */
export class AttachmentAriaController {
  _boundTarget: Element | null = null;
  _isTooltip = false;
  _attachmentId: string | null = null;
  _ariaRole: string | undefined = undefined;
  _tooltipMode: 'describedby' | 'labelledby' | 'none' = 'describedby';
  _addedDescribedByToken = false;
  _addedLabelledByToken = false;
  _ownsHasPopup = false;
  _ownsControls = false;
  _ownsExpanded = false;

  /**
   * Bind ARIA metadata to a target Element (no-op when target is null/non-Element).
   *
   * @param {Element | null} target
   * @param {{
   *   isTooltip: boolean,
   *   id: string,
   *   ariaRole?: string,
   *   isOpen: boolean,
   *   attachmentEl?: Element | null,
   *   tooltipText?: string | null,
   * }} options
   */
  bind(
    target: Element | null | undefined,
    {
      isTooltip,
      id,
      ariaRole,
      isOpen,
      attachmentEl = null,
      tooltipText = null,
    }: {
      isTooltip: boolean;
      id: string;
      ariaRole?: string;
      isOpen: boolean;
      attachmentEl?: Element | null;
      tooltipText?: string | null;
    }
  ): void {
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
    } else {
      const targetName = getTargetAccessibleName(target, id);
      const rawTip =
        tooltipText != null && tooltipText !== '' ? tooltipText : attachmentEl?.textContent || '';
      const normalizedTip = normalizeText(rawTip);
      const hasExternalLabelledBy = splitTokens(target.getAttribute('aria-labelledby')).some(
        (token) => token !== id
      );

      if (!targetName && !hasExternalLabelledBy) {
        this._tooltipMode = 'labelledby';
      } else if (normalizedTip && targetName === normalizedTip) {
        this._tooltipMode = 'none';
      } else {
        this._tooltipMode = 'describedby';
      }
    }

    this.setOpen(isOpen);
  }

  /**
   * Update open/closed ARIA state on the bound target.
   *
   * @param {boolean} isOpen
   */
  setOpen(isOpen: boolean): void {
    const target = this._boundTarget;
    if (!target) {
      return;
    }

    if (this._isTooltip) {
      if (this._tooltipMode === 'labelledby') {
        if (this._addedDescribedByToken) {
          this._removeAttributeToken(target, 'aria-describedby', this._attachmentId);
          this._addedDescribedByToken = false;
        }
        this._addedLabelledByToken = this._ensureAttributeToken(
          target,
          'aria-labelledby',
          this._attachmentId,
          this._addedLabelledByToken
        );
      } else if (this._tooltipMode === 'none') {
        if (this._addedDescribedByToken) {
          this._removeAttributeToken(target, 'aria-describedby', this._attachmentId);
          this._addedDescribedByToken = false;
        }
        if (this._addedLabelledByToken) {
          this._removeAttributeToken(target, 'aria-labelledby', this._attachmentId);
          this._addedLabelledByToken = false;
        }
      } else {
        if (this._addedLabelledByToken) {
          this._removeAttributeToken(target, 'aria-labelledby', this._attachmentId);
          this._addedLabelledByToken = false;
        }
        this._setTokenOnOpen(target, 'aria-describedby', isOpen);
      }
    } else if (this._ownsExpanded) {
      target.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }

  /**
   * Remove only the attributes and tokens added by this controller.
   */
  unbind(): void {
    const target = this._boundTarget;
    if (!target) {
      return;
    }

    if (this._addedDescribedByToken) {
      this._removeAttributeToken(target, 'aria-describedby', this._attachmentId);
      this._addedDescribedByToken = false;
    }

    if (this._addedLabelledByToken) {
      this._removeAttributeToken(target, 'aria-labelledby', this._attachmentId);
      this._addedLabelledByToken = false;
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
    this._tooltipMode = 'describedby';
    this._ariaRole = undefined;
  }

  _setTokenOnOpen(target: Element, attrName: string, isOpen: boolean): void {
    const id = this._attachmentId;
    if (!id) {
      return;
    }

    if (isOpen) {
      this._addedDescribedByToken = this._ensureAttributeToken(
        target,
        attrName,
        id,
        this._addedDescribedByToken
      );
    } else if (this._addedDescribedByToken) {
      this._removeAttributeToken(target, attrName, id);
      this._addedDescribedByToken = false;
    }
  }

  _ensureAttributeToken(
    target: Element,
    attrName: string,
    token: string | null,
    alreadyOwned: boolean
  ): boolean {
    if (!token) {
      return alreadyOwned;
    }
    const tokens = splitTokens(target.getAttribute(attrName));
    if (!tokens.includes(token)) {
      tokens.push(token);
      target.setAttribute(attrName, tokens.join(' '));
      return true;
    }
    return alreadyOwned;
  }

  _removeAttributeToken(target: Element, attrName: string, token: string | null): void {
    if (!token) {
      return;
    }

    const remaining = splitTokens(target.getAttribute(attrName)).filter((t) => t !== token);
    if (remaining.length > 0) {
      target.setAttribute(attrName, remaining.join(' '));
    } else {
      target.removeAttribute(attrName);
    }
  }
}

/**
 * Restore focus to the Target if focus currently lives inside the floating attachment
 * when dismissed via Escape.
 *
 * @param {Element | null} target
 * @param {Element | null} floatingElement
 */
export function restoreFocusOnEscape(
  target: HTMLElement | null | undefined,
  floatingElement: Element | null | undefined
): void {
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
