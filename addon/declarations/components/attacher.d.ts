import type Component from '@glimmer/component';
import type { AttachPopoverArgs, AttacherBlockParams } from './basic-attacher';

export type AttacherArgs = AttachPopoverArgs;
export type AttacherYieldedApi<TData = unknown> = AttacherBlockParams<TData>;

export interface AttacherSignature {
  Element: null;
  Args: AttacherArgs;
  Blocks: {
    default: [attacher: AttacherBlockParams];
  };
}

export default class Attacher extends Component<AttacherSignature> {
  get id(): string;
}
