import { cancel, schedule } from '@ember/runloop';
import { modifier } from 'ember-modifier';

function consume(positional) {
  for (let i = 0; i < positional.length; i++) {
    void positional[i];
  }
}

/**
 * Run once per element, after render, so tracked writes do not hit the modifier's tracking frame.
 *
 * @param {Function} fn
 * @returns {import('ember-modifier').ModifierFunction}
 */
export function onInsert(fn) {
  const seen = new WeakSet();

  return modifier((element) => {
    if (seen.has(element)) {
      return;
    }

    seen.add(element);
    const timer = schedule('actions', fn, element);
    return () => cancel(timer);
  });
}

/**
 * Skip install ({{did-update}} semantics). Each factory has its own WeakSet so two
 * onUpdate modifiers on the same node do not steal each other's first run.
 *
 * @param {Function} fn
 * @returns {import('ember-modifier').ModifierFunction}
 */
export function onUpdate(fn) {
  const seen = new WeakSet();

  return modifier((element, positional) => {
    consume(positional);

    if (!seen.has(element)) {
      seen.add(element);
      return;
    }

    fn();
  });
}
