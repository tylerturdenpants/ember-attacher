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
    this.placementOptions = [
      'bottom', 'bottom-start', 'bottom-end',
      'left', 'left-start', 'left-end',
      'right', 'right-start', 'right-end',
      'top', 'top-start', 'top-end',
    ];
    this.showOnOptions = ['click', 'mouseenter focus'];
  },

  isConfiguringTooltip: true,

  service: computed('isConfiguringTooltip', function() {
    return this.isConfiguringTooltip ? this.tooltipData : this.popoverData;
  }),

  actions: {
    log(api) {
      /* eslint-disable no-console */
      console.log('registerAPI called with arg:');
      console.dir(api);
    },

    toggleArrow() {
      this.service.toggleProperty('arrow');
    },

    toggleInteractive() {
      this.service.toggleProperty('interactive');
    },

    toggleIsShown() {
      this.service.toggleProperty('isShown');
    },

    toggleLazyRender() {
      this.service.toggleProperty('lazyRender');
    },

    toggleRenderInPlace() {
      this.service.toggleProperty('renderInPlace');
    },

    setIsConfiguringTooltip(bool) {
      this.set('isConfiguringTooltip', bool);
    }
  }
});
