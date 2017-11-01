import { find } from 'ember-native-dom-helpers';

export function isVisible(selector, contextEl) {
  const attachment = typeof(selector) === 'string' ? find(selector, contextEl) : selector;

  if (!attachment) {
    const msg = typeof(selector) === 'string' ? selector : selector.innerHTML;

    throw `Could not locate attachment from selector: ${msg}`;
  }

  return attachment.style.display !== 'none';
}
