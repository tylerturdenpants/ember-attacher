import classic from 'ember-classic-decorator';
import { observes } from '@ember-decorators/object';
import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import AttachPopover from './attach-popover';
import DEFAULTS from '../defaults';

@classic
export default class AttachTooltip extends AttachPopover {
  ariaRole = 'tooltip';

  @alias('_class')
  class;

  @computed('_config.tooltipClass')
  get _class() {
    return this._config.tooltipClass || DEFAULTS.tooltipClass;
  }

  set _class(value) {
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

  @observes('popperTarget')
  popperTargetChanged() {
    const oldTarget = this._currentTarget;
    if (oldTarget) {
      oldTarget.removeAttribute('aria-describedby');
    }

    super.popperTargetChanged;

    this.popperTarget.setAttribute('aria-describedby', this.id);
  }

  willDestroyElement() {
    super.willDestroyElement(...arguments);

    const target = this._currentTarget;
    if (target) {
      target.removeAttribute('aria-describedby');
    }
  }
}
