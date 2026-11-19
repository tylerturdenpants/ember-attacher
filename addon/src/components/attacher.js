import Component from '@glimmer/component';
import AttacherCore from '../lib/attacher-core';

export default class Attacher extends Component {
  constructor(owner, args) {
    super(owner, args);
    this.core = new AttacherCore(this, () => this.args, {
      isComponentHost: false,
    });
  }

  get id() {
    return this.core.id;
  }
}
