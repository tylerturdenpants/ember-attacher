import { getComponentTemplate, setComponentTemplate } from '@ember/component';
import BasicAttacher from './basic-attacher';

export default class AttachPopover extends BasicAttacher {
  get _defaultConfigKey() {
    return 'popover';
  }

  get _defaultAriaRole() {
    return 'dialog';
  }
}

setComponentTemplate(getComponentTemplate(BasicAttacher), AttachPopover);
