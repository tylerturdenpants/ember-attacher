import type Modifier from 'ember-modifier';
import type { AttachPopoverArgs } from '../components/basic-attacher';

export type TooltipModifierOptions = Omit<
  AttachPopoverArgs,
  'target' | 'explicitTarget' | 'additionalClass'
>;

export interface TooltipModifierSignature {
  Element: Element;
  Args: {
    Positional: [text: string | null | undefined];
    Named: TooltipModifierOptions;
  };
}

export default class TooltipModifier extends Modifier<TooltipModifierSignature> {}
