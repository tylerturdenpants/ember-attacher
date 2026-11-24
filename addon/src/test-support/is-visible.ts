export type AttachmentSelector = string | Element | Window | Document | null | undefined;

function isElementVisible(element: Element): boolean {
  const style = getComputedStyle(element);

  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if (
    element.hasAttribute('popover') &&
    typeof element.matches === 'function' &&
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.showPopover === 'function'
  ) {
    try {
      if (!element.matches(':popover-open')) {
        return false;
      }
    } catch {
      // Ignore if :popover-open selector is unsupported
    }
  }

  return true;
}

export function isVisible(selector: AttachmentSelector, contextEl?: Element | null): boolean {
  const attachment =
    typeof selector === 'string' ? getAttachment(selector, contextEl) : selector;

  if (!attachment) {
    return false;
  }

  if (!(attachment instanceof Element)) {
    return false;
  }

  // Host controls display/aria-hidden/[popover] while @class targets the inner element;
  // check both so closed inner selectors return false while hidden sub-elements (e.g. arrow) stay accurate.
  const host = attachment.closest('.ember-attacher');
  if (host && host !== attachment && !isElementVisible(host)) {
    return false;
  }

  return isElementVisible(attachment);
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
