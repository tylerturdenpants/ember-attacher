import { find } from 'ember-native-dom-helpers';

export function isVisible(selector, contextEl) {
  const attachment = typeof(selector) === 'string' ? getAttachment(selector, contextEl) : selector;

  return attachment.style.display !== 'none' && !attachement.classList.contains('ember-attacher-hide');
}

function getAttachment(selector, contextEl) {
  const attachment = find(selector, contextEl);

  if (!attachment) {
    const msg = typeof(selector) === 'string' ? selector : selector.innerHTML;

    throw `Could not locate attachment from selector: ${msg}`;
  }

  return attachment;
}
