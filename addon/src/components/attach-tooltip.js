import { getComponentTemplate, setComponentTemplate } from '@ember/component';
import { getOwner } from '@ember/application';
import DEFAULTS from '../defaults';
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
    const { tooltip, tooltipClass } =
      getOwner(this).resolveRegistration('config:environment').emberAttacher || {};

    return tooltip?.tooltipClass ?? tooltipClass ?? DEFAULTS.tooltipClass;
  }
}

setComponentTemplate(getComponentTemplate(BasicAttacher), AttachTooltip);
