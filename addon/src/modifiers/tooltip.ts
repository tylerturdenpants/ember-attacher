import { getOwner } from '@ember/application';
import { registerDestructor } from '@ember/destroyable';
import Modifier from 'ember-modifier';
import type { AttacherArgs } from '../lib/attacher-core';
import { getTooltipPool, SingletonTooltipPool } from '../lib/singleton-tooltip-pool';

export type TooltipModifierOptions = Omit<AttacherArgs, 'target'>;

export interface TooltipModifierSignature {
  Element: Element;
  Args: {
    Positional: [text: string | null | undefined];
    Named: TooltipModifierOptions;
  };
}

/**
 * `{{tooltip "Text" class="..." ...}}` modifier for void and simple targets.
 * Shares a single Top-Layer Attachment DOM node per document via `SingletonTooltipPool` (#64),
 * or allocates an isolated host instance when controlled `isShown` is passed.
 */
export default class TooltipModifier extends Modifier<TooltipModifierSignature> {
  private _element: Element | null = null;
  private _pool: SingletonTooltipPool | null = null;
  private _dedicatedPool: SingletonTooltipPool | null = null;

  constructor(
    owner: ConstructorParameters<typeof Modifier<TooltipModifierSignature>>[0],
    args: ConstructorParameters<typeof Modifier<TooltipModifierSignature>>[1]
  ) {
    super(owner, args);
    registerDestructor(this, () => {
      if (this._pool && this._element) {
        this._pool.unregister(this._element);
      }
      this._dedicatedPool?.destroy();
      this._dedicatedPool = null;
      this._element = null;
      this._pool = null;
    });
  }

  modify(
    element: Element,
    [text]: TooltipModifierSignature['Args']['Positional'],
    named: TooltipModifierSignature['Args']['Named']
  ): void {
    if (text == null || text === '') {
      if (this._pool && this._element) {
        this._pool.unregister(this._element);
        this._pool = null;
      }
      if (this._dedicatedPool) {
        this._dedicatedPool.destroy();
        this._dedicatedPool = null;
      }
      this._element = null;
      return;
    }

    const owner = getOwner(this);
    const isControlled = named?.isShown !== undefined;

    if (isControlled) {
      if (this._pool && this._element) {
        this._pool.unregister(this._element);
        this._pool = null;
      }

      const doc = element?.ownerDocument || (typeof document !== 'undefined' ? document : null);
      if (!doc) {
        return;
      }

      if (this._dedicatedPool && this._element && this._element !== element) {
        this._dedicatedPool.unregister(this._element);
        this._dedicatedPool = null;
      }

      if (!this._dedicatedPool || !this._dedicatedPool.core || this._dedicatedPool.core.isDestroyed) {
        this._dedicatedPool = new SingletonTooltipPool(doc);
      }

      this._element = element;
      this._dedicatedPool.register(element, text, named as Record<string, unknown>, owner);
      return;
    }

    if (this._dedicatedPool) {
      this._dedicatedPool.destroy();
      this._dedicatedPool = null;
    }

    const pool = getTooltipPool(element);
    if (!pool) {
      return;
    }

    if (this._element && this._element !== element && this._pool) {
      this._pool.unregister(this._element);
    }

    this._element = element;
    this._pool = pool;
    pool.register(element, text, named as Record<string, unknown>, owner);
  }
}
