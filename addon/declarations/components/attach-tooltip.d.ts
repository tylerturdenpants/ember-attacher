import type Component from '@glimmer/component';
import type { AttachPopoverArgs, AttacherNamedBlocks } from './basic-attacher';

export type AttachTooltipArgs = AttachPopoverArgs;

export interface AttachTooltipSignature {
  Element: HTMLDivElement;
  Args: AttachTooltipArgs;
  Blocks: AttacherNamedBlocks;
}

export default class AttachTooltip extends Component<AttachTooltipSignature> {
  get ariaRole(): string;
  get additionalClass(): string;
}
