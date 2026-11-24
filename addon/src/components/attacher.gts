import Component from '@glimmer/component';
import type Owner from '@ember/owner';
import AttacherCore, {
  type AttacherArgs,
  type AttacherBlockParams,
} from '../lib/attacher-core';

export type { AttacherArgs };
export type AttacherYieldedApi<TData = unknown> = AttacherBlockParams<TData>;

export interface AttacherSignature {
  Element: null;
  Args: AttacherArgs;
  Blocks: {
    default: [attacher: AttacherBlockParams];
  };
}

export default class Attacher extends Component<AttacherSignature> {
  readonly core: AttacherCore;

  constructor(owner: Owner, args: AttacherArgs) {
    super(owner, args);
    this.core = new AttacherCore(this, () => this.args, {
      isComponentHost: false,
    });
  }

  get id(): string {
    return this.core.id;
  }

  <template>{{~this.core.syncArgs
    @target
    @isShown
    @placement
    @strategy
    @showOn
    @hideOn
    @showDelay
    @hideDelay
    @showDuration
    @hideDuration
    @animation
    @interactive
    @arrow
    @autoUpdate
    @lazyRender
    @middleware
    @offset
    @onChange
    @placement
    @renderInPlace
    @id
    @ariaRole
    @class
    @useCapture
  ~}}{{yield this.core.api}}</template>
}
