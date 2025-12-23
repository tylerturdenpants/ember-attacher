import Component from '@glimmer/component';
import { action } from '@ember/object';
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

  @action
  onInitializeAttacher(currentTarget, id) {
    if (currentTarget?.getAttribute('aria-describedby') != id) {
      const oldTarget = document.querySelector(`[aria-describedby="${id}"]`);

      oldTarget?.removeAttribute('aria-describedby')
      currentTarget?.setAttribute('aria-describedby', id);
    }
  }

  @action
  onWillDestroy(currentTarget) {
    if (currentTarget) {
      currentTarget.removeAttribute('aria-describedby');
    }
  }
}
