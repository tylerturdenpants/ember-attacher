import Ember from 'ember';

export default Ember.Service.extend({
  animation: 'fill',
  arrow: false,
  hideDelay: 0,
  hideDuration: 300,
  hideOn: 'mouseleave blur',
  interactive: false,
  isShown: false,
  placement: 'top',
  renderInPlace: false,
  showDelay: 0,
  showDuration: 300,
  showOn: 'mouseenter focus',
});
