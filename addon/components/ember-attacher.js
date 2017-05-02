import Ember from 'ember';
import layout from '../templates/components/ember-attacher';

export default Ember.Component.extend({
  layout,

  /**
   * ================== PUBLIC CONFIG OPTIONS ==================
   */

  animation: 'fade',
  arrow: false,
  hideDelay: 0,
  hideDuration: 400,
  hideOn: 'mouseleave blur',
  interactive: false,
  placement: 'top',
  popperClass: null,
  popperOptions: null,
  renderInPlace: false,
  showDelay: 0,
  showDuration: 400,
  showOn: 'mouseenter focus',
  target: Ember.computed(function() {
    return this.element.parentNode;
  }),

  options: Ember.computed('animation', 'arrow', 'placement', 'popperOptions', function() {
    let options = this.get('popperOptions') || {};

    // Deep copy the options
    options = JSON.parse(JSON.stringify(options))

    let modifiers = options.modifiers || {};
    modifiers.arrow = modifiers.arrow || {};
    modifiers.arrow.enabled = this.get('arrow');

    options.modifiers = modifiers;

    options.placement = this.get('placement');

    return options;
  }),
});
