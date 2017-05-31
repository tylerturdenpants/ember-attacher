import Ember from 'ember';
import layout from '../templates/components/ember-attacher';
import { stripInProduction, warn } from '../-debug/helpers';

const DEFAULTS =  {
  animation: 'fill',
  arrow: false,
  flip: null,
  hideDelay: 0,
  hideDuration: 300,
  hideOn: 'mouseleave blur',
  interactive: false,
  isOffset: false,
  placement: 'top',
  popperClass: null,
  popperContainer: document.body,
  popperOptions: null,
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
          warn('Animation: \'fill\' is not compatible with arrow: true', { id: 70015 });
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
  popperContainer: DEFAULTS.popperContainer,
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

  init() {
    this._super(...arguments);

    let options = Ember.getOwner(this).resolveRegistration('config:environment').emberAttacher;

    // If no emberAttacher hash was found, do nothing
    if (options) {
      let attrs = this.get('attrs') || {};

      for (let key in options) {
        stripInProduction(() => {
          if (!DEFAULTS.hasOwnProperty(key)) {
            warn(`Unknown property given as an ember-attacher default: ${key}`, { id: 700152 });
          }
        });

        // Don't override attrs manually passed into the component
        if (attrs[key] === undefined) {
          this[key] = options[key];
        }
      }
    }
  },

  _modifiers: Ember.computed('arrow', 'flip', 'modifiers', function() {
    // Deep copy the modifiers since we might write to the provided hash
    let modifiers = this.get('modifiers') ? JSON.parse(JSON.stringify(this.get('modifiers'))) : {};

    let arrow = this.get('arrow');
    if (typeof(arrow) === 'boolean') {
      if (!modifiers.arrow) {
        modifiers.arrow = { enabled: arrow };
      } else if (typeof(modifiers.arrow.enbabled) !== 'boolean') {
        modifiers.arrow.enabled = arrow;
      }
    }

    let flipString = this.get('flip');
    if (flipString) {
      if (!modifiers.flip) {
        modifiers.flip = { behavior: flipString.split(' ') };
      } else if (!modifiers.flip.behavior) {
        modifiers.flip.behavior = flipString.split(' ');
      }
    }

    return modifiers;
  })
});
