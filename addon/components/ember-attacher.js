import Ember from 'ember';
import layout from '../templates/components/ember-attacher';
import { stripInProduction, warn } from '../-debug/helpers';

export default Ember.Component.extend({
  layout,

  /**
   * ================== PUBLIC CONFIG OPTIONS ==================
   */

  animation: 'fill',
  arrow: Ember.computed('animation', {
    get() {
      return false;
    },

    set(_, val) {
      stripInProduction(() => {
        if (this.get('animation') === 'fill' && val) {
          warn('Animation: \'fill\' is not compatible with arrow: true', {id: 70015});
        }
      });

      return val;
    }
  }),
  hideDelay: 0,
  hideDuration: 300,
  hideOn: 'mouseleave blur',
  interactive: false,
  placement: 'top',
  popperClass: null,
  popperOptions: null,
  renderInPlace: false,
  showDelay: 0,
  showDuration: 300,
  showOn: 'mouseenter focus',
  target: Ember.computed(function() {
    return this.element.parentNode;
  }),

  /**
   * ================== PRIVATE IMPLEMENTATION DETAILS ==================
   */

  // Part of the Component superclass. isVisible == false sets 'display: none'
  isVisible: Ember.computed.alias('renderInPlace'),

  _options: Ember.computed('animation', 'arrow', 'placement', 'popperOptions', function() {
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
