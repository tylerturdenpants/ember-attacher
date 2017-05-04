import Ember from 'ember';

export default Ember.Service.extend({
  animation: 'fill',
  arrow: false,
  hideDelay: 0,
  hideDuration: 400,
  hideOn: 'mouseleave blur',
  interactive: false,
  placement: 'top',
  renderInPlace: false,
  showDelay: 0,
  showDuration: 400,
  showOn: 'mouseenter focus',
  target: '.target-plz',
});
