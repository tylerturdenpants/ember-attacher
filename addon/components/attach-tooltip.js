import AttachPopover from './attach-popover';
import DEFAULTS from '../defaults';
import { computed, observer } from '@ember/object';

export default AttachPopover.extend({
  ariaRole: 'tooltip',

  class: computed({
    get() {
      return this.get('_config').tooltipClass || DEFAULTS.tooltipClass;
    },

    set(_key, value) {
      const tooltipClass = this.get('_config').tooltipClass || DEFAULTS.tooltipClass;

      return `${tooltipClass} ${value}`;
    }
  }),

  didInsertElement() {
    this._super(...arguments);

    if (!this._currentTarget) {
      return;
    }

    this._currentTarget.setAttribute('aria-describedby', this.id);
  },

  popperTargetChanged: observer('popperTarget', function() {
    const oldTarget = this._currentTarget;
    if (oldTarget) {
      oldTarget.removeAttribute('aria-describedby');
    }

    this._super(...arguments);

    this.get('popperTarget').setAttribute('aria-describedby', this.id);
  }),

  willDestroyElement() {
    this._super(...arguments);

    const target = this._currentTarget;
    if (target) {
      target.removeAttribute('aria-describedby');
    }
  }
});
