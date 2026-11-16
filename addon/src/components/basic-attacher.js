import { action } from '@ember/object';
import Component from '@glimmer/component';
import { cancel, debounce, later, next, run, schedule } from '@ember/runloop';
import { getOwner } from '@ember/application';
import { guidFor } from '@ember/object/internals';
import { isHTMLSafe } from '@ember/template';
import { runInDebug, warn } from '@ember/debug';
import { autoUpdate, computePosition } from '@floating-ui/dom';
import { buildWaiter } from '@ember/test-waiters';
import { tracked } from '@glimmer/tracking';
import { modifier } from 'ember-modifier';
import DEFAULTS from '../defaults';
import { AttachmentAriaController, restoreFocusOnEscape } from '../lib/a11y.js';
import {
  descendantAttachmentContainsEvent,
  descendantAttachmentContainsNode,
  registerAttacher,
  shouldHandleEscapeKey,
  syncParentAttachment,
  unregisterAttacher,
} from '../lib/attachment-tree.js';
import { elementContainsEvent, isCursorInSafePolygon } from '../lib/dom.js';
import {
  getModalDialogContainer,
  hidePopoverHost,
  resolveHostContainer,
  showPopoverHost,
  supportsPopoverHost,
} from '../lib/host.js';
import { onInsert, onUpdate } from '../lib/modifiers.js';
import {
  applyPositionResult,
  buildMiddleware,
  isTargetConnected,
} from '../lib/positioning.js';
import {
  getListenerTarget,
  resolveAttachmentTarget,
} from '../lib/target-resolution.js';
import MaybeInElement from './basic-attacher/maybe-in-element.gjs';

const animationTestWaiter = buildWaiter('basic-attacher');

export default class BasicAttacher extends Component {
  MaybeInElement = MaybeInElement;

  @tracked parentNotFound = true;
  @tracked parentElement = null;
  @tracked _isStartingAnimation = false;
  @tracked _arrowElement = null;
  @tracked _currentTarget = null;
  @tracked _registeredTarget = null;
  @tracked _mustRender = false;
  @tracked _modalContainer = null;

  _setReferenceTimer = null;
  // Untracked copy of the node listeners are on so `_removeEventListeners` does
  // not read `_currentTarget` in the same frame that writes it (`targetDidUpdate`).
  _listenerTarget = null;
  _floatingElement = null;

  parentFinder = onInsert((element) => {
    if (!this.isDestroyed && !this.isDestroying) {
      this.parentElement = element.parentElement;
      this._initializeAttacher();
    }
  });

  // Insert + autoUpdate teardown. Must not read tracked state synchronously in
  // the modifier callback (the scheduled fn is fine) or tracked updates will re-fire teardown.
  setupFloatingElement = modifier((element) => {
    this._floatingElement = element;
    registerAttacher(this);

    const timer = schedule('actions', () => {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      this._floatingElement = element;

      if (this.renderInPlace) {
        this.parentElement = element.parentElement;
        this._initializeAttacher();
      } else {
        syncParentAttachment(this);
      }
    });

    return () => {
      cancel(timer);
      if (this._floatingElement === element) {
        this._floatingElement = null;
      }
      this._cleanup?.();
    };
  });

  insertArrow = onInsert((element) => {
    if (!this.isDestroyed && !this.isDestroying) {
      this._arrowElement = element;
    }
  });

  isShownDidUpdate = onUpdate(() => this._syncIsShown());
  targetDidUpdate = onUpdate(() => this._initializeAttacher());
  optionsDidUpdate = onUpdate(() => {
    this._ensureArgumentsAreValid();
    this._syncAria();
    this._update();
  });

  _opt(key) {
    return this.args[key] ?? this._config[key] ?? DEFAULTS[key];
  }

  get arrow() { return this._opt('arrow'); }
  get autoUpdate() { return this._opt('autoUpdate'); }
  get animation() { return this.args.animation || this._config.animation || DEFAULTS.animation; }
  get flip() { return this._opt('flip'); }
  get hideDelay() { return this._opt('hideDelay'); }
  get hideDuration() { return this._opt('hideDuration'); }
  get hideOn() { return this.args.hideOn === null ? null : this._opt('hideOn'); }
  get interactive() { return this._opt('interactive'); }
  get isOffset() { return this._opt('isOffset'); }
  get isShown() { return this._opt('isShown'); }
  get lazyRender() { return this._opt('lazyRender'); }
  get overflowPadding() { return this._opt('overflowPadding'); }
  get placement() { return this._opt('placement'); }
  get renderInPlace() { return this._opt('renderInPlace'); }
  get showDelay() { return this._opt('showDelay'); }
  get showDuration() { return this._opt('showDuration'); }
  get showOn() { return this.args.showOn === null ? null : this._opt('showOn'); }
  get strategy() { return this._opt('strategy'); }
  get style() { return this._opt('style'); }
  get useCapture() { return this._opt('useCapture'); }
  get class() { return this.args.class || this._config.class; }
  get floatingElementContainer() { return this.args.floatingElementContainer || this._config.floatingElementContainer || DEFAULTS.floatingElementContainer; }
  get floatingUiOptions() { return this.args.floatingUiOptions || this._config.floatingUiOptions || DEFAULTS.floatingUiOptions; }
  get configKey() { return this.args.configKey || 'popover'; }
  get _isTooltip() { return this.configKey === 'tooltip' || this.args.ariaRole === 'tooltip'; }
  get isFillAnimation() { return this.animation === 'fill'; }
  get renderFloatingElement() { return Boolean(this.renderInPlace || this._currentTarget); }
  get shouldRenderFloatingElement() { return !this.lazyRender || this._mustRender; }
  get id() { return this.args.id || `${guidFor(this)}-floating`; }

  get _class() {
    const showOrHideClass = `ember-attacher-${this._isStartingAnimation ? 'show' : 'hide'}`;
    const arrowClass = `ember-attacher-${this.arrow ? 'with' : 'without'}-arrow`;
    return [
      `ember-attacher-${this.animation}`,
      this.class || '',
      this.args.additionalClass || '',
      showOrHideClass,
      arrowClass,
    ].filter(Boolean).join(' ');
  }

  get _style() {
    const style = this.style;
    if (!style) {
      return undefined;
    }

    warn(
      '@ember/string/htmlSafe must be used for any `style` passed to ember-attacher',
      isHTMLSafe(style),
      { id: 'ember-attacher-require-html-safe-style' }
    );

    return style;
  }

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
    const hideOn = this.hideOn === undefined ? DEFAULTS.hideOn : this.hideOn;
    return hideOn === null ? [] : hideOn.split(' ');
  }

  get _showOn() {
    const showOn = this.showOn === undefined ? DEFAULTS.showOn : this.showOn;
    return showOn === null ? [] : showOn.split(' ');
  }

  get _middleware() {
    return buildMiddleware({
      rawMiddleware: this._opt('middleware'),
      arrowElement: this._arrowElement,
      flipOption: this.flip,
      overflowPadding: this.overflowPadding,
      arrowEnabled: Boolean(this.arrow),
    });
  }

  get _hasCustomFloatingElementContainer() {
    return Boolean(this.args.floatingElementContainer || this._config.floatingElementContainer);
  }

  get _usePopoverHost() {
    return (
      supportsPopoverHost() &&
      !this._renderInPlace &&
      !this._hasCustomFloatingElementContainer
    );
  }

  get _popoverAttr() {
    return this._usePopoverHost ? 'manual' : undefined;
  }

  get _renderInPlace() {
    return typeof document !== 'undefined' ? Boolean(this.renderInPlace) : true;
  }

  get _floatingElementContainer() {
    return resolveHostContainer({
      renderInPlace: this._renderInPlace,
      parentElement: this.parentElement,
      maybeContainer: this.floatingElementContainer,
      hasCustomContainer: this._hasCustomFloatingElementContainer,
      modalContainer: this._modalContainer,
      usePopoverHost: this._usePopoverHost,
    });
  }

  _syncModalContainer() {
    if (this._renderInPlace || this._hasCustomFloatingElementContainer) {
      if (this._modalContainer !== null) {
        this._modalContainer = null;
      }
      return false;
    }

    const modalDialog = getModalDialogContainer(this._listenerTarget || this.parentElement);
    if (this._modalContainer !== modalDialog) {
      this._modalContainer = modalDialog;
      return true;
    }

    return false;
  }

  _applyVisibility(isVisible) {
    if (!isVisible) {
      this._cleanup?.();
      this._cleanup = null;
    }

    this._floatingElement.style.display = isVisible ? 'block' : 'none';
    // Prevent jank by keeping the attachment invisible until positioned by _startShowAnimation().
    this._floatingElement.style.visibility = isVisible ? 'hidden' : '';

    if (isVisible) {
      showPopoverHost(this._floatingElement);
    } else {
      hidePopoverHost(this._floatingElement);
    }

    this.args.onChange?.(isVisible);
  }

  _setIsVisibleAfterDelay(isVisible, delay) {
    if (!this._floatingElement) {
      this._animationTimeout = requestAnimationFrame(() => {
        this._setIsVisibleAfterDelay(isVisible, delay);
      });
      return;
    }

    if (delay) {
      this._delayedVisibilityToggle = later(this, () => {
        this._animationTimeout = requestAnimationFrame(() => {
          animationTestWaiter.endAsync(this._animationTimeout);
          if (!this.isDestroyed && !this.isDestroying) {
            this._applyVisibility(isVisible);
          }
        });
        animationTestWaiter.beginAsync(this._animationTimeout);
      }, delay);
    } else {
      this._applyVisibility(isVisible);
    }
  }

  @action
  hide() {
    this._hide();
  }

  @action
  setReference(target) {
    cancel(this._setReferenceTimer);

    this._setReferenceTimer = schedule('actions', () => {
      this._setReferenceTimer = null;

      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      const nextTarget = target ?? null;
      if (this._registeredTarget === nextTarget) {
        return;
      }

      this._registeredTarget = nextTarget;
      this._initializeAttacher();
    });
  }

  reference = modifier((element) => {
    this.setReference(element);

    return () => {
      if (!this.isDestroyed && !this.isDestroying && this._registeredTarget === element) {
        this.setReference(null);
      }
    };
  });

  _ensureArgumentsAreValid() {
    runInDebug(() => {
      if (this.arrow && this.isFillAnimation) {
        warn('Animation: \'fill\' is not compatible with arrow: true', { id: 70015 });
      }

      if (this.useCapture !== this._lastUseCaptureArgumentValue) {
        warn(
          'The value of the useCapture argument was mutated',
          { id: 'ember-attacher.use-capture-mutated' }
        );
      }
    });
  }

  constructor() {
    super(...arguments);

    registerAttacher(this);

    this._delayedVisibilityToggle = null;
    this._isHidden = true;
    this._isHiding = false;
    this._positioningSuspended = false;
    this._animationTimeout = null;

    this._hideListenersOnDocumentByEvent = {};
    this._hideListenersOnTargetByEvent = {};
    this._showListenersOnTargetByEvent = {};

    this._aria = new AttachmentAriaController();
    this._ariaOpen = false;
    this._mouseLeaveOrigin = null;
    this._restoreFocusOnHide = false;
    this._suppressFocusShow = false;

    this._hide = this._hide.bind(this);
    this._hideAfterDelay = this._hideAfterDelay.bind(this);
    this._hideIfMouseOutsideTargetOrAttachment = this._hideIfMouseOutsideTargetOrAttachment.bind(this);
    this._hideOnClickOut = this._hideOnClickOut.bind(this);
    this._hideOnEscapeKey = this._hideOnEscapeKey.bind(this);
    this._hideOnLostFocus = this._hideOnLostFocus.bind(this);
    this._hideOnMouseLeaveTarget = this._hideOnMouseLeaveTarget.bind(this);
    this._show = this._show.bind(this);
    this._showAfterDelay = this._showAfterDelay.bind(this);

    this._lastUseCaptureArgumentValue = this.useCapture;
  }

  _syncAria() {
    this._aria.bind(this._listenerTarget, {
      isTooltip: this._isTooltip,
      id: this.id,
      ariaRole: this.args.ariaRole,
      isOpen: this._ariaOpen,
    });
  }

  _initializeAttacher() {
    this._removeEventListeners();
    const target = resolveAttachmentTarget({
      explicitTarget: this.args.explicitTarget,
      registeredTarget: this._registeredTarget,
      parentElement: this.parentElement,
    });
    this._listenerTarget = getListenerTarget(target);
    this._currentTarget = target;
    this._syncModalContainer();
    syncParentAttachment(this);
    this._addListenersForShowEvents();

    if (!this._isHidden || this.isShown) {
      this._ariaOpen = true;
      this._syncAria();
      this._addListenersForHideEvents();
      this._show();
    } else {
      this._ariaOpen = false;
      this._syncAria();
    }

    this.args.onInitializeAttacher?.(this._currentTarget, this.id);
  }

  _addListenersForShowEvents() {
    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    this._showOn.forEach((event) => {
      this._showListenersOnTargetByEvent[event] = this._showAfterDelay;
      target.addEventListener(event, this._showAfterDelay, this.useCapture);
    });
  }

  willDestroy() {
    super.willDestroy(...arguments);

    unregisterAttacher(this);

    this._cleanup?.();
    this._cleanup = null;

    cancel(this._setReferenceTimer);
    this._cancelAnimation();
    cancel(this._delayedVisibilityToggle);

    this._aria.unbind();
    this._removeEventListeners();

    this.args.onWillDestroy?.(this._currentTarget, this.id);
  }

  _removeEventListeners() {
    this._mouseLeaveOrigin = null;
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      document.removeEventListener(eventType, this._hideListenersOnDocumentByEvent[eventType], this.useCapture);
      delete this._hideListenersOnDocumentByEvent[eventType];
    });

    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    [this._hideListenersOnTargetByEvent, this._showListenersOnTargetByEvent].forEach((eventToListener) => {
      Object.keys(eventToListener).forEach((event) => {
        target.removeEventListener(event, eventToListener[event], this.useCapture);
      });
    });
  }

  _syncIsShown() {
    const isShown = this.isShown;

    if (isShown === true && this._isHidden) {
      this._show();
      next(this, () => this._addListenersForHideEvents());
    } else if (isShown === false && !this._isHidden) {
      this._hide();
    }
  }

  _showAfterDelay(event) {
    if (this._suppressFocusShow && (event?.type === 'focus' || event?.type === 'focusin')) {
      return;
    }

    cancel(this._delayedVisibilityToggle);

    this._isHiding = false;
    this._mustRender = true;
    syncParentAttachment(this);

    this._addListenersForHideEvents();

    const showDelay = parseInt(this.showDelay);
    this._delayedVisibilityToggle = debounce(this, this._show, showDelay, !showDelay);
  }

  _show() {
    this._cancelAnimation();

    if (!this._currentTarget) {
      return;
    }

    this._restoreFocusOnHide = false;
    this._isHiding = false;
    this._positioningSuspended = false;
    this._mustRender = true;
    this._ariaOpen = true;
    this._aria.setOpen(true);
    const modalContainerChanged = this._syncModalContainer();
    syncParentAttachment(this);

    if (modalContainerChanged) {
      next(this, () => {
        if (!this.isDestroyed && !this.isDestroying && !this._isHiding && this._currentTarget) {
          this._setIsVisibleAfterDelay(true, 0);
          this._startShowAnimation();
        }
      });
      return;
    }

    this._setIsVisibleAfterDelay(true, 0);
    this._startShowAnimation();
  }

  _startShowAnimation() {
    this._animationTimeout = requestAnimationFrame(() => {
      animationTestWaiter.endAsync(this._animationTimeout);
      if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
        return;
      }

      const floatingElement = this._floatingElement;
      if (!floatingElement || floatingElement.style.display === 'none') {
        this._startShowAnimation();
        return;
      }

      this._update();

      this._animationTimeout = requestAnimationFrame(() => {
        animationTestWaiter.endAsync(this._animationTimeout);
        if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
          return;
        }
        run(() => {
          if (this.isDestroyed || this.isDestroying || !this._currentTarget) {
            return;
          }
          if (
            !floatingElement.hasAttribute('data-reference-hidden') &&
            !floatingElement.hasAttribute('data-escaped')
          ) {
            floatingElement.style.visibility = '';
          }
          const showDuration = parseInt(this.showDuration);
          floatingElement.style.setProperty(
            '--ember-attacher-transition-duration',
            `${showDuration}ms`
          );
          this._isStartingAnimation = true;
          floatingElement.setAttribute('aria-hidden', 'false');
        });

        this._isHidden = false;
      });
      animationTestWaiter.beginAsync(this._animationTimeout);
    });
    animationTestWaiter.beginAsync(this._animationTimeout);
  }

  _hideAfterDelay() {
    cancel(this._delayedVisibilityToggle);
    this._isHiding = true;

    const hideDelay = parseInt(this.hideDelay);
    this._delayedVisibilityToggle = debounce(this, this._hide, hideDelay, !hideDelay);
  }

  _hide() {
    this._isHiding = true;
    this._positioningSuspended = true;
    this._ariaOpen = false;
    this._mouseLeaveOrigin = null;
    this._cleanup?.();
    this._cleanup = null;

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
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      const hideDuration = parseInt(this.hideDuration);

      run(() => {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        if (this._restoreFocusOnHide) {
          this._restoreFocusOnHide = false;
          this._suppressFocusShow = true;
          try {
            restoreFocusOnEscape(this._listenerTarget, this._floatingElement);
          } finally {
            this._suppressFocusShow = false;
          }
        }

        this._floatingElement.style.setProperty(
          '--ember-attacher-transition-duration',
          `${hideDuration}ms`
        );
        this._isStartingAnimation = false;
        this._floatingElement.setAttribute('aria-hidden', 'true');
        this._aria.setOpen(false);
        this._setIsVisibleAfterDelay(false, hideDuration);
      });

      this._isHidden = true;
    });
    animationTestWaiter.beginAsync(this._animationTimeout);
  }

  _addListenersForHideEvents() {
    const hideOn = this._hideOn;
    const target = this._listenerTarget;

    if (!this._currentTarget || this.isDestroyed || this.isDestroying) {
      return;
    }

    if (target && hideOn.includes('click')) {
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

    if (target && hideOn.includes('mouseleave')) {
      this._hideListenersOnTargetByEvent.mouseleave = this._hideOnMouseLeaveTarget;
      target.addEventListener('mouseleave', this._hideOnMouseLeaveTarget, this.useCapture);
    }

    if (target) {
      ['blur', 'focusout'].forEach((eventType) => {
        if (hideOn.includes(eventType)) {
          this._hideListenersOnTargetByEvent[eventType] = this._hideOnLostFocus;
          target.addEventListener(eventType, this._hideOnLostFocus, this.useCapture);
        }
      });
    }
  }

  _hideOnMouseLeaveTarget(event) {
    if (this.interactive) {
      this._mouseLeaveOrigin = event ? { x: event.clientX, y: event.clientY } : null;

      if (!this._hideListenersOnDocumentByEvent.mousemove) {
        this._hideListenersOnDocumentByEvent.mousemove = this._hideIfMouseOutsideTargetOrAttachment;
        document.addEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment, this.useCapture);
      }
    } else {
      this._hideAfterDelay();
    }
  }

  _hideIfMouseOutsideTargetOrAttachment(event) {
    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    if (
      !target.contains(event.target) &&
      !descendantAttachmentContainsEvent(this, event) &&
      !isCursorInSafePolygon(event, this._mouseLeaveOrigin, this._currentTarget, this._floatingElement) &&
      this._floatingElement &&
      !this._floatingElement.contains(event.target)
    ) {
      this._mouseLeaveOrigin = null;
      delete this._hideListenersOnDocumentByEvent.mousemove;
      document.removeEventListener('mousemove', this._hideIfMouseOutsideTargetOrAttachment, this.useCapture);
      this._hideAfterDelay();
    }
  }

  _hideOnClickOut(event) {
    const target = this._listenerTarget;
    if (elementContainsEvent(target, event) || descendantAttachmentContainsEvent(this, event)) {
      return;
    }

    if (!this.interactive || !elementContainsEvent(this._floatingElement, event)) {
      this._hideAfterDelay();
    }
  }

  _hideOnEscapeKey(event) {
    if ((event.key === 'Escape' || event.keyCode === 27) && shouldHandleEscapeKey(this, event)) {
      this._restoreFocusOnHide = !this._isTooltip;
      return this._hideAfterDelay();
    }
  }

  _hideOnLostFocus(event) {
    if (event.relatedTarget === null) {
      this._hideAfterDelay();
      return;
    }

    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    if (target.contains(event.relatedTarget) || descendantAttachmentContainsNode(this, event.relatedTarget)) {
      return;
    }

    if (!this.interactive || !this._floatingElement?.contains(event.relatedTarget)) {
      this._hideAfterDelay();
    }
  }

  _removeListenersForHideEvents() {
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      document.removeEventListener(eventType, this._hideListenersOnDocumentByEvent[eventType], this.useCapture);
      delete this._hideListenersOnDocumentByEvent[eventType];
    });

    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    if (this._showOn.includes('click')) {
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

  _update() {
    this._cleanup?.();
    this._cleanup = null;

    if (
      this.isDestroyed ||
      this.isDestroying ||
      this._positioningSuspended ||
      !this._currentTarget ||
      !this._floatingElement ||
      !isTargetConnected(this._currentTarget) ||
      !this._floatingElement.isConnected
    ) {
      return;
    }

    if (this.autoUpdate) {
      this._cleanup = autoUpdate(
        this._currentTarget,
        this._floatingElement,
        this._updatePosition,
        typeof this.autoUpdate === 'object' && this.autoUpdate !== null
          ? this.autoUpdate
          : undefined
      );
    } else {
      this._updatePosition();
    }
  }

  @action
  _updatePosition() {
    if (
      this.isDestroyed ||
      this.isDestroying ||
      !this._currentTarget ||
      !this._floatingElement
    ) {
      return;
    }

    if (!isTargetConnected(this._currentTarget) || !this._floatingElement.isConnected) {
      this._cleanup?.();
      this._cleanup = null;
      return;
    }

    const strategy = this.strategy;
    const computePositionToken = animationTestWaiter.beginAsync();
    computePosition(this._currentTarget, this._floatingElement, {
      ...this.floatingUiOptions,
      middleware: this._middleware,
      placement: this.placement,
      strategy,
    })
      .then(({ x, y, placement, strategy: computedStrategy, middlewareData }) => {
        animationTestWaiter.endAsync(computePositionToken);

        if (
          this.isDestroyed ||
          this.isDestroying ||
          !this._floatingElement ||
          !this._floatingElement.isConnected
        ) {
          return;
        }

        applyPositionResult(this._floatingElement, this._arrowElement, {
          x,
          y,
          placement,
          strategy: computedStrategy || strategy,
          middlewareData,
          isHidden: this._isHidden,
        });
      })
      .catch((error) => {
        animationTestWaiter.endAsync(computePositionToken);

        if (!this.isDestroyed && !this.isDestroying) {
          warn(`[ember-attacher] Positioning error: ${error?.message ?? error}`, {
            id: 'ember-attacher.positioning-error',
          });
        }
      });
  }

  _cancelAnimation() {
    if (typeof cancelAnimationFrame !== 'function') {
      return;
    }

    cancelAnimationFrame(this._animationTimeout);

    runInDebug(() => {
      if (animationTestWaiter.items?.get(this._animationTimeout)) {
        animationTestWaiter.endAsync(this._animationTimeout);
      }
    });
  }
}
