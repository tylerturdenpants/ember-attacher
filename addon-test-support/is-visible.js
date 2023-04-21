export function isVisible(selector, contextEl) {
  const attachment = typeof(selector) === 'string' ? getAttachment(selector, contextEl) : selector;

  return getComputedStyle(attachment).display !== 'none';
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
