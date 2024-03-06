import { action } from '@ember/object';
import Component from '@glimmer/component';
import { cancel, debounce, later, next, run, once } from '@ember/runloop';
import { getOwner } from '@ember/application';
import { guidFor } from '@ember/object/internals';
import { htmlSafe, isHTMLSafe } from '@ember/template';
import { stripInProduction } from 'ember-attacher/-debug/helpers';
import { warn, assert } from '@ember/debug';
import { isEmpty, typeOf } from '@ember/utils';
import { autoUpdate, computePosition, arrow, flip, limitShift, shift } from '@floating-ui/dom';
import { buildWaiter } from '@ember/test-waiters';
import { tracked } from '@glimmer/tracking';
import { modifier } from 'ember-modifier';
import DEFAULTS from '../defaults';

const animationTestWaiter = buildWaiter('attach-popover');

export default class AttachPopover extends Component {
  @tracked parentNotFound = true;
  @tracked parentElement = null;
  @tracked _isStartingAnimation = false;
  @tracked _arrowElement = null;
  @tracked _currentTarget = null;
  // This is set to true when the popover is shown in order to override lazyRender=false
  @tracked _mustRender = false;
  @tracked _transitionDuration = 0;
  _floatingElement = null;
  configKey = 'popover';

  /**
   * ================== PUBLIC CONFIG OPTIONS ==================
   */
  get arrow() {
    return this.args.arrow ?? this._config.arrow ?? DEFAULTS.arrow;
  }

  get autoUpdate() {
    return this.args.autoUpdate ?? this._config.autoUpdate ?? DEFAULTS.autoUpdate;
  }

  get animation() {
    return this.args.animation || this._config.animation || DEFAULTS.animation;
  }

  get flip() {
    return this.args.flip ?? this._config.flip ?? DEFAULTS.flip;
  }

  get hideDelay() {
    return this.args.hideDelay ?? this._config.hideDelay ?? DEFAULTS.hideDelay;
  }

  get hideDuration() {
    return this.args.hideDuration ?? this._config.hideDuration ?? DEFAULTS.hideDuration;
  }

  get hideOn() {
    return this.args.hideOn || this._config.hideOn || DEFAULTS.hideOn;
  }

  get interactive() {
    return this.args.interactive ?? this._config.interactive ?? DEFAULTS.interactive;
  }

  get isOffset() {
    return this.args.isOffset ?? this._config.isOffset ?? DEFAULTS.isOffset;
  }

  get isShown() {
    return this.args.isShown ?? this._config.isShown ?? DEFAULTS.isShown;
  }

  get lazyRender() {
    return this.args.lazyRender ?? this._config.lazyRender ?? DEFAULTS.lazyRender;
  }

  get placement() {
    return this.args.placement ?? this._config.placement ?? DEFAULTS.placement;
  }

  get floatingElementContainer() {
    return this.args.floatingElementContainer || this._config.floatingElementContainer || DEFAULTS.floatingElementContainer;
  }

  get class() {
    return this.args.class || this._config.class;
  }

  get floatingUiOptions() {
    return this.args.floatingUiOptions || this._config.floatingUiOptions || DEFAULTS.floatingUiOptions;
  }

  get renderInPlace() {
    return this.args.renderInPlace ?? this._config.renderInPlace ?? DEFAULTS.renderInPlace;
  }

  get showDelay() {
    return this.args.showDelay ?? this._config.showDelay ?? DEFAULTS.showDelay;
  }

  get showDuration() {
    return this.args.showDuration ?? this._config.showDuration ?? DEFAULTS.showDuration;
  }

  get showOn() {
    if (this.args.showOn === null) {
      return null;
    }

    return this.args.showOn ?? this._config.showOn ?? DEFAULTS.showOn;
  }

  get style() {
    return this.args.style ?? this._config.style ?? DEFAULTS.style;
  }

  get useCapture() {
    return this.args.useCapture ?? this._config.useCapture ?? DEFAULTS.useCapture;
  }

  get isFillAnimation() {
    return this.animation === 'fill';
  }

  get renderFloatingElement() {
    return (this.renderInPlace || this._currentTarget) && (!this.lazyRender || this._mustRender);
  }

  get id() {
    return this.args.id || `${guidFor(this)}-floating`;
  }

  get overflowPadding() {
    return this.args.overflowPadding ?? this._config.overflowPadding ?? DEFAULTS.overflowPadding;
  }

  // The circle element needs a special duration that is slightly faster than the floating element's
  // transition, this prevents text from appearing outside the circle as it fills the background
  get _circleTransitionDuration() {
    return htmlSafe(
      `transition-duration: ${Math.round(this._transitionDuration / 1.25)}ms`
    );
  }

  get _class() {
    const showOrHideClass = `ember-attacher-${this._isStartingAnimation ? 'show' : 'hide'}`;
    const arrowClass = `ember-attacher-${this.arrow ? 'with' : 'without'}-arrow`;

    return [`ember-attacher-${this.animation}`, this.class || '', showOrHideClass, arrowClass].filter(Boolean).join(' ');
  }

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

  get _config() {
    return {
      ...this._envConfig,
      ...this._envConfig[this.configKey],
    };
  }

  get _hideOn() {
    let hideOn = this.hideOn;

    if (hideOn === undefined) {
      hideOn = DEFAULTS.hideOn;
    }

    return hideOn === null ? [] : hideOn.split(' ');
  }

  get _middleware() {
    // Copy the middleware since we might write to the provided array
    const middleware = this.args.middleware ? [...this.args.middleware] : [];

    const flipString = this.flip;
    if (flipString) {
      const flipOptions = { fallbackPlacements: flipString.split(' ') };
      const flipMiddleware = middleware.find(name => name === 'flip');
      if (!flipMiddleware) {
        middleware.push(flip(flipOptions));
      } else if (!flipMiddleware.fallbackPlacements) {
        Object.assign({}, flipMiddleware, flipOptions);
      }
    } else if (this.overflowPadding !== false) {
      middleware.push(flip());
    }

    if (this.overflowPadding !== false && !middleware.find(name => name === 'shift')) {
      middleware.push(shift({ limiter: limitShift(), padding: this.overflowPadding }))
    }

    if (this.arrow && this._arrowElement && !middleware.find(name => name === 'arrow')) {
      middleware.push(arrow({ element: this._arrowElement }));
    }

    return middleware;
  }

  get _floatingElementContainer() {
    const maybeContainer = this.floatingElementContainer;
    const renderInPlace = this._renderInPlace;
    let floatingElementContainer;

    if (renderInPlace) {
      floatingElementContainer = this.parentElement;
    } else if (maybeContainer instanceof Element) {
      floatingElementContainer = maybeContainer;
    } else if (typeof maybeContainer === 'string') {
      const selector = maybeContainer;
      const possibleContainers = self.document.querySelectorAll(selector);

      assert(`floatingElementContainer selector "${selector}" found `
        + `${possibleContainers.length} possible containers when there should be exactly 1`, possibleContainers.length === 1);

      floatingElementContainer = possibleContainers[0];
    }

    return floatingElementContainer;
  }

  get _renderInPlace() {
    // self.document is undefined in Fastboot, so we have to render in
    // place for the floating element to show up at all.
    return self.document ? !!this.renderInPlace : true;
  }

  _setIsVisibleAfterDelay(isVisible, delay) {
    if (!this._floatingElement) {
      this._animationTimeout = requestAnimationFrame(() => {
        this._setIsVisibleAfterDelay(isVisible, delay);
      });
      return;
    }
    const onChange = this.args.onChange;

    if (delay) {
      this._delayedVisibilityToggle = later(this, () => {
        this._animationTimeout = requestAnimationFrame(() => {
          animationTestWaiter.endAsync(this._animationTimeout);
          if (!this.isDestroyed && !this.isDestroying) {
            this._floatingElement.style.display = isVisible ? 'block' : 'none';

            // Prevent jank by making the attachment invisible until positioned.
            // The visibility style will be toggled by this._startShowAnimation()
            this._floatingElement.style.visibility = isVisible ? 'hidden' : '';

            if (onChange) {
              onChange(isVisible);
            }
          }
        });
        animationTestWaiter.beginAsync(this._animationTimeout);
      }, delay);
    } else {
      this._floatingElement.style.display = isVisible ? 'block' : 'none';
      // Prevent jank by making the attachment invisible until positioned.
      // The visibility style will be toggled by this._startShowAnimation()
      this._floatingElement.style.visibility = isVisible ? 'hidden' : '';

      if (onChange) {
        onChange(isVisible);
      }
    }
  }

  get _showOn() {
    let showOn = this.showOn;

    if (showOn === undefined) {
      showOn = DEFAULTS.showOn;
    }

    return showOn === null ? [] : showOn.split(' ');
  }

  // Exposed via the named yield to enable custom hide events
  @action
  hide() {
    this._hide();
  }

  onParentFinderInsert = modifier((element) => {
    this.parentElement = element.parentElement;
    once(this, '_initializeAttacher')
  });

  _ensureArgumentsAreValid([arrow, useCapture]) {
    stripInProduction(() => {
      if (arrow && this.isFillAnimation) {
        warn('Animation: \'fill\' is not compatible with arrow: true', { id: 70015 });
      }

      if (useCapture !== this._lastUseCaptureArgumentValue) {
        warn(
          'The value of the useCapture argument was mutated',
          { id: 'ember-attacher.use-capture-mutated' }
        );
      }
    });
  }


  constructor() {
    super(...arguments);

    // The debounced _hide() and _show() are stored here so they can be cancelled when necessary
    this._delayedVisibilityToggle = null;

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

    this._lastUseCaptureArgumentValue = this.useCapture;
  }

  _initializeAttacher() {
    this._removeEventListeners();
    this._currentTarget = this.args.explicitTarget || this.parentElement;
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

  willDestroy() {
    super.willDestroy(...arguments);

    this._cancelAnimation();
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

  onTargetOrTriggerChange = modifier((_, _positional) => {
    once(this, '_initializeAttacher', ..._positional);
  });

  onIsShownChange = modifier((_, [isShown]) => {
    if (isShown === true && this._isHidden) {
      this._show();

      // Add the hide listeners in the next run loop to avoid conflicts
      // where clicking triggers both an isShown toggle and a clickout.
      next(this, () => this._addListenersForHideEvents());
    } else if (isShown === false && !this._isHidden) {
      this._hide();
    }
  });

  initializeAttacher = modifier((floatingElement) => {
    this._floatingElement = floatingElement;

    if (this.renderInPlace) {
      this.parentElement = floatingElement.parentElement;
      once(this, '_initializeAttacher');
    }

    return () => this._cleanup?.();
  });

  /**
   * ================== SHOW ATTACHMENT LOGIC ==================
   */

  _showAfterDelay() {
    cancel(this._delayedVisibilityToggle);

    this._mustRender = true;

    this._addListenersForHideEvents();

    const showDelay = parseInt(this.showDelay);

    this._delayedVisibilityToggle = debounce(this, this._show, showDelay, !showDelay);
  }

  _show() {
    this._cancelAnimation();

    if (!this._currentTarget) {
      return;
    }

    this._mustRender = true;

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
      animationTestWaiter.endAsync(this._animationTimeout);
      if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
        return;
      }

      const floatingElement = this._floatingElement;

      // Wait until the element is visible before continuing
      if (!floatingElement || floatingElement.style.display === 'none') {
        this._startShowAnimation();
        return;
      }

      this._update();

      // Wait for the above positioning to take effect before starting the show animation,
      // else the positioning itself will be animated, causing animation glitches.
      this._animationTimeout = requestAnimationFrame(() => {
        animationTestWaiter.endAsync(this._animationTimeout);
        if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
          return;
        }
        run(() => {
          if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
            return;
          }
          // Make the floating element visible now that it has been positioned
          floatingElement.style.visibility = '';
          this._transitionDuration = parseInt(this.showDuration);
          this._isStartingAnimation = true;
          floatingElement.setAttribute('aria-hidden', 'false');
        });

        this._isHidden = false;
      });
      animationTestWaiter.beginAsync(this._animationTimeout);
    });
    animationTestWaiter.beginAsync(this._animationTimeout);
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
    if (!this._floatingElement) {
      this._animationTimeout = requestAnimationFrame(() => {
        animationTestWaiter.endAsync(this._animationTimeout);
        this._hide();
      });
      animationTestWaiter.beginAsync(this._animationTimeout);
      return;
    }

    this._cancelAnimation();

    this._removeListenersForHideEvents();
    this._animationTimeout = requestAnimationFrame(() => {
      animationTestWaiter.endAsync(this._animationTimeout);
      // Avoid a race condition where we attempt to hide after the component is being destroyed.
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      const hideDuration = parseInt(this.hideDuration);

      run(() => {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        this._transitionDuration = hideDuration;
        this._isStartingAnimation = false;
        this._floatingElement.setAttribute('aria-hidden', 'true');
        // Wait for any animations to complete before hiding the attachment
        this._setIsVisibleAfterDelay(false, hideDuration);
      });

      this._isHidden = true;
    });
    animationTestWaiter.beginAsync(this._animationTimeout);
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

    // If cursor is not on the attachment or target, hide the floating element
    if (!target.contains(event.target)
      && !(this.isOffset && this._isCursorBetweenTargetAndAttachment(event))
      && (this._floatingElement && !this._floatingElement.contains(event.target))) {
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

    const attachmentPosition = this._floatingElement.getBoundingClientRect();
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
      if (!targetReceivedClick && !this._floatingElement.contains(event.target)) {
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
      if (!targetContainsFocus && !this._floatingElement.contains(event.relatedTarget)) {
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

  didInsertArrow = modifier((element) => {
    this._arrowElement = element;
  })

  onOptionsChange = modifier((_, positional) => {
    this._ensureArgumentsAreValid(positional);
    once(this, '_update')
  })

  _update() {
    this._cleanup?.();
    if (this.autoUpdate) {
      this._cleanup = autoUpdate(
        this._currentTarget,
        this._floatingElement,
        this._updatePosition,
        typeOf(this.autoUpdate) === 'object' ? this.autoUpdate : undefined
      );
    } else {
      this._updatePosition();
    }
  }

  @action
  _updatePosition() {
    const computePositionToken = animationTestWaiter.beginAsync();
    computePosition(this._currentTarget, this._floatingElement, {
      ...this.floatingUiOptions,
      middleware: this._middleware,
      placement: this.placement
    }).then(({ x, y, placement, middlewareData }) => {
      animationTestWaiter.endAsync(computePositionToken);
      Object.assign(this._floatingElement.style, { left: `${x}px`, top: `${y}px`, });

      if (middlewareData.arrow) {
        const { x, y } = middlewareData.arrow;

        Object.assign(this._arrowElement.style, {
          left: x != null ? `${x}px` : '',
          top: y != null ? `${y}px` : '',
        });
      }
      this._floatingElement.setAttribute('x-placement', placement);
    });
  }

  _cancelAnimation() {
    if (typeof cancelAnimationFrame !== 'function') {
      return;
    }

    cancelAnimationFrame(this._animationTimeout);

    stripInProduction(() => {
      if (animationTestWaiter.items?.get(this._animationTimeout)) {
        animationTestWaiter.endAsync(this._animationTimeout);
      }
    })
  }
}
