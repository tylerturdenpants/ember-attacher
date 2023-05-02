import { action } from '@ember/object';
import AttachPopover from './attach-popover';
import DEFAULTS from '../defaults';
import layout from '../templates/components/attach-popover';
import { setComponentTemplate } from '@ember/component';

class AttachTooltip extends AttachPopover {
  configKey = 'tooltip';

  get ariaRole() {
    return this.args.ariaRole || 'tooltip';
  }

  get class() {
    return `${this._config.tooltipClass || DEFAULTS.tooltipClass} ${this.args.class}`;
  }

  set class(value) {
    const tooltipClass = this._config.tooltipClass || DEFAULTS.tooltipClass;

    // eslint-disable-next-line no-setter-return
    return `${tooltipClass} ${value}`;
  }
  _initializeAttacher() {
    super._initializeAttacher();
    this._currentTarget?.setAttribute('aria-describedby', this.id);
  }

  @action
  explicitTargetChanged() {
    const oldTarget = this._currentTarget;
    if (oldTarget) {
      oldTarget.removeAttribute('aria-describedby');
    }

    this.explicitTarget?.setAttribute('aria-describedby', this.id);
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
