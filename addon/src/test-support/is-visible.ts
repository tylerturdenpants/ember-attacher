import type { AttachmentSelector } from '../../declarations/test-support/is-visible';

export function isVisible(selector: AttachmentSelector, contextEl?: Element | null): boolean {
  const attachment =
    typeof selector === 'string' ? getAttachment(selector, contextEl) : selector;

  if (!attachment) {
    return false;
  }

  if (!(attachment instanceof Element)) {
    return false;
  }

  const style = getComputedStyle(attachment);

  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  if (attachment.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if (
    attachment.hasAttribute('popover') &&
    typeof attachment.matches === 'function' &&
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.showPopover === 'function'
  ) {
    try {
      if (!attachment.matches(':popover-open')) {
        return false;
      }
    } catch {
      // Ignore if :popover-open selector is unsupported
    }
  }

  return true;
}

function getAttachment(
  selectorOrElement: string | Element | Window | Document = '',
  contextEl?: Element | null
): Element | Window | Document {
  if (
    selectorOrElement instanceof Window ||
    selectorOrElement instanceof Document ||
    selectorOrElement instanceof Element
  ) {
    return selectorOrElement;
  }

  let result: Element | null;

  if (contextEl instanceof HTMLElement) {
    result = contextEl.querySelector(selectorOrElement);
  } else {
    result = document.querySelector(`${selectorOrElement}`);
  }

  if (!result) {
    const msg = typeof selectorOrElement === 'string' ? selectorOrElement : '';

    throw `Could not locate attachment from selector: ${msg}`;
  }

  return result;
}
