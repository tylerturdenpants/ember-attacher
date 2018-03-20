import Component from '@ember/component';
import DEFAULTS from '../defaults';
import layout from '../templates/components/attach-popover';
import { cancel, debounce, later, next, run } from '@ember/runloop';
import { computed, observer } from '@ember/object';
import { getOwner } from '@ember/application';
import { guidFor } from '@ember/object/internals';
import { htmlSafe } from '@ember/string';
import { stripInProduction } from 'ember-attacher/-debug/helpers';
import { warn } from '@ember/debug';

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
  class: DEFAULTS.class,
  hideDelay: DEFAULTS.hideDelay,
  hideDuration: DEFAULTS.hideDuration,
  hideOn: DEFAULTS.hideOn,
  interactive: DEFAULTS.interactive,
  isOffset: DEFAULTS.isOffset,
  isShown: DEFAULTS.isShown,
  lazyRender: DEFAULTS.lazyRender,
  onChange: null,
  placement: DEFAULTS.placement,
  popperContainer: DEFAULTS.popperContainer,
  popperOptions: DEFAULTS.popperOptions,
  popperTarget: null,
  renderInPlace: DEFAULTS.renderInPlace,
  showDelay: DEFAULTS.showDelay,
  showDuration: DEFAULTS.showDuration,
  showOn: DEFAULTS.showOn,

  /**
   * ================== PRIVATE IMPLEMENTATION DETAILS ==================
   */

  actions: {
    // Exposed via the named yield to enable custom hide events
    hide() {
      this._hide();
    },

    registerAPI(api) {
      this._disableEventListeners = api.disableEventListeners;
      this._enableEventListeners = api.enableEventListeners;
      this._popperElement = api.popperElement;
      this._update = api.update;

      if (this._isHidden && !this.isDestroying && !this.isDestroyed) {
        // Hide the attachment until it has been positioned,
        // preventing jank during initial positioning
        this._popperElement.style.visibility = 'hidden';

        // The attachment has no width if initially hidden. This can cause it to be positioned so
        // far to the right that it overflows the screen until enough updates fix its position.
        // We avoid this by positioning initially hidden elements in the top left of the screen.
        // The attachment will then correctly update its position from the first this._show()
        this._popperElement.style.transform = null;

        this._popperElement.style.display = this.get('isShown') ? '' : 'none';
      }
    }
  },

  // The circle element needs a special duration that is slightly faster than the popper's
  // transition, this prevents text from appearing outside the circle as it fills the background
  _circleTransitionDuration: computed('_transitionDuration', function() {
    return htmlSafe(
      `transition-duration: ${Math.round(this.get('_transitionDuration') / 1.25)}ms`
    );
  }),

  _class: computed('class', 'animation', '_isStartingAnimation', function() {
    const showOrHideClass = `ember-attacher-${this.get('_isStartingAnimation') ? 'show' : 'hide'}`;

    return `ember-attacher-${this.get('animation')} ${this.get('class') || ''} ${showOrHideClass}`;
  }),

  // This is memoized so it can be used by both attach-popover and attach-tooltip
  _config: computed(function() {
    return getOwner(this).resolveRegistration('config:environment').emberAttacher || {};
  }),

  _hideOn: computed('hideOn', function() {
    let hideOn = this.get('hideOn');

    if (hideOn === undefined) {
      hideOn = DEFAULTS.hideOn;
    }

    return hideOn === null ? [] : hideOn.split(' ');
  }),

  _modifiers: computed('arrow', 'flip', 'modifiers', function() {
    // Deep copy the modifiers since we might write to the provided hash
    const modifiers
      = this.get('modifiers') ? JSON.parse(JSON.stringify(this.get('modifiers'))) : {};

    const arrow = this.get('arrow');
    if (typeof(arrow) === 'boolean') {
      if (!modifiers.arrow) {
        modifiers.arrow = { enabled: arrow };
      } else if (typeof(modifiers.arrow.enbabled) !== 'boolean') {
        modifiers.arrow.enabled = arrow;
      }
    }

    const flipString = this.get('flip');
    if (flipString) {
      if (!modifiers.flip) {
        modifiers.flip = { behavior: flipString.split(' ') };
      } else if (!modifiers.flip.behavior) {
        modifiers.flip.behavior = flipString.split(' ');
      }
    }

    return modifiers;
  }),

  _setIsVisibleAfterDelay(isVisible, delay) {
    if (!this._popperElement) {
      this._animationTimeout = requestAnimationFrame(() => {
        this._animationTimeout = this._setIsVisibleAfterDelay(isVisible, delay);
      });

      return;
    }
    const onChange = this.get('onChange');

    if (delay) {
      this._delayedVisibilityToggle = later(this, () => {
        this._animationTimeout = requestAnimationFrame(() => {
          if (!this.isDestroyed && !this.isDestroying) {
            this._popperElement.style.display = isVisible ? '' : 'none';

            // Prevent jank by making the attachment invisible until positioned.
            // The visibility style will be toggled by this._startShowAnimation()
            this._popperElement.style.visibility = isVisible ? 'hidden' : '';

            if (onChange) {
              onChange(isVisible);
            }
          }
        });
      }, delay);
    } else {
      this._popperElement.style.display = isVisible ? '' : 'none';

      // Prevent jank by making the attachment invisible until positioned.
      // The visibility style will be toggled by this._startShowAnimation()
      this._popperElement.style.visibility = isVisible ? 'hidden' : '';

      if (onChange) {
        onChange(isVisible);
      }
    }
  },

  _shouldRender: computed.not('lazyRender', function() {
    return !this.get('lazyRender');
  }),

  _showOn: computed('showOn', function() {
    let showOn = this.get('showOn');

    if (showOn === undefined) {
      showOn = DEFAULTS.showOn;
    }

    return showOn === null ? [] : showOn.split(' ');
  }),

  _transitionDuration: 0,

  _transitionDurationCss: computed('_transitionDuration', function() {
    return htmlSafe(`transition-duration: ${this.get('_transitionDuration')}ms`);
  }),

  /**
   * ================== LIFECYCLE HOOKS ==================
   */

  init() {
    this._super(...arguments);

    // Used to determine the attachments initial parent element
    this._parentFinder = self.document ? self.document.createTextNode('') : '';

    // Holds the current popper target so event listeners can be removed if the target changes
    this._currentTarget = null;

    // The debounced _hide() and _show() are stored here so they can be cancelled when necessary
    this._delayedVisibilityToggle = null;

    this.id = this.id || `${guidFor(this)}-popper`;

    // The final source of truth on whether or not all _hide() or _show() actions have completed
    this._isHidden = true;

    // Holds a delayed function to toggle the visibility of the attachment.
    // Used to make sure animations can complete before the attachment is hidden.
    this._animationTimeout = null;

    // Used to store event listeners so they can be removed when necessary.
    this._hideListenersOnDocumentByEvent = {};
    this._hideListenersOnTargetByEvent = {};
    this._showListenersOnTargetByEvent = {};

    // Hacks to make sure event listeners have the right context and are still removable
    this._debouncedHideIfMouseOutsideTargetOrAttachment
      = this._debouncedHideIfMouseOutsideTargetOrAttachment.bind(this);
    this._hide = this._hide.bind(this);
    this._hideAfterDelay = this._hideAfterDelay.bind(this);
    this._hideIfMouseOutsideTargetOrAttachment
      = this._hideIfMouseOutsideTargetOrAttachment.bind(this);
    this._hideOnClickOut = this._hideOnClickOut.bind(this);
    this._hideOnEscapeKey = this._hideOnEscapeKey.bind(this);
    this._hideOnLostFocus = this._hideOnLostFocus.bind(this);
    this._hideOnMouseLeaveTarget = this._hideOnMouseLeaveTarget.bind(this);
    this._show = this._show.bind(this);
    this._showAfterDelay = this._showAfterDelay.bind(this);

    this._setUserSuppliedDefaults();
  },

  _setUserSuppliedDefaults() {
    const defaults = this.get('_config');

    // Exit early if no custom defaults are found
    if (!defaults) {
      return;
    }

    const attrs = this.get('attrs') || {};

    for (const key in defaults) {
      stripInProduction(() => {
        if (!DEFAULTS.hasOwnProperty(key)) {
          warn(`Unknown property given as an ember-attacher default: ${key}`, { id: 700152 });
        }
      });

      // Don't override attrs manually passed into the component
      if (attrs[key] === undefined) {
        this[key] = defaults[key];
      }
    }
  },

  didInsertElement() {
    this._super(...arguments);

    this._initializeAttacher();
  },

  _initializeAttacher() {
    this._removeEventListeners();

    this.set('_currentTarget', this.get('popperTarget') || this._parentFinder.parentNode);

    this._addListenersForShowEvents();

    if (!this._isHidden || this.get('isShown')) {
      this._addListenersForHideEvents();

      // Even if the attachment is already shown, we still want to
      // call this._show() to make sure its position is updated for a potentially new target.
      this._show();
    }
  },

  _addListenersForShowEvents() {
    this.get('_showOn').forEach((event) => {
      this._showListenersOnTargetByEvent[event] = this._showAfterDelay;

      this._currentTarget.addEventListener(event, this._showAfterDelay);
    });
  },

  willDestroyElement() {
    this._super(...arguments);

    cancelAnimationFrame(this._animationTimeout);
    cancel(this._delayedVisibilityToggle);

    this._removeEventListeners();
  },

  _removeEventListeners() {
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      document.removeEventListener(eventType, this._hideListenersOnDocumentByEvent[eventType]);
      delete this._hideListenersOnDocumentByEvent[eventType];
    });

    if (!this._currentTarget) {
      return;
    }

    [this._hideListenersOnTargetByEvent, this._showListenersOnTargetByEvent]
      .forEach((eventToListener) => {
        Object.keys(eventToListener).forEach((event) => {
          this._currentTarget.removeEventListener(event, eventToListener[event]);
        });
      });
  },

  _targetOrTriggersChanged: observer('hideOn', 'showOn', 'popperTarget', function() {
    this._initializeAttacher();
  }),

  _isShownChanged: observer('isShown', function() {
    const isShown = this.get('isShown');

    if (isShown === true && this._isHidden) {
      this._show();

      // Add the hide listeners in the next run loop to avoid conflicts
      // where clicking triggers both an isShown toggle and a clickout.
      next(this, () => this._addListenersForHideEvents());
    } else if (isShown === false && !this._isHidden) {
      this._hide();
    }
  }),

  /**
   * ================== SHOW ATTACHMENT LOGIC ==================
   */

  _showAfterDelay() {
    cancel(this._delayedVisibilityToggle);

    this._addListenersForHideEvents();

    const showDelay = parseInt(this.get('showDelay'));

    this._delayedVisibilityToggle = debounce(this, this._show, showDelay, !showDelay);
  },

  _show() {
    cancelAnimationFrame(this._animationTimeout);

    if (!this._currentTarget) {
      return;
    }

    this.set('_shouldRender', true);

    // Make the attachment visible immediately so transition animations can take place
    this._setIsVisibleAfterDelay(true, 0);

    this._startShowAnimation();
  },

  _startShowAnimation() {
    // Start the show animation on the next cycle so CSS transitions can have an effect.
    // If we start the animation immediately, the transition won't work because
    // `display: none` => `display: ''` is not transition-able.
    // All included animations set opaque: 0, so the attachment is still effectively hidden until
    // the final RAF occurs.
    this._animationTimeout = requestAnimationFrame(() => {
      if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
        return;
      }

      const popperElement = this._popperElement;

      // Wait until the element is visible before continuing
      if (!popperElement || popperElement.style.display === 'none') {
        this._animationTimeout = this._startShowAnimation();

        return;
      }

      this._enableEventListeners();
      this._update();

      // Wait for the above positioning to take effect before starting the show animation,
      // else the positioning itself will be animated, causing animation glitches.
      this._animationTimeout = requestAnimationFrame(() => {
        if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
          return;
        }

        run(() => {
          // Make the popper element visible now that it has been positioned
          popperElement.style.visibility = '';
          this.set('_transitionDuration', parseInt(this.get('showDuration')));
          this.set('_isStartingAnimation', true);
          popperElement.setAttribute('aria-hidden', 'false');
        });

        this._isHidden = false;
      });
    });
  },

  /**
   * ================== HIDE ATTACHMENT LOGIC ==================
   */

  _hideAfterDelay() {
    cancel(this._delayedVisibilityToggle);

    const hideDelay = parseInt(this.get('hideDelay'));

    this._delayedVisibilityToggle = debounce(this, this._hide, hideDelay, !hideDelay);
  },

  _hide() {
    cancelAnimationFrame(this._animationTimeout);

    this._removeListenersForHideEvents();

    this._animationTimeout = requestAnimationFrame(() => {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      const hideDuration = parseInt(this.get('hideDuration'));

      run(() => {
        this.set('_transitionDuration', hideDuration);
        this.set('_isStartingAnimation', false);
        this._popperElement.setAttribute('aria-hidden', 'true');

        // Wait for any animations to complete before hiding the attachment
        this._setIsVisibleAfterDelay(false, hideDuration);
      });

      this._disableEventListeners();

      this._isHidden = true;
    });
  },

  /**
   * ================== HIDE LISTENERS ==================
   */

  _addListenersForHideEvents() {
    const hideOn = this.get('_hideOn');
    const target = this._currentTarget;

    // Target was destroyed
    if (!target) {
      return;
    }

    if (hideOn.indexOf('click') !== -1) {
      const showOnClickListener = this._showListenersOnTargetByEvent.click;

      if (showOnClickListener) {
        target.removeEventListener('click', showOnClickListener);

        delete this._showListenersOnTargetByEvent.click;
      }

      this._hideListenersOnTargetByEvent.click = this._hideAfterDelay;
      target.addEventListener('click', this._hideAfterDelay);
    }

    if (hideOn.indexOf('clickout') !== -1) {
      const clickoutEvent = 'ontouchstart' in window ? 'touchend' : 'click';

      this._hideListenersOnDocumentByEvent[clickoutEvent] = this._hideOnClickOut;
      document.addEventListener(clickoutEvent, this._hideOnClickOut);
    }

    if (hideOn.indexOf('escapekey') !== -1) {
      this._hideListenersOnDocumentByEvent.keydown = this._hideOnEscapeKey;
      document.addEventListener('keydown', this._hideOnEscapeKey);
    }

    // Hides the attachment when the mouse leaves the target
    // (or leaves both target and attachment for interactive attachments)
    if (hideOn.indexOf('mouseleave') !== -1) {
      this._hideListenersOnTargetByEvent.mouseleave = this._hideOnMouseLeaveTarget;
      target.addEventListener('mouseleave', this._hideOnMouseLeaveTarget);
    }

    // Hides the attachment when focus is lost on the target
    ['blur', 'focusout'].forEach((eventType) => {
      if (hideOn.indexOf(eventType) !== -1) {
        this._hideListenersOnTargetByEvent[eventType] = this._hideOnLostFocus;
        target.addEventListener(eventType, this._hideOnLostFocus);
      }
    });
  },

  _hideOnMouseLeaveTarget() {
    if (this.get('interactive')) {
      // TODO(kjb) Should debounce this, but hiding appears sluggish if you debounce.
      //   - If you debounce with immediate fire, you get a bug where you can move out of the
      //   attachment and not trigger the hide because the hide check was debounced
      //   - Ideally we would debounce with an immediate run, then instead of debouncing, we would
      //   queue another fire at the end of the debounce period
      if (!this._hideListenersOnDocumentByEvent.mousemove) {
        this._hideListenersOnDocumentByEvent.mousemove = this._hideIfMouseOutsideTargetOrAttachment;
        document.addEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment);
      }
    } else {
      this._hideAfterDelay();
    }
  },

  _debouncedHideIfMouseOutsideTargetOrAttachment(event) {
    debounce(this, this._hideIfMouseOutsideTargetOrAttachment, event, 10);
  },

  _hideIfMouseOutsideTargetOrAttachment(event) {
    const target = this._currentTarget;

    // If cursor is not on the attachment or target, hide the popper
    if (!target.contains(event.target)
        && !(this.get('isOffset') && this._isCursorBetweenTargetAndAttachment(event))
        && !this._popperElement.contains(event.target)) {
      // Remove this listener before hiding the attachment
      delete this._hideListenersOnDocumentByEvent.mousemove;
      document.removeEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment);

      this._hideAfterDelay();
    }
  },

  _isCursorBetweenTargetAndAttachment(event) {
    const { clientX, clientY } = event;

    const attachmentPosition = this._popperElement.getBoundingClientRect();
    const targetPosition = this._currentTarget.getBoundingClientRect();

    const isBetweenLeftAndRight = clientX > Math.min(attachmentPosition.left, targetPosition.left)
      && clientX < Math.max(attachmentPosition.right, targetPosition.right);

    const isBetweenTopAndBottom = clientY > Math.min(attachmentPosition.top, targetPosition.top)
      && clientY < Math.max(attachmentPosition.bottom, targetPosition.bottom);

    // Check if cursor is between a left-flipped attachment
    if (attachmentPosition.right < targetPosition.left
        && clientX >= attachmentPosition.right && clientX <= targetPosition.left
        && isBetweenTopAndBottom) {
      return true;
    }

    // Check if cursor is between a right-flipped attachment
    if (attachmentPosition.left > targetPosition.right
        && clientX <= attachmentPosition.left && clientX >= targetPosition.right
        && isBetweenTopAndBottom) {
      return true;
    }

    // Check if cursor is between a bottom-flipped attachment
    if (attachmentPosition.top > targetPosition.bottom
        && clientY <= attachmentPosition.top && clientY >= targetPosition.bottom
        && isBetweenLeftAndRight) {
      return true;
    }

    // Check if cursor is between a top-flipped attachment
    if (attachmentPosition.bottom < targetPosition.top
        && clientY >= attachmentPosition.bottom && clientY <= targetPosition.top
        && isBetweenLeftAndRight) {
      return true;
    }

    return false;
  },

  _hideOnClickOut(event) {
    const targetReceivedClick = this._currentTarget.contains(event.target);

    if (this.get('interactive')) {
      if (!targetReceivedClick && !this._popperElement.contains(event.target)) {
        this._hideAfterDelay();
      }
    } else if (!targetReceivedClick) {
      this._hideAfterDelay();
    }
  },

  _hideOnEscapeKey(event) {
    if (event.keyCode === 27) {
      return this._hideAfterDelay();
    }
  },

  _hideOnLostFocus(event) {
    if (event.relatedTarget === null) {
      this._hideAfterDelay();
    }

    const targetContainsFocus = this._currentTarget.contains(event.relatedTarget);

    if (this.get('interactive')) {
      if (!targetContainsFocus && !this._popperElement.contains(event.relatedTarget)) {
        this._hideAfterDelay();
      }
    } else if (!targetContainsFocus) {
      this._hideAfterDelay();
    }
  },

  _removeListenersForHideEvents() {
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      document.removeEventListener(eventType, this._hideListenersOnDocumentByEvent[eventType]);
      delete this._hideListenersOnDocumentByEvent[eventType];
    });

    const showOn = this.get('_showOn');
    const target = this._currentTarget;

    // The target was destroyed, nothing to remove listeners from
    if (!target) {
      return;
    }

    // Switch clicking back to a show event
    if (showOn.indexOf('click') !== -1) {
      const hideOnClickListener = this._hideListenersOnTargetByEvent.click;

      if (hideOnClickListener) {
        target.removeEventListener('click', hideOnClickListener);
        delete this._hideListenersOnTargetByEvent.click;
      }

      this._showListenersOnTargetByEvent.click = this._showAfterDelay;
      target.addEventListener('click', this._showAfterDelay);
    }

    ['blur', 'focusout', 'mouseleave'].forEach((eventType) => {
      const listener = this._hideListenersOnTargetByEvent[eventType];

      if (listener) {
        target.removeEventListener(eventType, listener);
        delete this._hideListenersOnTargetByEvent[eventType];
      }
    });
  }
});
