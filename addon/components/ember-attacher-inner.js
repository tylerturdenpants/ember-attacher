import { cancel, debounce, later, next } from '@ember/runloop';
import { computed, observer } from '@ember/object';
import Component from '@ember/component';
import { assert } from '@ember/debug';
import { htmlSafe } from '@ember/string';
import layout from '../templates/components/ember-attacher-inner';

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

    this._showListenersOnTargetByEvent = {};
    this._hideListenersOnTargetByEvent = {};

    // Hacks to make sure event listeners have the right context and are still cancellable later
    this._hideIfMouseOutsideTargetOrAttachment =
      this._hideIfMouseOutsideTargetOrAttachment.bind(this);
    this._debouncedHideIfMouseOutsideTargetOrAttachment =
      this._debouncedHideIfMouseOutsideTargetOrAttachment.bind(this);
    this._hideOnLostFocus = this._hideOnLostFocus.bind(this);
    this._hideOnMouseLeaveTarget = this._hideOnMouseLeaveTarget.bind(this);
    this._hideAfterDelay = this._hideAfterDelay.bind(this);
    this._showAfterDelay = this._showAfterDelay.bind(this);
    this._show = this._show.bind(this);
    this._hide = this._hide.bind(this);
  },

  didInsertElement() {
    this._super(...arguments);

    // The Popper does not exist until after the element has been inserted
    next(() => {
      this._addListenersForShowEvents();

      if (this.get('isVisible') && this.get('_target')) {
        this._addListenersforHideEvents();

        this._show();
      } else {
        // When we first render the popper, it has no width if isVisible is false. This can cause
        // the popper to be positioned too far to the right, such that when it expands, it will
        // become larger than its parent. This, in turn, causes the parent to expand to accommodate
        // the popper, which may now be off screen. To get around this, we just remove the
        // positioning from the element to the safest position available: 0x0. The popper will then
        // update its position from this._show()
        this.element.parentNode.style.transform = null;
      }
    });
  },

  _addListenersForShowEvents() {
    const target = this.get('_target');
    const showOn = this.get('_showOn');

    if (!target) {
      return;
    }

    this._currentTarget = target;

    showOn.forEach(event => {
      this._showListenersOnTargetByEvent[event] = this._showAfterDelay;

      target.addEventListener(event, this._showAfterDelay);
    });
  },

  willDestroyElement() {
    this._super(...arguments);

    this._removeEventListeners();
  },

  _removeEventListeners() {
    document.removeEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment);

    const target = this._currentTarget;

    [this._hideListenersOnTargetByEvent, this._showListenersOnTargetByEvent]
      .forEach(eventToListener => {
        Object.keys(eventToListener).forEach(event => {
          target.removeEventListener(event, eventToListener[event]);
        });
      });
  },

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
  _target: computed('target', function() {
    const target = this.get('target');

    let popperTarget;

    // If there is no target, set the target to the parent element
    if (!target) {
      popperTarget = this._initialParentNode;
    } else if (target instanceof Element) {
      popperTarget = target;
    } else {
      const nodes = document.querySelectorAll(target);

      assert(`ember-attacher with target selector "${target}" found ${nodes.length}`
        + 'possible targets when there should be exactly 1', nodes.length === 1);

      popperTarget = nodes[0];
    }

    return popperTarget;
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

    if (delay) {
      this._isVisibleTimeout =
        later(this, () => {
          if (!this.isDestroyed && !this.isDestroying) {
            this.set('isVisible', isVisible);
          }
        }, delay);
    } else {
      this.set('isVisible', isVisible);
    }
  },

  _targetOrTriggersChanged: observer(
    'hideOn',
    'showOn',
    'target',
    function() {
      this._removeEventListeners();

      // Regardless of whether or not the attachment is hidden, we want to add the show listeners
      this._addListenersForShowEvents();

      if (!this._isHidden) {
        this._addListenersforHideEvents();
      }
    }
  ),

  /**
   * ================== SHOW ATTACHMENT LOGIC ==================
   */

  _showAfterDelay() {
    cancel(this._delayedHide);
    cancel(this._isVisibleTimeout);

    // The attachment is already visible or the target has been destroyed
    if (!this._isHidden || !this.get('_target')) {
      return;
    }

    this._addListenersforHideEvents();

    const showDelay = parseInt(this.get('showDelay'));

    this._delayedShow = debounce(this, this._show, showDelay, !showDelay);
  },

  _show() {
    // The target of interactive tooltips receive the 'active' class
    if (this.get('interactive')) {
      this.get('_target').classList.add('active');
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
      const showDuration = parseInt(this.get('showDuration'));

      this.element.style.transitionDuration = `${showDuration}ms`;
      this.set('_transitionDuration', showDuration);

      this.set('_isStartingAnimation', true);
    });

    this._isHidden = false;
  },

  _addListenersforHideEvents() {
    const hideOn = this.get('_hideOn');
    const target = this.get('_target');

    if (hideOn.indexOf('click') !== -1) {
      const showOnClickListener = this._showListenersOnTargetByEvent['click'];

      if (showOnClickListener) {
        target.removeEventListener('click', showOnClickListener);

        delete this._showListenersOnTargetByEvent['click'];
      }

      this._hideListenersOnTargetByEvent['click'] = this._hideAfterDelay;
      target.addEventListener('click', this._hideAfterDelay);
    }

    // Hides the attachment when the mouse leaves the target
    // (or leaves both target and attachment for interactive attachments)
    if (hideOn.indexOf('mouseleave') !== -1) {
      this._hideListenersOnTargetByEvent['mouseleave'] = this._hideOnMouseLeaveTarget;
      target.addEventListener('mouseleave', this._hideOnMouseLeaveTarget);
    }

    // Hides the attachment when focus is lost on the target
    if (hideOn.indexOf('blur') !== -1) {
      this._hideListenersOnTargetByEvent['blur'] = this._hideOnLostFocus;
      target.addEventListener('blur', this._hideOnLostFocus);
    }

    if (hideOn.indexOf('focusout') !== -1) {
      this._hideListenersOnTargetByEvent['focusout'] = this._hideOnLostFocus;
      target.addEventListener('focusout', this._hideOnLostFocus);
    }
  },

  _hideOnMouseLeaveTarget() {
    if (this.get('interactive')) {
      // TODO(kjb) Should debounce this, but hiding appears sluggish if you debounce.
      //   - If you debounce with immediate fire, you get a bug where you can move out of the
      //   attachment and not trigger the hide because the hide check was debounced
      //   - Ideally we would debounce with an immediate run, then instead of debouncing, we would
      //   queue another fire at the end of the debounce period
      document.addEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment);
    } else {
      this._hideAfterDelay();
    }
  },

  _debouncedHideIfMouseOutsideTargetOrAttachment(event) {
    debounce(this, this._hideIfMouseOutsideTargetOrAttachment, event, 10);
  },

  _hideIfMouseOutsideTargetOrAttachment(event) {
    const target = this.get('_target');

    // If cursor is not on the attachment or target, hide the element
    if (!target.contains(event.target)
      && !(this.get('isOffset') && this._isCursorBetweenTargetAndAttachment(event))
      // The ember-attacher-inner element is wrapped in the ember-attacher element
      && !this.element.parentNode.contains(event.target)) {
      // Remove this listener before hiding the attachment
      document.removeEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment);

      target.classList.remove('active');

      this._hideAfterDelay();
    }
  },

  _isCursorBetweenTargetAndAttachment(event) {
    const { clientX, clientY } = event;

    const attachmentPosition = this.element.getBoundingClientRect();
    const targetPosition = this.get('_target').getBoundingClientRect();

    // Check if cursor is between a left-flipped attachment
    if (attachmentPosition.right < targetPosition.left
      && clientX >= attachmentPosition.right && clientX <= targetPosition.left
      && clientY > Math.min(attachmentPosition.top, targetPosition.top)
      && clientY < Math.max(attachmentPosition.bottom, targetPosition.bottom)) {
      return true;
    }

    // Check if cursor is between a right-flipped attachment
    if (attachmentPosition.left > targetPosition.right
      && clientX <= attachmentPosition.left && clientX >= targetPosition.right
      && clientY > Math.min(attachmentPosition.top, targetPosition.top)
      && clientY < Math.max(attachmentPosition.bottom, targetPosition.bottom)) {
      return true;
    }

    // Check if cursor is between a bottom-flipped attachment
    if (attachmentPosition.top > targetPosition.bottom
      && clientY <= attachmentPosition.top && clientY >= targetPosition.bottom
      && clientX > Math.min(attachmentPosition.left, targetPosition.left)
      && clientX < Math.max(attachmentPosition.right, targetPosition.right)) {
      return true;
    }

    // Check if cursor is between a top-flipped attachment
    if (attachmentPosition.bottom < targetPosition.top
      && clientY >= attachmentPosition.bottom && clientY <= targetPosition.top
      && clientX > Math.min(attachmentPosition.left, targetPosition.left)
      && clientX < Math.max(attachmentPosition.right, targetPosition.right)) {
      return true;
    }

    return false;
  },

  _hideOnLostFocus(event) {
    if (event.relatedTarget === null
      || (!this.get('_target').contains(event.relatedTarget)
      && !this.element.contains(event.relatedTarget))) {
      this._hideAfterDelay();
    }
  },

  /**
   * ================== HIDE ATTACHMENT LOGIC ==================
   */

  _hideAfterDelay() {
    cancel(this._delayedShow);
    cancel(this._isVisibleTimeout);

    // The attachment is already hidden or the target was destroyed
    if (this._isHidden || !this.get('_target')) {
      return;
    }

    const hideDelay = parseInt(this.get('hideDelay'));

    this._delayedHide = debounce(this, this._hide, hideDelay, !hideDelay);
  },

  _hide() {
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
    const target = this.get('_target');
    const showOn = this.get('_showOn');

    // Switch clicking back to a show event
    if (showOn.indexOf('click') !== -1) {
      const hideOnClickListener = this._hideListenersOnTargetByEvent['click'];

      if (hideOnClickListener) {
        target.removeEventListener('click', hideOnClickListener);
        delete this._hideListenersOnTargetByEvent['click'];
      }

      this._showListenersOnTargetByEvent['click'] = this._showAfterDelay;
      target.addEventListener('click', this._showAfterDelay);
    }

    const hideOnMouseleaveListener = this._hideListenersOnTargetByEvent['mouseleave'];

    if (hideOnMouseleaveListener) {
      target.removeEventListener('mouseleave', hideOnMouseleaveListener);
      delete this._hideListenersOnTargetByEvent['mouseleave'];
    }

    const hideOnBlurListener = this._hideListenersOnTargetByEvent['blur'];

    if (hideOnBlurListener) {
      target.removeEventListener('blur', hideOnBlurListener);
      delete this._hideListenersOnTargetByEvent['blur'];
    }

    const hideOnFocusOutListener = this._hideListenersOnTargetByEvent['focusout'];

    if (hideOnFocusOutListener) {
      target.removeEventListener('focusout', hideOnFocusOutListener);
      delete this._hideListenersOnTargetByEvent['focusout'];
    }
  },

  actions: {
    // Exposed via the named yield to enable custom hide events
    hide() {
      this._hide();
    }
  }
});
