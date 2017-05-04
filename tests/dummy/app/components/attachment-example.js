import Ember from 'ember';
import layout from '../templates/components/attachment-example';

export default Ember.Component.extend({
  layout,
  popoverData: Ember.inject.service(),
  tooltipData: Ember.inject.service(),

  animationOptions: [
    'fade',
    'fill',
    'none',
    'perspective',
    'scale',
    'shift'
  ],

  hideOnOptions: ['click', 'mouseleave blur'],

  isConfiguringTooltip: true,

  placementOptions: ['bottom', 'left', 'right', 'top'],

  service: Ember.computed('isConfiguringTooltip', function() {
    return this.get('isConfiguringTooltip') ? this.get('tooltipData') : this.get('popoverData');
  }),

  showOnOptions: ['click', 'mouseenter focus'],

  actions: {
    toggleArrow() {
      this.get('service').toggleProperty('arrow');
    },

    toggleInteractive() {
      this.get('service').toggleProperty('interactive');
    },

    setIsConfiguringTooltip(bool) {
      this.set('isConfiguringTooltip', bool);
    }
  }
});
