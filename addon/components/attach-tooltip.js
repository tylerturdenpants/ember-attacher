import EmberAttacher from './ember-attacher';
import { computed } from '@ember/object';
import DEFAULTS from '../defaults';

export default EmberAttacher.extend({
  actions: {
    onFoundTarget(target) {
      const oldTarget = this.get('_target');
      if (oldTarget) {
        oldTarget.removeAttribute('aria-describedby');
      }

      this._super(...arguments);

      target.setAttribute('aria-describedby', this.id);
    }
  },

  ariaRole: 'tooltip',

  class: computed({
    get() {
      return this.get('config').tooltipClass || DEFAULTS.tooltipClass;
    },

    set(_key, value) {
      const tooltipClass = this.get('config').tooltipClass || DEFAULTS.tooltipClass;

      return `${tooltipClass} ${value}`;
    }
  }),

  willDestroyElement() {
    this._super(...arguments);

    const target = this.get('_target');
    if (target) {
      target.removeAttribute('aria-describedby');
    }
  }
});
