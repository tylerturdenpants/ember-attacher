import type Component from '@glimmer/component';
import type { AttachPopoverArgs, AttacherBlockParams } from './basic-attacher';

export type AttachTooltipArgs = AttachPopoverArgs;

export interface AttachTooltipSignature {
  Element: HTMLDivElement;
  Args: AttachTooltipArgs;
  Blocks: {
    default: [tooltip: AttacherBlockParams];
  };
}

export default class AttachTooltip extends Component<AttachTooltipSignature> {
  get ariaRole(): string;
  get additionalClass(): string;
}
