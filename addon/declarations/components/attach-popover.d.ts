import type Component from '@glimmer/component';
import type { AttachPopoverArgs, AttacherBlockParams } from './basic-attacher';

export type { AttachPopoverArgs };

export interface AttachPopoverSignature {
  Element: HTMLDivElement;
  Args: AttachPopoverArgs;
  Blocks: {
    default: [popover: AttacherBlockParams];
  };
}

export default class AttachPopover extends Component<AttachPopoverSignature> {
  get ariaRole(): string;
}
