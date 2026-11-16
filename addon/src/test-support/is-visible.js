export function isVisible(selector, contextEl) {
  const attachment = typeof(selector) === 'string' ? getAttachment(selector, contextEl) : selector;

  if (!attachment) {
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

function getAttachment(selectorOrElement = '', contextEl) {
  if (selectorOrElement instanceof Window ||
      selectorOrElement instanceof Document ||
      selectorOrElement instanceof HTMLElement ||
      selectorOrElement instanceof SVGElement) {
    return selectorOrElement;
  }

  let result;

  if (contextEl instanceof HTMLElement) {
    result = contextEl.querySelector(selectorOrElement);
  } else {
    result = document.querySelector(`${selectorOrElement}`);
  }

  if (!result) {
    const msg = typeof(selector) === 'string' ? selectorOrElement : selectorOrElement.innerHTML;

    throw `Could not locate attachment from selector: ${msg}`;
  }

  return result;
}
