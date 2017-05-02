import Ember from 'ember';
import layout from '../templates/components/attachment-example';

export default Ember.Component.extend({
  layout,

  animation: 'perspective',
  animationOptions: [
    'fade',
    'none',
    'perspective',
    'scale',
    'shift'
  ],

  arrow: false,

  hideDelay: 0,

  hideDuration: 400,

  hideOn: 'mouseleave blur',
  hideOnOptions: ['click', 'mouseleave blur'],

  interactive: false,

  placement: 'top',
  placementOptions: ['bottom', 'left', 'right', 'top'],

  renderInPlace: false,

  showDelay: 0,

  showDuration: 400,

  showOn: 'mouseenter focus',
  showOnOptions: ['click', 'mouseenter focus'],

  target: '.target-plz',

  actions: {
    toggleArrow() {
      this.toggleProperty('arrow');
    },

    toggleInteractive() {
      this.toggleProperty('interactive');
    }
  }
});
