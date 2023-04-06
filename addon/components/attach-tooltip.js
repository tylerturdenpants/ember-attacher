import classic from 'ember-classic-decorator';
import { observes } from '@ember-decorators/object';
import { computed } from '@ember/object';
import AttachPopover from './attach-popover';
import DEFAULTS from '../defaults';

@classic
export default class AttachTooltip extends AttachPopover {
  configKey = 'tooltip';
  ariaRole = 'tooltip';

  @computed('_config.tooltipClass')
  get class() {
    return this._config.tooltipClass || DEFAULTS.tooltipClass;
  }

  set class(value) {
    const tooltipClass = this._config.tooltipClass || DEFAULTS.tooltipClass;

    // eslint-disable-next-line no-setter-return
    return `${tooltipClass} ${value}`;
  }

  didInsertElement() {
    super.didInsertElement(...arguments);

    if (!this._currentTarget) {
      return;
    }

    this._currentTarget.setAttribute('aria-describedby', this.id);
  }

  @observes('explicitTarget')
  explicitTargetChanged() {
    const oldTarget = this._currentTarget;
    if (oldTarget) {
      oldTarget.removeAttribute('aria-describedby');
    }

    super.explicitTargetChanged;

    this.explicitTarget.setAttribute('aria-describedby', this.id);
  }

  willDestroyElement() {
    super.willDestroyElement(...arguments);

    const target = this._currentTarget;
    if (target) {
      target.removeAttribute('aria-describedby');
    }
  }
}
