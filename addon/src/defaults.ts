import type { ComputePositionConfig, OffsetOptions, Placement, Strategy } from '@floating-ui/dom';

export type AttacherAnimation =
  | 'fade'
  | 'fill'
  | 'none'
  | 'perspective'
  | 'scale'
  | 'shift'
  | (string & {});

export interface EmberAttacherPopoverDefaults {
  showOn: string | null;
  hideOn: string | null;
  interactive: boolean;
  lazyRender: boolean;
}

export interface EmberAttacherDefaults {
  animation: AttacherAnimation;
  arrow: boolean;
  autoUpdate: boolean;
  hideDelay: number;
  hideDuration: number;
  hideOn: string | null;
  interactive: boolean;
  isShown: boolean;
  lazyRender: boolean;
  middleware: ComputePositionConfig['middleware'] | null;
  offset: OffsetOptions | null;
  placement: Placement;
  popoverClass: string;
  strategy: Strategy;
  renderInPlace: boolean;
  showDelay: number;
  showDuration: number;
  showOn: string | null;
  tooltipClass: string;
  useCapture: boolean;
}

export const POPOVER_DEFAULTS: Readonly<EmberAttacherPopoverDefaults> = Object.freeze({
  showOn: 'click',
  hideOn: 'click clickout escapekey',
  interactive: true,
  lazyRender: true,
});

const DEFAULTS: EmberAttacherDefaults = {
  animation: 'fill',
  arrow: false,
  autoUpdate: true,
  hideDelay: 0,
  hideDuration: 300,
  hideOn: 'mouseleave blur escapekey',
  interactive: true,
  isShown: false,
  lazyRender: false,
  middleware: null,
  offset: null,
  placement: 'top',
  popoverClass: '',
  strategy: 'absolute',
  renderInPlace: false,
  showDelay: 0,
  showDuration: 300,
  showOn: 'mouseenter focus',
  tooltipClass: 'ember-attacher-floating ember-attacher-tooltip',
  useCapture: false,
};

export default DEFAULTS;
