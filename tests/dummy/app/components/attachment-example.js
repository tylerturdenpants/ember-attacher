import Component from '@ember/component';
import { computed } from '@ember/object';
import layout from '../templates/components/attachment-example';
import { inject as service } from '@ember/service';

export default Component.extend({
  layout,
  popoverData: service(),
  tooltipData: service(),

  animationOptions: [
    'fade',
    'fill',
    'none',
    'perspective',
    'scale',
    'shift'
  ],
  hideOnOptions: ['click', 'clickout', 'escapekey', 'mouseleave blur'],
  isConfiguringTooltip: true,
  placementOptions: ['bottom', 'left', 'right', 'top'],
  showOnOptions: ['click', 'mouseenter focus'],

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

    toggleRenderInPlace() {
      this.get('service').toggleProperty('renderInPlace');
    },

    setIsConfiguringTooltip(bool) {
      this.set('isConfiguringTooltip', bool);
    }
  }
});
