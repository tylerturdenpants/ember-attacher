export { default as AttachPopover } from './components/attach-popover';
export type { AttachPopoverArgs, AttachPopoverSignature } from './components/attach-popover';
export { default as AttachTooltip } from './components/attach-tooltip';
export type { AttachTooltipArgs, AttachTooltipSignature } from './components/attach-tooltip';
export { default as Attacher } from './components/attacher';
export type {
  AttacherArgs,
  AttacherSignature,
  AttacherYieldedApi,
} from './components/attacher';
export { default as BasicAttacher } from './components/basic-attacher';
export type {
  AttacherAnimation,
  AttacherBlockParams,
  AttacherNamedBlocks,
  AttacherTarget,
  AttacherTargetModifier,
  BasicAttacherArgs,
  BasicAttacherSignature,
} from './components/basic-attacher';
export { default as tooltip } from './modifiers/tooltip';
export type {
  TooltipModifierOptions,
  TooltipModifierSignature,
} from './modifiers/tooltip';
export type { AttachmentSelector } from './test-support/is-visible';
export { isVisible } from './test-support/is-visible';
export type {
  ArrowOptions,
  AutoPlacementOptions,
  AutoUpdateOptions,
  ClientRectObject,
  ComputePositionConfig,
  FlipOptions,
  HideOptions,
  InlineOptions,
  LimitShiftOptions,
  Middleware,
  MiddlewareData,
  OffsetOptions,
  Placement,
  ShiftOptions,
  SizeOptions,
  Strategy,
  VirtualElement,
} from '@floating-ui/dom';
export {
  autoPlacement,
  flip,
  hide,
  inline,
  limitShift,
  offset,
  shift,
  size,
} from '@floating-ui/dom';

import type { ArrowOptions as FloatingArrowOptions, Middleware } from '@floating-ui/dom';

export type AttacherArrowOptions = Omit<FloatingArrowOptions, 'element'> & {
  element?: Element;
};

/**
 * Floating UI `arrow` middleware re-exported with optional `element` (automatically
 * merged with the rendered `.ember-attacher-arrow` element when omitted).
 */
export declare function arrow(
  options?:
    | AttacherArrowOptions
    | ((state: Parameters<Middleware['fn']>[0]) => AttacherArrowOptions)
): Middleware;
