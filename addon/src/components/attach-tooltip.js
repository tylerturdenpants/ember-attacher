import { getComponentTemplate, setComponentTemplate } from '@ember/component';
import { getOwner } from '@ember/application';
import { resolveTooltipClass } from '../lib/attacher-core.js';
import BasicAttacher from './basic-attacher';

export default class AttachTooltip extends BasicAttacher {
  get _defaultConfigKey() {
    return 'tooltip';
  }

  get _defaultAriaRole() {
    return 'tooltip';
  }

  get ariaRole() {
    return this.args.ariaRole || 'tooltip';
  }

  get additionalClass() {
    const env = getOwner(this)?.resolveRegistration?.('config:environment')?.emberAttacher || {};
    return [this.args.additionalClass, resolveTooltipClass(env)].filter(Boolean).join(' ');
  }
}

setComponentTemplate(getComponentTemplate(BasicAttacher), AttachTooltip);
