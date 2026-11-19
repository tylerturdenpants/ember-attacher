import { getComponentTemplate, setComponentTemplate } from '@ember/component';
import type { AttacherArgs, AttacherNamedBlocks } from '../lib/attacher-core';
import AttacherOverlay, { type AttacherOverlaySignature } from '../lib/attacher-overlay';

export type AttachPopoverArgs = AttacherArgs;

export interface AttachPopoverSignature extends AttacherOverlaySignature {
  Element: HTMLDivElement;
  Args: AttachPopoverArgs;
  Blocks: AttacherNamedBlocks;
}

export default class AttachPopover extends AttacherOverlay {
  override get _defaultConfigKey(): 'popover' {
    return 'popover';
  }

  override get _defaultAriaRole(): string {
    return 'dialog';
  }
}

const template = getComponentTemplate(AttacherOverlay);
if (template) {
  setComponentTemplate(template, AttachPopover);
}
