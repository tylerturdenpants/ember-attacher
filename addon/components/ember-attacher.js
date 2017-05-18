import Ember from 'ember';
import layout from '../templates/components/ember-attacher';
import { stripInProduction, warn } from '../-debug/helpers';

const { get, set, getOwner } = Ember;

const DEFAULTS =  {
  animation: 'fade',
  arrow: false,
  hideDelay: 0,
  hideDuration: 300,
  hideOn: 'mouseleave blur',
  interactive: false,
  isOffset: false,
  placement: 'top',
  popperClass: null,
  popperOptions: null,
  popperContainer: null,
  renderInPlace: false,
  showDelay: 0,
  showDuration: 300,
  showOn: 'mouseenter focus',
}

export default Ember.Component.extend({
  layout,

  /**
   * ================== PUBLIC CONFIG OPTIONS ==================
   */

  animation: DEFAULTS.animation,
  arrow: Ember.computed('animation', {
    get() {
      return DEFAULTS.arrow;
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
  hideDelay: DEFAULTS.hideDelay,
  hideDuration:  DEFAULTS.hideDuration,
  hideOn:  DEFAULTS.hideOn,
  interactive: DEFAULTS.interactive,
  isOffset: DEFAULTS.isOffset,
  placement: DEFAULTS.placement,
  popperClass: DEFAULTS.popperClass,
  popperOptions: DEFAULTS.popperOptions,
  renderInPlace: DEFAULTS.renderInPlace,
  showDelay: DEFAULTS.showDelay,
  showDuration: DEFAULTS.showDuration,
  showOn: DEFAULTS.showOn,
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

  init() {
    this._super(...arguments);

    let config = getOwner(this).resolveRegistration('config:environment')
    let options = config.emberAttacher;

    // If no emberAttacher hash was found, do nothing
    if (options) {
      let attrs = get(this, 'attrs');
      
      for(let key in options) {
        
        // Only known properties are allowed, ignore otherwise
        if (DEFAULTS.hasOwnProperty(key)) {
          
          // Use option from environment, but only if not given as component attribute
          if (attrs[key] === undefined) {
            set(this, key, options[key]);
          }
        }
      }
    }
  }
});
