import Component from '@ember/component';
import layout from '../templates/components/ember-attacher-inner';
import { cancel, debounce, later, next } from '@ember/runloop';
import { computed, observer } from '@ember/object';
import { htmlSafe } from '@ember/string';

export default Component.extend({
  /**
   * ================== PUBLIC CONFIG OPTIONS ==================
   */

  // See ember-attacher.js, which passes all the default values into this component

  /**
   * ================== COMPONENT LIFECYCLE HOOKS ==================
   */

  init() {
    this._super(...arguments);

    // Holds the current popper target so event listeners can be removed if the target changes
    this._currentTarget = null;

    // The debounced _hide() is stored here so it can be cancelled
    // if a _show() is triggered before the _hide() is executed
    this._delayedHide = null;

    // The debounced _show() is stored here so it can be cancelled
    // if a _hide() is triggered before the _show() is executed
    this._delayedShow = null;

    // The final source of truth on whether or not all _hide() or _show() actions have completed
    this._isHidden = true;

    // Holds a delayed function to toggle the visibility of the attachment.
    // Used to make sure animations can complete before the attachment is hidden.
    this._isVisibleTimeout = null;

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
  },

  didInsertElement() {
    this._super(...arguments);

    next(() => {
      // If the attachment is initially hidden it has no width when positioned for the first time.
      // This can cause it to be positioned too far to the right, such that it overflows the screen
      // when shown for the first time.
      // We avoid this issue by removing the initial positioning of attachments which are initially
      // hidden. The attachment will then correctly update its position from this._show()
      if (this._isHidden && !this.isDestroying && !this.isDestroyed) {
        this.element.parentNode.style.transform = null;
      }
    });

    this._initializeAttacher();
  },

  _initializeAttacher() {
    this._removeEventListeners();

    this._currentTarget = this.get('target');

    if (!this._currentTarget) {
      // Hide the attachment until a valid target is found
      if (!this._isHidden) {
        this._hide();
      }

      return;
    }

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

  _targetOrTriggersChanged: observer('hideOn', 'showOn', 'target', function() {
    this._initializeAttacher();
  }),

  _isShownChanged: observer('isShown', function() {
    const isShown = this.get('isShown');

    if (isShown === true && this._isHidden) {
      // Add the hide listeners in the next run loop to avoid conflicts
      // where clicking triggers both an isShown toggle and a clickout.
      next(this, () => this._addListenersForHideEvents());

      this._show();
    } else if (isShown === false && !this._isHidden) {
      this._hide();
    }
  }),

  /**
   * ================== PRIVATE IMPLEMENTATION DETAILS ==================
   */

  classNameBindings: ['_animation', '_isStartingAnimation:ember-attacher-show:ember-attacher-hide'],
  // Part of the Component superclass. isVisible == false sets 'display: none'
  isVisible: false,
  layout,

  _animation: computed('animation', function() {
    return `ember-attacher-${this.get('animation')}`;
  }),
  _hideOn: computed('hideOn', function() {
    return this.get('hideOn').split(' ');
  }),
  _showOn: computed('showOn', function() {
    return this.get('showOn').split(' ');
  }),

  // The circle element needs a special duration that is slightly faster than the popper's
  // transition, this prevents text from appearing outside the circle as it fills the background
  circleTransitionDuration: computed('_transitionDuration', function() {
    return htmlSafe(
      `transition-duration: ${Math.round(this.get('_transitionDuration') / 1.25)}ms`
    );
  }),

  _setIsVisibleAfterDelay(isVisible, delay) {
    cancel(this._isVisibleTimeout);

    const onChange = this.get('onChange');

    if (delay) {
      this._isVisibleTimeout = later(this, () => {
        if (!this.isDestroyed && !this.isDestroying) {
          this.set('isVisible', isVisible);

          if (onChange) {
            onChange(isVisible);
          }
        }
      }, delay);
    } else {
      this.set('isVisible', isVisible);

      if (onChange) {
        onChange(isVisible);
      }
    }
  },

  /**
   * ================== SHOW ATTACHMENT LOGIC ==================
   */

  _showAfterDelay() {
    cancel(this._delayedHide);

    // The attachment is already visible
    if (!this._isHidden) {
      return;
    }

    this._addListenersForHideEvents();

    const showDelay = parseInt(this.get('showDelay'));

    this._delayedShow = debounce(this, this._show, showDelay, !showDelay);
  },

  _show() {
    cancel(this._isVisibleTimeout);

    const target = this._currentTarget;

    // The target was destroyed
    if (!target) {
      return;
    }

    // Make the attachment visible immediately so transition animations can take place
    this._setIsVisibleAfterDelay(true, 0);

    this.get('scheduleUpdate')();

    this.get('enableEventListeners')();

    // Start the show animation on the next cycle so CSS transitions can have an effect
    // If we start the animation immediately, the transition won't work because isVisible will
    // turn on the same time as our show animation, and `display: none` => `display: anythingElse`
    // is not transition-able
    next(this, () => {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      this.get('scheduleUpdate')();

      const showDuration = parseInt(this.get('showDuration'));

      this.element.style.transitionDuration = `${showDuration}ms`;
      this.set('_transitionDuration', showDuration);

      this.set('_isStartingAnimation', true);
    });

    this._isHidden = false;
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
      this._hideListenersOnDocumentByEvent.click = this._hideOnClickOut;
      document.addEventListener('click', this._hideOnClickOut);
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

    // If cursor is not on the attachment or target, hide the element
    if (!target.contains(event.target)
        && !(this.get('isOffset') && this._isCursorBetweenTargetAndAttachment(event))
        // The ember-attacher-inner element is wrapped in the ember-attacher element
        && !this.element.parentNode.contains(event.target)) {
      // Remove this listener before hiding the attachment
      delete this._hideListenersOnDocumentByEvent.mousemove;
      document.removeEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment);

      this._hideAfterDelay();
    }
  },

  _isCursorBetweenTargetAndAttachment(event) {
    const { clientX, clientY } = event;

    const attachmentPosition = this.element.getBoundingClientRect();
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
      if (!targetReceivedClick && !this.element.contains(event.target)) {
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
      if (!targetContainsFocus && !this.element.contains(event.relatedTarget)) {
        this._hideAfterDelay();
      }
    } else if (!targetContainsFocus) {
      this._hideAfterDelay();
    }
  },

  /**
   * ================== HIDE ATTACHMENT LOGIC ==================
   */

  _hideAfterDelay() {
    cancel(this._delayedShow);

    // The attachment is already hidden
    if (this._isHidden) {
      return;
    }

    const hideDelay = parseInt(this.get('hideDelay'));

    this._delayedHide = debounce(this, this._hide, hideDelay, !hideDelay);
  },

  _hide() {
    cancel(this._isVisibleTimeout);

    this._removeListenersForHideEvents();

    const hideDuration = parseInt(this.get('hideDuration'));

    this.element.style.transitionDuration = `${hideDuration}ms`;
    this.set('_transitionDuration', hideDuration);

    this.set('_isStartingAnimation', false);

    // Wait for any animations to complete before hiding the attachment
    this._setIsVisibleAfterDelay(false, hideDuration);

    this.get('disableEventListeners')();

    this._isHidden = true;
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
  },

  actions: {
    // Exposed via the named yield to enable custom hide events
    hide() {
      this._hide();
    }
  }
});
