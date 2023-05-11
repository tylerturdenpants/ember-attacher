import AttachPopover from './attach-popover';
import DEFAULTS from '../defaults';
import layout from '../templates/components/attach-popover';
import { setComponentTemplate } from '@ember/component';

class AttachTooltip extends AttachPopover {
  configKey = 'tooltip';

  get ariaRole() {
    return this.args.ariaRole || 'tooltip';
  }

  get _class() {
    return `${super._class} ${this._config.tooltipClass || DEFAULTS.tooltipClass}`
  }

  _initializeAttacher() {
    super._initializeAttacher();

    if (this._currentTarget?.getAttribute('aria-describedby') != this.id) {
      const oldTarget = document.querySelector(`[aria-describedby="${this.id}"]`);

      oldTarget?.removeAttribute('aria-describedby')
      this._currentTarget?.setAttribute('aria-describedby', this.id);
    }
  }

  willDestroy() {
    super.willDestroy(...arguments);

    const target = this._currentTarget;
    if (target) {
      target.removeAttribute('aria-describedby');
    }
  }
}

export default setComponentTemplate(layout, AttachTooltip);
