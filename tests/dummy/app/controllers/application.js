import Ember from 'ember';

export default Ember.Controller.extend({
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

  showDelay: 0,

  showDuration: 400,

  showOn: 'mouseenter focus',
  showOnOptions: ['click', 'mouseenter focus'],

  actions: {
    toggleArrow() {
      this.toggleProperty('arrow');
    },

    toggleInteractive() {
      this.toggleProperty('interactive');
    }
  }
});
