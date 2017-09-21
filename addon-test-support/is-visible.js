import { find } from 'ember-native-dom-helpers';

export function isVisible(selector, contextEl) {
  const inner = typeof(selector) === 'string' ? find(`${selector} > .inner`, contextEl)
    : find('.inner', selector);

  if (!inner) {
    const msg = typeof(selector) === 'string' ? selector : selector.innerHTML;

    throw `Could not locate attachment from selector: ${msg}`;
  }

  return inner.style.display !== 'none';
}
