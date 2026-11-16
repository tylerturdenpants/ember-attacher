import Component from '@glimmer/component';
import DEFAULTS from '../defaults';
import { getOwner } from '@ember/application';

export default class AttachTooltip extends Component {
  get ariaRole() {
    return this.args.ariaRole || 'tooltip';
  }

  get additionalClass() {
    const { tooltip, tooltipClass } = getOwner(this).resolveRegistration('config:environment').emberAttacher || {}

    return tooltip?.tooltipClass ?? tooltipClass ?? DEFAULTS.tooltipClass;
  }
}
