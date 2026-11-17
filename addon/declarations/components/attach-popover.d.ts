import type Component from '@glimmer/component';
import type { AttachPopoverArgs, AttacherNamedBlocks } from './basic-attacher';

export type { AttachPopoverArgs };

export interface AttachPopoverSignature {
  Element: HTMLDivElement;
  Args: AttachPopoverArgs;
  Blocks: AttacherNamedBlocks;
}

export default class AttachPopover extends Component<AttachPopoverSignature> {
  get ariaRole(): string;
}
