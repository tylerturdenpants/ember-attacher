import { getComponentTemplate, setComponentTemplate } from '@ember/component';
import {
  resolveTooltipClass,
  type AttacherArgs,
  type AttacherNamedBlocks,
} from '../lib/attacher-core';
import AttacherOverlay, { type AttacherOverlaySignature } from '../lib/attacher-overlay';

export type AttachTooltipArgs = AttacherArgs;

export interface AttachTooltipSignature extends AttacherOverlaySignature {
  Element: HTMLDivElement;
  Args: AttachTooltipArgs;
  Blocks: AttacherNamedBlocks;
}

export default class AttachTooltip extends AttacherOverlay {
  override get _defaultConfigKey(): 'tooltip' {
    return 'tooltip';
  }

  override get _defaultAriaRole(): string {
    return 'tooltip';
  }

  override get _defaultClass(): string {
    return resolveTooltipClass(this.core.envConfig);
  }
}

const template = getComponentTemplate(AttacherOverlay);
if (template) {
  setComponentTemplate(template, AttachTooltip);
}
