import Component from '@glimmer/component';
import AttacherCore from '../lib/attacher-core';

export default class BasicAttacher extends Component {
  constructor(owner, args) {
    super(owner, args);
    this.core = new AttacherCore(this, () => this.args, {
      defaultConfigKey: this._defaultConfigKey,
      defaultAriaRole: this._defaultAriaRole,
      getAdditionalClass: () => this.additionalClass,
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
