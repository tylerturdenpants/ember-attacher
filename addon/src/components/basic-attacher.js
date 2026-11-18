import Component from '@glimmer/component';
import AttacherCore from '../lib/attacher-core.js';
import MaybeInElement from './basic-attacher/maybe-in-element.gjs';

export default class BasicAttacher extends Component {
  MaybeInElement = MaybeInElement;

  constructor(owner, args) {
    super(owner, args);
    this.core = new AttacherCore(this, () => this.args, {
      defaultConfigKey: this._defaultConfigKey,
      defaultAriaRole: this._defaultAriaRole,
      getAdditionalClass: () => this.additionalClass,
      allowParentFallback: true,
      isComponentHost: true,
    });
  }

  get _defaultConfigKey() {
    return null;
  }

  get _defaultAriaRole() {
    return undefined;
  }

  get ariaRole() {
    return this.core.ariaRole;
  }

  get additionalClass() {
    return this.args.additionalClass || '';
  }

  get id() {
    return this.core.id;
  }
}
