import { getOwner } from '@ember/application';
import { registerDestructor } from '@ember/destroyable';
import Modifier from 'ember-modifier';
import { getTooltipPool } from '../lib/singleton-tooltip-pool.js';

/**
 * `{{tooltip "Text" class="..." ...}}` modifier for void and simple targets.
 * Shares a single Top-Layer Attachment DOM node per document via `SingletonTooltipPool` (#64).
 */
export default class TooltipModifier extends Modifier {
  _element = null;
  _pool = null;

  constructor(owner, args) {
    super(owner, args);
    registerDestructor(this, () => {
      if (this._pool && this._element) {
        this._pool.unregister(this._element);
      }
      this._element = null;
      this._pool = null;
    });
  }

  modify(element, [text], named) {
    if (text == null || text === '') {
      if (this._pool && this._element) {
        this._pool.unregister(this._element);
        this._element = null;
        this._pool = null;
      }
      return;
    }

    const owner = getOwner(this);
    const pool = getTooltipPool(element);
    if (!pool) {
      return;
    }

    if (this._element && this._element !== element && this._pool) {
      this._pool.unregister(this._element);
    }

    this._element = element;
    this._pool = pool;
    pool.register(element, text, named, owner);
  }
}
