import Ember from 'ember';
import EmberPopper from 'ember-popper/components/ember-popper';
import layout from '../templates/components/ember-attacher';

export default EmberPopper.extend({

  /**
   * ================== PUBLIC CONFIG OPTIONS ==================
   */

  animation: 'fade-in',
  // TODO(kjb) figure out how to pass this into the options.
  arrow: false,
  hideDelay: 0,
  hideDuration: 400,
  interactive: false,
  hideOn: 'mouseleave blur',
  showDelay: 0,
  showDuration: 400,
  showOn: 'mouseenter focus',

  /**
   * ================== PRIVATE IMPLEMENTATION DETAILS ==================
   */

  classNameBindings: ['_animation', 'isStartingAnimation:ember-attacher-show:ember-attacher-hide'],
  // Part of the Component superclass. isVisible == false sets 'display: none'
  isVisible: false,
  layout,

  _animation: Ember.computed('animation', function() {
    return `ember-attacher-${this.get('animation')}`;
  }),
  _hideOn: Ember.computed('hideOn', function() {
    return this.get('hideOn').split(' ');
  }),
  _showOn: Ember.computed('showOn', function() {
    return this.get('showOn').split(' ');
  }),

  _setIsVisibleAfterDelay(isVisible, delay) {
    Ember.run.cancel(this.isVisibleTimeout);

    if (delay) {
      this.isVisibleTimeout =
        Ember.run.later(this, () => { this.set('isVisible', isVisible) }, delay);
    } else {
      this.set('isVisible', isVisible);
    }
  },

  _targetOrTriggersChanged: Ember.observer(
    'target',
    'showOn',
    'hideOn',
    function() {
      this._removeEventListeners();

      // Regardless of whether or not the attachment is hidden, we want to add the show listeners
      this._addListenersForShowEvents();

      if (!this.isVisible) {
        this._addListenersforHideEvents();
      }
    }
  ),

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

    // Holds a delayed function to toggle the visibility of the attachment.
    // Used to make sure animations can complete before the attachment is hidden.
    this.isVisibleTimeout = null;

    this._showListenersOnTargetByEvent = {};
    this._hideListenersOnTargetByEvent = {};

    // Hacks to make sure event listeners have the right context and are still cancellable later
    this._hideIfMouseOutsideTargetOrAttachment =
      this._hideIfMouseOutsideTargetOrAttachment.bind(this);
    this._debouncedHideIfMouseOutsideTargetOrAttachment =
      this._debouncedHideIfMouseOutsideTargetOrAttachment.bind(this);
    this._hideOnBlur = this._hideOnBlur.bind(this);
    this._hideOnMouseLeaveTarget = this._hideOnMouseLeaveTarget.bind(this);
    this._hideAfterDelay = this._hideAfterDelay.bind(this);
    this._showAfterDelay = this._showAfterDelay.bind(this);
    this._show = this._show.bind(this);
    this._hide = this._hide.bind(this);
  },

  didInsertElement() {
    this._super(...arguments);

    this._addListenersForShowEvents();
  },

  _addListenersForShowEvents() {
    let target = this.get('_popperTarget');
    let showOn = this.get('_showOn');

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
    let target = this._currentTarget;

    [this._hideListenersOnTargetByEvent, this._showListenersOnTargetByEvent]
      .forEach(eventToListener => {
        Object.keys(eventToListener).forEach(event =>  {
          eventToListener[event].forEach(listener => {
            target.removeEventListener(event, listener);
          });
        });
      });
  },

  /**
   * ================== SHOW ATTACHMENT LOGIC ==================
   */

  _showAfterDelay() {
    Ember.run.cancel(this._delayedHide);
    Ember.run.cancel(this.isVisibleTimeout);

    this._delayedShow = Ember.run.debounce(this, this._show, this.get('showDelay'));
  },

  _show() {
    let target = this.get('_popperTarget');

    // The attachment is already visible or the target has been destroyed
    if ((this.isVisible && this.isStartingAnimation) || !target) {
      return;
    }

    // Interactive tooltips receive a class of 'active'
    if (this.get('interactive')) {
      target.classList.add('active')
    }

    this._addListenersforHideEvents();

    // Make the attachment visible immediately so transition animations can take place
    this._setIsVisibleAfterDelay(true, 0);

    this._popper.update();
    this._popper.enableEventListeners();

    // Have to start the animation on the next cycle so CSS transitions can have an effect
    Ember.run.next(this, () => {
      let showDurationCss = `${this.get('showDuration')}ms`;
      this.element.style.WebkitTransitionDuration = showDurationCss;
      this.element.style.transitionDuration = showDurationCss;

      this.set('isStartingAnimation', true);
    });
  },

  _addListenersforHideEvents() {
    let hideOn = this.get('_hideOn');
    let target = this.get('_popperTarget');

    if (hideOn.indexOf('click') !== -1) {
      let showOnClickListener = this._showListenersOnTargetByEvent['click'];

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
      this._hideListenersOnTargetByEvent['blur'] = this._hideOnBlur;
      target.addEventListener('blur', this._hideOnBlur);
    }
  },

  _hideOnMouseLeaveTarget() {
    if (this.get('interactive')) {
      // TODO(kjb) Consider storing this somewhere and removing it if onHide or target changes
      // TODO(kjb) Should debounce this, but hiding appears sluggish if you debounce.
      //   - If you debounce with immediate fire, you get a bug where you can move out of the
      //   attachment and not trigger the hide because the hide check was debounced
      //   - Ideally we would debounce with an immediate run, then instead of debouncing, we would
      //   queue another fire at the end of the debounce period
      document.addEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment)
    } else {
      this._hideAfterDelay();
    }
  },

  _debouncedHideIfMouseOutsideTargetOrAttachment(event) {
    Ember.run.debounce(this, this._hideIfMouseOutsideTargetOrAttachment, event, 10)
  },

  _hideIfMouseOutsideTargetOrAttachment(event) {
    let target = this.get('_popperTarget');

    // If cursor is not on the attachment or target, hide the element
    if (!this.element.contains(event.target)
        && !target.contains(event.target)
        && !this._isCursorBetweenTargetAndAttachment(event)) {
      // Remove this listener before hiding the attachment
      document.removeEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment);

      target.classList.remove('active');

      this._hideAfterDelay();
    }
  },

  _isCursorBetweenTargetAndAttachment(event) {
    let {clientX, clientY} = event;

    let attachmentPosition = this.element.getBoundingClientRect();
    let targetPosition = this.get('_popperTarget').getBoundingClientRect();

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

  // TODO(kjb) fix this for touch users
  _hideOnBlur(event) {
    if (event.relatedTarget) {
      if (!this._isWithinElement(this.element, event.relatedTarget)) {
        this._hideAfterDelay();
      }
    }
  },

  /**
   * ================== HIDE ATTACHMENT LOGIC ==================
   */

  _hideAfterDelay() {
    Ember.run.cancel(this._delayedShow);
    Ember.run.cancel(this.isVisibleTimeout);

    this._delayedHide = Ember.run.debounce(this, this._hide, this.get('hideDelay'));
  },

  _hide() {
    let target = this.get('_popperTarget');

    // The attachment is already hidden or the target was destroyed
    if (!this.isVisible || !target) {
      return;
    }

    this._removeListenersForHideEvents();

    let hideDuration = this.get('hideDuration');

    let hideDuratioCss = `${hideDuration}ms`;
    this.element.style.WebkitTransitionDuration = hideDuratioCss;
    this.element.style.transitionDuration = hideDuratioCss;

    this.set('isStartingAnimation', false);

    // Wait for any animations to complete before hiding the attachment
    this._setIsVisibleAfterDelay(false, hideDuration);

    this._popper.disableEventListeners();
  },

  _removeListenersForHideEvents() {
    let target = this.get('_popperTarget');
    let showOn = this.get('_showOn');

    // Switch clicking back to a show event
    if (showOn.indexOf('click') !== -1) {
      let hideOnClickListener = this._hideListenersOnTargetByEvent['click'];

      if (hideOnClickListener) {
        target.removeEventListener('click', hideOnClickListener);
        delete this._hideListenersOnTargetByEvent['click'];
      }

      this._showListenersOnTargetByEvent['click'] = this._showAfterDelay;
      target.addEventListener('click', this._showAfterDelay);
    }

    let hideOnMouseleaveListener = this._hideListenersOnTargetByEvent['mouseleave'];

    if (hideOnMouseleaveListener) {
      target.removeEventListener('mouseleave', hideOnMouseleaveListener);
      delete this._hideListenersOnTargetByEvent['mouseleave'];
    }

    let hideOnBlurListener = this._hideListenersOnTargetByEvent['blur'];

    if (hideOnBlurListener) {
      target.removeEventListener('blur', hideOnBlurListener);
      delete this._hideListenersOnTargetByEvent['blur'];
    }
  },
});
