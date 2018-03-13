import Component from '@ember/component';
import { computed } from '@ember/object';
import layout from '../templates/components/attachment-example';
import { inject as service } from '@ember/service';

export default Component.extend({
  layout,
  popoverData: service(),
  tooltipData: service(),

  init() {
    this._super(...arguments);

    this.animationOptions = [
      'fade',
      'fill',
      'none',
      'perspective',
      'scale',
      'shift'
    ];
    this.hideOnOptions = ['click', 'clickout', 'mouseleave blur escapekey'];
    this.placementOptions = ['bottom', 'left', 'right', 'top'];
    this.showOnOptions = ['click', 'mouseenter focus'];
  },

  isConfiguringTooltip: true,

  service: computed('isConfiguringTooltip', function() {
    return this.get('isConfiguringTooltip') ? this.get('tooltipData') : this.get('popoverData');
  }),

  actions: {
    toggleArrow() {
      this.get('service').toggleProperty('arrow');
    },

    toggleInteractive() {
      this.get('service').toggleProperty('interactive');
    },

    toggleIsShown() {
      this.get('service').toggleProperty('isShown');
    },

    toggleLazyRender() {
      this.get('service').toggleProperty('lazyRender');
    },

    toggleRenderInPlace() {
      this.get('service').toggleProperty('renderInPlace');
    },

    setIsConfiguringTooltip(bool) {
      this.set('isConfiguringTooltip', bool);
    }
  }
});
