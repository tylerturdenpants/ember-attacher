import Component from '@glimmer/component';
import type Owner from '@ember/owner';
import AttacherCore, {
  type AttacherArgs,
  type AttacherNamedBlocks,
} from './attacher-core';

export interface AttacherOverlaySignature {
  Element: HTMLDivElement;
  Args: AttacherArgs;
  Blocks: AttacherNamedBlocks;
}

/** Internal shared Host component class for `<AttachPopover>` and `<AttachTooltip>`. */
export default class AttacherOverlay extends Component<AttacherOverlaySignature> {
  readonly core: AttacherCore;

  constructor(owner: Owner, args: AttacherArgs) {
    super(owner, args);
    this.core = new AttacherCore(this, () => this.args, {
      defaultConfigKey: this._defaultConfigKey,
      defaultAriaRole: this._defaultAriaRole,
      getDefaultClass: () => this._defaultClass,
      isComponentHost: true,
    });
  }

  get _defaultConfigKey(): 'popover' | 'tooltip' | null {
    return null;
  }

  get _defaultAriaRole(): string | undefined {
    return undefined;
  }

  get _defaultClass(): string {
    return '';
  }

  get ariaRole(): string | undefined {
    return this.core.ariaRole;
  }

  get id(): string {
    return this.core.id;
  }

  <template>{{~#if (has-block "target")~}}{{yield this.core.api.target this.core.api to="target"}}{{~/if~}}{{~this.core.syncArgs
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
  ~}}<div
    class="ember-attacher"
    id={{this.core.id}}
    popover={{this.core.popoverAttr}}
    role={{this.core.ariaRole}}
    data-offset={{if this.core.hasOffset ""}}
    {{this.core.setupFloatingElement (has-block "target")}}
    ...attributes
  >{{~#if this.core.shouldRenderFloatingElement~}}<div class={{this.core.innerClass}}>{{~#if (has-block "content")~}}{{yield this.core.api to="content"}}{{~else if (has-block)~}}{{yield this.core.api}}{{~/if~}}{{~#if this.core.arrow~}}<div class="ember-attacher-arrow" {{this.core.insertArrow}}></div>{{~/if~}}{{~#if this.core.isFillAnimation~}}<div class="ember-attacher-fill-backdrop" aria-hidden="true"><div class="ember-attacher-fill-circle"></div></div>{{~/if~}}</div>{{~/if~}}</div></template>
}
