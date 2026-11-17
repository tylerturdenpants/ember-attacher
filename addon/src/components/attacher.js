import Component from '@glimmer/component';
import { helper } from '@ember/component/helper';
import AttacherCore from '../lib/attacher-core.js';

const syncAttacherArgs = helper((positional) => {
  for (let i = 0; i < positional.length; i++) {
    void positional[i];
  }
  const [core] = positional;
  core?.scheduleArgsSync();
  return '';
});

export default class Attacher extends Component {
  syncAttacherArgs = syncAttacherArgs;

  constructor(owner, args) {
    super(owner, args);
    this.core = new AttacherCore(this, () => this.args, {
      allowParentFallback: false,
      isComponentHost: false,
    });
  }

  get id() {
    return this.core.id;
  }
}
