import Component from '@ember/component';
import layout from '../templates/components/ember-attacher';
import { alias } from '@ember/object/computed';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { stripInProduction } from 'ember-attacher/-debug/helpers';
import { warn } from '@ember/debug';

const DEFAULTS = {
  animation: 'fill',
  arrow: false,
  flip: null,
  hideDelay: 0,
  hideDuration: 300,
  hideOn: 'mouseleave blur',
  interactive: false,
  isOffset: false,
  isShown: false,
  placement: 'top',
  popperClass: null,
  popperContainer: '.ember-application',
  popperOptions: null,
  renderInPlace: false,
  showDelay: 0,
  showDuration: 300,
  showOn: 'mouseenter focus'
};

// TODO(kjb) see if there is a way to only pull generateGuid
import Ember from 'ember';
const { generateGuid } = Ember;

export default Component.extend({
  layout,

  tagName: '',

  /**
   * ================== PUBLIC CONFIG OPTIONS ==================
   */

  animation: DEFAULTS.animation,
  arrow: computed('animation', {
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
  hideDuration: DEFAULTS.hideDuration,
  hideOn: DEFAULTS.hideOn,
  interactive: DEFAULTS.interactive,
  isOffset: DEFAULTS.isOffset,
  isShown: DEFAULTS.isShown,
  placement: DEFAULTS.placement,
  popperClass: DEFAULTS.popperClass,
  popperContainer: DEFAULTS.popperContainer,
  popperOptions: DEFAULTS.popperOptions,
  renderInPlace: DEFAULTS.renderInPlace,
  showDelay: DEFAULTS.showDelay,
  showDuration: DEFAULTS.showDuration,
  showOn: DEFAULTS.showOn,
  target: null,

  /**
   * ================== PRIVATE IMPLEMENTATION DETAILS ==================
   */

  actions: {
    onFoundTarget(target) {
      this.set('_target', target);
    }
  },

  // Part of the Component superclass. isVisible == false sets 'display: none'
  isVisible: alias('renderInPlace'),

  init() {
    this._super(...arguments);

    this.id = this.id || generateGuid();

    let options = getOwner(this).resolveRegistration('config:environment').emberAttacher;

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

  _modifiers: computed('arrow', 'flip', 'modifiers', function() {
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
