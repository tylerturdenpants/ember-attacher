import { getOwner } from '@ember/application';
import { registerDestructor } from '@ember/destroyable';
import Modifier from 'ember-modifier';
import type { AttacherArgs } from '../lib/attacher-core';
import { getTooltipPool, type SingletonTooltipPool } from '../lib/singleton-tooltip-pool';

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
 * Shares a single Top-Layer Attachment DOM node per document via `SingletonTooltipPool` (#64).
 */
export default class TooltipModifier extends Modifier<TooltipModifierSignature> {
  private _element: Element | null = null;
  private _pool: SingletonTooltipPool | null = null;

  constructor(
    owner: ConstructorParameters<typeof Modifier<TooltipModifierSignature>>[0],
    args: ConstructorParameters<typeof Modifier<TooltipModifierSignature>>[1]
  ) {
    super(owner, args);
    registerDestructor(this, () => {
      if (this._pool && this._element) {
        this._pool.unregister(this._element);
      }
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
    pool.register(element, text, named as Record<string, unknown>, owner);
  }
}
