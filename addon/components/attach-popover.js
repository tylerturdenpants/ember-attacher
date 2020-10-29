import classic from 'ember-classic-decorator';
import { tagName, layout as templateLayout } from '@ember-decorators/component';
import { observes } from '@ember-decorators/object';
import { action, computed } from '@ember/object';
import Component from '@ember/component';
import DEFAULTS from '../defaults';
import layout from '../templates/components/attach-popover';
import { cancel, debounce, later, next, run } from '@ember/runloop';
import { getOwner } from '@ember/application';
import { guidFor } from '@ember/object/internals';
import { htmlSafe, isHTMLSafe } from '@ember/string';
import { stripInProduction } from 'ember-attacher/-debug/helpers';
import { warn } from '@ember/debug';
import { isEmpty } from '@ember/utils';

@classic
@templateLayout(layout)
@tagName('')
export default class AttachPopover extends Component {
  configKey = 'popover';
  /**
   * ================== PUBLIC CONFIG OPTIONS ==================
   */

  animation = DEFAULTS.animation;

  arrow = DEFAULTS.arrow;
  flip = DEFAULTS.flip;
  hideDelay = DEFAULTS.hideDelay;
  hideDuration = DEFAULTS.hideDuration;
  hideOn = DEFAULTS.hideOn;
  interactive = DEFAULTS.interactive;
  isOffset = DEFAULTS.isOffset;
  isShown = DEFAULTS.isShown;
  lazyRender = DEFAULTS.lazyRender;
  onChange = null;
  placement = DEFAULTS.placement;
  popperContainer = DEFAULTS.popperContainer;
  popperOptions = DEFAULTS.popperOptions;
  popperTarget = null;
  renderInPlace = DEFAULTS.renderInPlace;
  showDelay = DEFAULTS.showDelay;
  showDuration = DEFAULTS.showDuration;
  showOn = DEFAULTS.showOn;
  style = DEFAULTS.style;
  useCapture = DEFAULTS.useCapture;

  // Exposed via the named yield to enable custom hide events
  @action
  hide() {
    this._hide();
  }

  @action
  _registerAPI(api) {
    this._disableEventListeners = api.disableEventListeners;
    this._enableEventListeners = api.enableEventListeners;
    this._popperElement = api.popperElement;
    this._update = api.update;

    if (!this.isDestroying && !this.isDestroyed) {
      if (this.registerAPI !== undefined) {
        this.registerAPI(api);
      }

      if (this._isHidden) {
        // Hide the attachment until it has been positioned,
        // preventing jank during initial positioning
        this._popperElement.style.visibility = 'hidden';

        // The attachment has no width if initially hidden. This can cause it to be positioned so
        // far to the right that it overflows the screen until enough updates fix its position.
        // We avoid this by positioning initially hidden elements in the top left of the screen.
        // The attachment will then correctly update its position from the first this._show()
        this._popperElement.style.transform = null;

        this._popperElement.style.display = this.isShown ? '' : 'none';
      }
    }
  }

  // The circle element needs a special duration that is slightly faster than the popper's
  // transition, this prevents text from appearing outside the circle as it fills the background
  @computed('_transitionDuration')
  get _circleTransitionDuration() {
    return htmlSafe(
      `transition-duration: ${Math.round(this._transitionDuration / 1.25)}ms`
    );
  }

  @computed('class', 'arrow', 'animation', '_isStartingAnimation')
  get _class() {
    const showOrHideClass = `ember-attacher-${this._isStartingAnimation ? 'show' : 'hide'}`;
    const arrowClass = `ember-attacher-${this.arrow ? 'with' : 'without'}-arrow`;

    return `ember-attacher-${this.animation} ${this.class || ''} ${showOrHideClass} ${arrowClass}`;
  }

  @computed('style', '_transitionDuration')
  get _style() {
    const style = this.style;
    const transitionDuration = this._transitionDuration;
    warn(
      '@ember/string/htmlSafe must be used for any `style` passed to ember-attacher',
      isEmpty(style) || isHTMLSafe(style),
      { id: 'ember-attacher-require-html-safe-style' }
    );

    return htmlSafe(`transition-duration: ${transitionDuration}ms; ${style}`);
  }

  // This is memoized so it can be used by both attach-popover and attach-tooltip
  get _envConfig() {
    return getOwner(this).resolveRegistration('config:environment').emberAttacher || {};
  }

  @computed('_envConfig', 'configKey')
  get _config() {
    return this._envConfig[this.configKey] || this._envConfig

  }

  @computed('hideOn')
  get _hideOn() {
    let hideOn = this.hideOn;

    if (hideOn === undefined) {
      hideOn = DEFAULTS.hideOn;
    }

    return hideOn === null ? [] : hideOn.split(' ');
  }

  @computed('arrow', 'flip', 'modifiers')
  get _modifiers() {
    // Copy the modifiers since we might write to the provided hash
    const modifiers
      = this.modifiers ? Object.assign({}, this.modifiers) : {};

    const arrow = this.arrow;
    if (typeof(arrow) === 'boolean' && !modifiers.arrow) {
      modifiers.arrow = { enabled: arrow };
    }

    const flipString = this.flip;
    if (flipString) {
      const flipModifier = { behavior: flipString.split(' ') };
      if (!modifiers.flip) {
        modifiers.flip = flipModifier;
      } else if (!modifiers.flip.behavior) {
        // Copy the flip modifier since we are altering the provided hash
        modifiers.flip = Object.assign({}, modifiers.flip, flipModifier);
      }
    }

    return modifiers;
  }

  _setIsVisibleAfterDelay(isVisible, delay) {
    if (!this._popperElement) {
      this._animationTimeout = requestAnimationFrame(() => {
        this._animationTimeout = this._setIsVisibleAfterDelay(isVisible, delay);
      });

      return;
    }
    const onChange = this.onChange;

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
  }

  // This is set to true when the popover is shown in order to override lazyRender=false
  _mustRender = false;

  @computed('showOn')
  get _showOn() {
    let showOn = this.showOn;

    if (showOn === undefined) {
      showOn = DEFAULTS.showOn;
    }

    return showOn === null ? [] : showOn.split(' ');
  }

  _transitionDuration = 0;

  /**
   * ================== LIFECYCLE HOOKS ==================
   */

  init() {
    super.init(...arguments);

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
  }

  didReceiveAttrs() {
    super.didReceiveAttrs(...arguments);

    stripInProduction(() => {
      const attrs = this.attributes || {};
      const userDefaults = this._config;

      let arrow;
      if (attrs.arrow !== undefined) {
        arrow = attrs.arrow.value;
      } else if (userDefaults.arrow !== undefined) {
        arrow = userDefaults.arrow;
      } else {
        arrow = DEFAULTS.arrow;
      }

      let animation;
      if (attrs.animation !== undefined) {
        animation = attrs.animation.value;
      } else if (userDefaults.animation !== undefined) {
        animation = userDefaults.animation;
      } else {
        animation = DEFAULTS.animation;
      }

      if (arrow && animation === 'fill') {
        warn('Animation: \'fill\' is not compatible with arrow: true', { id: 70015 });
      }

      this._lastUseCaptureArgumentValue = this.useCapture;
    });
  }

  didUpdateAttrs() {
    super.didUpdateAttrs(...arguments);

    stripInProduction(() => {
      if (this.useCapture !== this._lastUseCaptureArgumentValue) {
        warn(
          'The value of the useCapture argument was mutated',
          { id: 'ember-attacher.use-capture-mutated' }
        );
      }
    })
  }

  _setUserSuppliedDefaults() {
    const userDefaults = this._config;

    // Exit early if no custom defaults are found
    if (!userDefaults) {
      return;
    }

    const attrs = this.attributes || {};

    for (const key in userDefaults) {
      stripInProduction(() => {
        // eslint-disable-next-line no-prototype-builtins
        if (!DEFAULTS.hasOwnProperty(key)) {
          warn(`Unknown property given as an ember-attacher default: ${key}`, { id: 700152 });
        }
      });

      // Don't override attrs manually passed into the component
      if (attrs[key] === undefined) {
        if (key === 'arrow') {
          this.set('arrow', userDefaults[key]);
        } else {
          this[key] = userDefaults[key];
        }
      }
    }
  }

  didInsertElement() {
    super.didInsertElement(...arguments);

    this._initializeAttacher();
  }

  _initializeAttacher() {
    this._removeEventListeners();

    this.set('_currentTarget', this.popperTarget || this._parentFinder.parentNode);

    this._addListenersForShowEvents();

    if (!this._isHidden || this.isShown) {
      this._addListenersForHideEvents();

      // Even if the attachment is already shown, we still want to
      // call this._show() to make sure its position is updated for a potentially new target.
      this._show();
    }
  }

  _addListenersForShowEvents() {

    if (!this._currentTarget) {
      return;
    }

    this._showOn.forEach((event) => {
      this._showListenersOnTargetByEvent[event] = this._showAfterDelay;

      this._currentTarget.addEventListener(event, this._showAfterDelay, this.useCapture);
    });
  }

  willDestroyElement() {
    super.willDestroyElement(...arguments);

    cancelAnimationFrame(this._animationTimeout);
    cancel(this._delayedVisibilityToggle);

    this._removeEventListeners();
  }

  _removeEventListeners() {
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      document.removeEventListener(eventType, this._hideListenersOnDocumentByEvent[eventType], this.useCapture);
      delete this._hideListenersOnDocumentByEvent[eventType];
    });

    if (!this._currentTarget) {
      return;
    }

    [this._hideListenersOnTargetByEvent, this._showListenersOnTargetByEvent]
      .forEach((eventToListener) => {
        Object.keys(eventToListener).forEach((event) => {
          this._currentTarget.removeEventListener(event, eventToListener[event], this.useCapture);
        });
      });
  }

  @observes('hideOn', 'showOn', 'popperTarget')
  _targetOrTriggersChanged() {
    this._initializeAttacher();
  }

  @observes('isShown')
  _isShownChanged() {
    const isShown = this.isShown;

    if (isShown === true && this._isHidden) {
      this._show();

      // Add the hide listeners in the next run loop to avoid conflicts
      // where clicking triggers both an isShown toggle and a clickout.
      next(this, () => this._addListenersForHideEvents());
    } else if (isShown === false && !this._isHidden) {
      this._hide();
    }
  }

  /**
   * ================== SHOW ATTACHMENT LOGIC ==================
   */

  _showAfterDelay() {
    cancel(this._delayedVisibilityToggle);

    this.set('_mustRender', true);

    this._addListenersForHideEvents();

    const showDelay = parseInt(this.showDelay);

    this._delayedVisibilityToggle = debounce(this, this._show, showDelay, !showDelay);
  }

  _show() {
    cancelAnimationFrame(this._animationTimeout);

    if (!this._currentTarget) {
      return;
    }

    this.set('_mustRender', true);

    // Make the attachment visible immediately so transition animations can take place
    this._setIsVisibleAfterDelay(true, 0);

    this._startShowAnimation();
  }

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
          if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
            return;
          }
          // Make the popper element visible now that it has been positioned
          popperElement.style.visibility = '';
          this.set('_transitionDuration', parseInt(this.showDuration));
          this.set('_isStartingAnimation', true);
          popperElement.setAttribute('aria-hidden', 'false');
        });

        this._isHidden = false;
      });
    });
  }

  /**
   * ================== HIDE ATTACHMENT LOGIC ==================
   */

  _hideAfterDelay() {
    cancel(this._delayedVisibilityToggle);

    const hideDelay = parseInt(this.hideDelay);

    this._delayedVisibilityToggle = debounce(this, this._hide, hideDelay, !hideDelay);
  }

  _hide() {
    if (!this._popperElement) {
      this._animationTimeout = requestAnimationFrame(() => {
        this._animationTimeout = this._hide();
      });
      return;
    }

    cancelAnimationFrame(this._animationTimeout);

    this._removeListenersForHideEvents();

    this._animationTimeout = requestAnimationFrame(() => {
      // Avoid a race condition where we attempt to hide after the component is being destroyed.
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      const hideDuration = parseInt(this.hideDuration);

      run(() => {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        this.set('_transitionDuration', hideDuration);
        this.set('_isStartingAnimation', false);
        this._popperElement.setAttribute('aria-hidden', 'true');

        // Wait for any animations to complete before hiding the attachment
        this._setIsVisibleAfterDelay(false, hideDuration);
      });

      this._disableEventListeners();

      this._isHidden = true;
    });
  }

  /**
   * ================== HIDE LISTENERS ==================
   */

  _addListenersForHideEvents() {
    const hideOn = this._hideOn;
    const target = this._currentTarget;

    // Target or component was destroyed
    if (!target || this.isDestroyed || this.isDestroying) {
      return;
    }

    if (hideOn.includes('click')) {
      const showOnClickListener = this._showListenersOnTargetByEvent.click;

      if (showOnClickListener) {
        target.removeEventListener('click', showOnClickListener, this.useCapture);

        delete this._showListenersOnTargetByEvent.click;
      }

      this._hideListenersOnTargetByEvent.click = this._hideAfterDelay;
      target.addEventListener('click', this._hideAfterDelay, this.useCapture);
    }

    if (hideOn.includes('clickout')) {
      const clickoutEvent = 'ontouchstart' in window ? 'touchend' : 'click';

      this._hideListenersOnDocumentByEvent[clickoutEvent] = this._hideOnClickOut;
      document.addEventListener(clickoutEvent, this._hideOnClickOut, this.useCapture);
    }

    if (hideOn.includes('escapekey')) {
      this._hideListenersOnDocumentByEvent.keydown = this._hideOnEscapeKey;
      document.addEventListener('keydown', this._hideOnEscapeKey, this.useCapture);
    }

    // Hides the attachment when the mouse leaves the target
    // (or leaves both target and attachment for interactive attachments)
    if (hideOn.includes('mouseleave')) {
      this._hideListenersOnTargetByEvent.mouseleave = this._hideOnMouseLeaveTarget;
      target.addEventListener('mouseleave', this._hideOnMouseLeaveTarget, this.useCapture);
    }

    // Hides the attachment when focus is lost on the target
    ['blur', 'focusout'].forEach((eventType) => {
      if (hideOn.includes(eventType)) {
        this._hideListenersOnTargetByEvent[eventType] = this._hideOnLostFocus;
        target.addEventListener(eventType, this._hideOnLostFocus, this.useCapture);
      }
    });
  }

  _hideOnMouseLeaveTarget() {
    if (this.interactive) {
      // TODO(kjb) Should debounce this, but hiding appears sluggish if you debounce.
      //   - If you debounce with immediate fire, you get a bug where you can move out of the
      //   attachment and not trigger the hide because the hide check was debounced
      //   - Ideally we would debounce with an immediate run, then instead of debouncing, we would
      //   queue another fire at the end of the debounce period
      if (!this._hideListenersOnDocumentByEvent.mousemove) {
        this._hideListenersOnDocumentByEvent.mousemove = this._hideIfMouseOutsideTargetOrAttachment;
        document.addEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment, this.useCapture);
      }
    } else {
      this._hideAfterDelay();
    }
  }

  _debouncedHideIfMouseOutsideTargetOrAttachment(event) {
    debounce(this, this._hideIfMouseOutsideTargetOrAttachment, event, 10);
  }

  _hideIfMouseOutsideTargetOrAttachment(event) {
    const target = this._currentTarget;

    if (!target) {
      return;
    }

    // If cursor is not on the attachment or target, hide the popover
    if (!target.contains(event.target)
      && !(this.isOffset && this._isCursorBetweenTargetAndAttachment(event))
      && (this._popperElement && !this._popperElement.contains(event.target))) {
      // Remove this listener before hiding the attachment
      delete this._hideListenersOnDocumentByEvent.mousemove;
      document.removeEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment, this.useCapture);

      this._hideAfterDelay();
    }
  }

  _isCursorBetweenTargetAndAttachment(event) {

    if (!this._currentTarget) {
      return;
    }

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
  }

  _hideOnClickOut(event) {
    const targetReceivedClick = this._currentTarget.contains(event.target);

    if (this.interactive) {
      if (!targetReceivedClick && !this._popperElement.contains(event.target)) {
        this._hideAfterDelay();
      }
    } else if (!targetReceivedClick) {
      this._hideAfterDelay();
    }
  }

  _hideOnEscapeKey(event) {
    if (event.keyCode === 27) {
      return this._hideAfterDelay();
    }
  }

  _hideOnLostFocus(event) {
    if (event.relatedTarget === null) {
      this._hideAfterDelay();
    }

    if (!this._currentTarget) {
      return;
    }

    const targetContainsFocus = this._currentTarget.contains(event.relatedTarget);

    if (this.interactive) {
      if (!targetContainsFocus && !this._popperElement.contains(event.relatedTarget)) {
        this._hideAfterDelay();
      }
    } else if (!targetContainsFocus) {
      this._hideAfterDelay();
    }
  }

  _removeListenersForHideEvents() {
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      document.removeEventListener(eventType, this._hideListenersOnDocumentByEvent[eventType], this.useCapture);
      delete this._hideListenersOnDocumentByEvent[eventType];
    });

    const showOn = this._showOn;
    const target = this._currentTarget;

    // The target was destroyed, nothing to remove listeners from
    if (!target) {
      return;
    }

    // Switch clicking back to a show event
    if (showOn.includes('click')) {
      const hideOnClickListener = this._hideListenersOnTargetByEvent.click;

      if (hideOnClickListener) {
        target.removeEventListener('click', hideOnClickListener, this.useCapture);
        delete this._hideListenersOnTargetByEvent.click;
      }

      this._showListenersOnTargetByEvent.click = this._showAfterDelay;
      target.addEventListener('click', this._showAfterDelay, this.useCapture);
    }

    ['blur', 'focusout', 'mouseleave'].forEach((eventType) => {
      const listener = this._hideListenersOnTargetByEvent[eventType];

      if (listener) {
        target.removeEventListener(eventType, listener, this.useCapture);
        delete this._hideListenersOnTargetByEvent[eventType];
      }
    });
  }
}
