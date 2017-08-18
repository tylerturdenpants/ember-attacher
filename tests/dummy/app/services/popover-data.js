import Ember from 'ember';

export default Ember.Service.extend({
  animation: 'shift',
  arrow: false,
  hideDelay: 0,
  hideDuration: 300,
  hideOn: 'click',
  interactive: false,
  isShown: false,
  placement: 'top',
  renderInPlace: false,
  showDelay: 0,
  showDuration: 300,
  showOn: 'click',
  target: '.target-plz',
});
