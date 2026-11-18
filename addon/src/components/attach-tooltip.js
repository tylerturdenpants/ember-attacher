import { getComponentTemplate, setComponentTemplate } from '@ember/component';
import { resolveTooltipClass } from '../lib/attacher-core.js';
import BasicAttacher from './basic-attacher';

export default class AttachTooltip extends BasicAttacher {
  get _defaultConfigKey() {
    return 'tooltip';
  }

  get _defaultAriaRole() {
    return 'tooltip';
  }

  get additionalClass() {
    return [this.args.additionalClass, resolveTooltipClass(this.core.envConfig)]
      .filter(Boolean)
      .join(' ');
  }
}

setComponentTemplate(getComponentTemplate(BasicAttacher), AttachTooltip);
