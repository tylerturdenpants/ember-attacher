import { getComponentTemplate, setComponentTemplate } from '@ember/component';
import BasicAttacher from './basic-attacher';

export default class AttachPopover extends BasicAttacher {
  get _defaultConfigKey() {
    return 'popover';
  }

  get _defaultAriaRole() {
    return 'dialog';
  }

  get ariaRole() {
    return this.args.ariaRole || 'dialog';
  }
}

setComponentTemplate(getComponentTemplate(BasicAttacher), AttachPopover);
