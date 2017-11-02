import AttachPopover from './attach-popover';
import { computed, observer } from '@ember/object';
import DEFAULTS from '../defaults';

export default AttachPopover.extend({
  ariaRole: 'tooltip',

  class: computed({
    get() {
      return this.get('_config').tooltipClass || DEFAULTS.tooltipClass;
    },

    set(_key, value) {
      const tooltipClass = this.get('config').tooltipClass || DEFAULTS.tooltipClass;

      return `${tooltipClass} ${value}`;
    }
  }),

  targetChanged: observer('target', function() {
    const oldTarget = this._currentTarget;
    if (oldTarget) {
      oldTarget.removeAttribute('aria-describedby');
    }

    this._super(...arguments);

    this.get('target').setAttribute('aria-describedby', this.id);
  }),

  willDestroyElement() {
    this._super(...arguments);

    const target = this._currentTarget;
    if (target) {
      target.removeAttribute('aria-describedby');
    }
  }
});
