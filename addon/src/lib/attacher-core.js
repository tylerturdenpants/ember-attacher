import { cancel, debounce, later, next, run, schedule } from '@ember/runloop';
import { getOwner } from '@ember/application';
import { guidFor } from '@ember/object/internals';
import { registerDestructor } from '@ember/destroyable';
import { isHTMLSafe } from '@ember/template';
import { deprecate, runInDebug, warn } from '@ember/debug';
import { autoUpdate, computePosition } from '@floating-ui/dom';
import { buildWaiter } from '@ember/test-waiters';
import { tracked } from '@glimmer/tracking';
import Modifier, { modifier } from 'ember-modifier';
import DEFAULTS from '../defaults';
import { AttachmentAriaController, restoreFocusOnEscape } from './a11y.js';
import {
  descendantAttachmentContainsEvent,
  descendantAttachmentContainsNode,
  registerAttacher,
  shouldHandleEscapeKey,
  syncParentAttachment,
  unregisterAttacher,
} from './attachment-tree.js';
import { getDelayGroup, peekDelayGroup } from './delay-group.js';
import { elementContainsEvent, isCursorInSafePolygon } from './dom.js';
import {
  getModalDialogContainer,
  hidePopoverHost,
  resolveHostContainer,
  showPopoverHost,
  supportsPopoverHost,
} from './host.js';
import { onInsert, onUpdate } from './modifiers.js';
import {
  applyPositionResult,
  buildMiddleware,
  isTargetConnected,
} from './positioning.js';
import {
  findPopoverTargetElements,
  getListenerTarget,
  isElementTarget,
  isVirtualReference,
  resolveAttachmentTarget,
} from './target-resolution.js';

export function resolveTooltipClass(envConfig) {
  const { tooltip, tooltipClass } = envConfig || {};
  return tooltip?.tooltipClass ?? tooltipClass ?? DEFAULTS.tooltipClass;
}

function createTargetModifier(core) {
  return class AttacherTargetModifier extends Modifier {
    _element = null;
    _installed = false;
    _destroyed = false;
    _mountTimer = null;

    constructor(owner, args) {
      super(owner, args);
      registerDestructor(this, () => {
        this._destroyed = true;
        cancel(this._mountTimer);
        if (this._element) {
          core.unregisterTargetElement(this._element);
          this._element = null;
        }
      });
    }

    modify(element, positional, named) {
      if (this._destroyed || core.isDestroyed) {
        return;
      }

      const data = positional.length > 0 ? positional[0] : named?.data;
      const entry = core.registerTargetElement(element, data, null, getOwner(this));

      if (!this._installed) {
        this._installed = true;
        this._element = element;
        this._mountTimer = schedule('actions', () => {
          this._mountTimer = null;
          if (!this._destroyed && !core.isDestroyed) {
            core._onRegisteredEntryMounted(element, entry.data);
          }
        });
      }
    }
  };
}

const animationTestWaiter = buildWaiter('basic-attacher');
const EMPTY_OBJECT = Object.freeze({});
const rawEnvByOwner = new WeakMap();

function readEmberAttacherEnv(owner) {
  if (!owner || typeof owner !== 'object') {
    return EMPTY_OBJECT;
  }

  let env = rawEnvByOwner.get(owner);
  if (env === undefined) {
    env = owner.resolveRegistration?.('config:environment') || null;
    rawEnvByOwner.set(owner, env);
  }

  return env?.emberAttacher || EMPTY_OBJECT;
}

function shallowValueEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => {
    const valA = a[key];
    const valB = b[key];
    if (valA === valB) {
      return true;
    }
    if (valA && valB && typeof valA === 'object' && typeof valB === 'object') {
      const subKeysA = Object.keys(valA);
      const subKeysB = Object.keys(valB);
      return (
        subKeysA.length === subKeysB.length &&
        subKeysA.every((subKey) => valA[subKey] === valB[subKey])
      );
    }
    return false;
  });
}

function normalizeTriggerList(value, fallback) {
  const resolved = value === undefined ? fallback : value;
  return resolved === null ? [] : resolved.split(' ').filter(Boolean);
}

// Shared reactive controller backing <BasicAttacher> and <Attacher>.
export default class AttacherCore {
  @tracked _parentNotFound = true;
  @tracked _parentElement = null;
  @tracked _isStartingAnimation = false;
  @tracked _arrowElement = null;
  @tracked _currentTarget = null;
  @tracked _registeredTarget = null;
  @tracked _mustRender = false;
  @tracked _modalContainer = null;
  @tracked _isShown = false;
  @tracked _data = undefined;
  @tracked _resolvedPlacement = undefined;
  @tracked _middlewareData = {};

  _defaultId = null;
  _elementId = null;
  _setReferenceTimer = null;
  // Untracked copy of the node listeners are on so `_removeHideEventListeners`
  // does not read `_currentTarget` in the same frame that writes it.
  _listenerTarget = null;
  _floatingElement = null;
  _registeredEntries = new Map();
  _popoverTargetEntries = new Map();
  _activeEntryOptions = null;
  _pendingRegisteredData = undefined;
  _hasPendingData = false;
  _pendingPopoverTrigger = null;
  _syncingPopoverHost = false;
  _skipNativePopoverToggle = false;
  _addedManagedPopover = false;
  _attachedPopoverEventsOn = null;
  _syncArgsTimer = null;
  _prevSyncedIsShown = undefined;
  _prevSyncedTargetKey = undefined;
  _lastShownByDelay = 0;

  constructor(
    ownerContext,
    getArgs,
    {
      defaultConfigKey = null,
      defaultAriaRole = undefined,
      getAdditionalClass = null,
      allowParentFallback = true,
      isComponentHost = true,
      onRenderStateChange = null,
    } = {}
  ) {
    this._ownerContext = ownerContext;
    this._owner =
      ownerContext && typeof ownerContext === 'object' ? getOwner(ownerContext) : null;
    this._getArgs = getArgs;
    this._defaultConfigKey = defaultConfigKey;
    this._defaultAriaRole = defaultAriaRole;
    this._getAdditionalClass = getAdditionalClass;
    this._allowParentFallback = allowParentFallback;
    this._isComponentHost = isComponentHost;
    this._onRenderStateChange = onRenderStateChange;
    this._defaultId = `${guidFor(this)}-floating`;

    this._delayedVisibilityToggle = null;
    this._isHidden = true;
    this._isHiding = false;
    this._positioningSuspended = true;
    this._pendingRafs = new Set();
    this._isDestroyed = false;
    this._warnedDeprecations = new Set();

    this._hideListenersOnDocumentByEvent = {};
    this._hideListenersOnTargetByEvent = {};
    this._legacyShowListenersOnTargetByEvent = {};

    this._aria = new AttachmentAriaController();
    this._ariaOpen = false;
    this._mouseLeaveOrigin = null;
    this._restoreFocusOnHide = false;
    this._suppressFocusShow = false;

    this.hide = this.hide.bind(this);
    this.show = this.show.bind(this);
    this.toggle = this.toggle.bind(this);
    this.update = this.update.bind(this);
    this.setTarget = this.setTarget.bind(this);
    this.setReference = this.setReference.bind(this);
    this._hide = this._hide.bind(this);
    this._hideAfterDelay = this._hideAfterDelay.bind(this);
    this._hideIfMouseOutsideTargetOrAttachment =
      this._hideIfMouseOutsideTargetOrAttachment.bind(this);
    this._hideOnClickOut = this._hideOnClickOut.bind(this);
    this._hideOnEscapeKey = this._hideOnEscapeKey.bind(this);
    this._hideOnLostFocus = this._hideOnLostFocus.bind(this);
    this._hideOnMouseLeaveTarget = this._hideOnMouseLeaveTarget.bind(this);
    this._show = this._show.bind(this);
    this._showAfterDelay = this._showAfterDelay.bind(this);
    this._updatePosition = this._updatePosition.bind(this);
    this._onPopoverTargetClick = this._onPopoverTargetClick.bind(this);
    this._onPopoverBeforeToggle = this._onPopoverBeforeToggle.bind(this);

    this._lastUseCaptureArgumentValue = this.useCapture;

    const core = this;
    this.api = {
      target: this.target,
      attachment: this.attachment,
      arrow: this.arrowModifier,
      reference: this.reference,
      setTarget: this.setTarget,
      setReference: this.setReference,
      show: this.show,
      hide: this.hide,
      toggle: this.toggle,
      update: this.update,
      get isShown() {
        return core.liveIsShown;
      },
      get shouldRender() {
        return core.shouldRenderFloatingElement;
      },
      get data() {
        return core._data;
      },
      get placement() {
        return core._resolvedPlacement ?? core.placement;
      },
      get middlewareData() {
        return core._middlewareData;
      },
    };

    if (ownerContext && typeof ownerContext === 'object') {
      registerDestructor(ownerContext, () => this.destroy());
    }
  }

  _setTracked(field, value) {
    if (this[field] !== value) {
      this[field] = value;
    }
  }

  _deprecateOnce(id, message) {
    runInDebug(() => {
      if (!this._warnedDeprecations.has(id)) {
        this._warnedDeprecations.add(id);
        deprecate(message, false, {
          id,
          until: '5.0.0',
          for: 'ember-attacher',
          since: {
            available: '4.4.0',
            enabled: '4.4.0',
          },
        });
      }
    });
  }

  _checkDeprecatedArgs(args) {
    if (!args) {
      return;
    }

    runInDebug(() => {
      const deprecatedArgs = [
        ['explicitTarget', 'ember-attacher.arg.explicit-target', 'Use @target instead.'],
        ['flip', 'ember-attacher.arg.flip', 'Pass `flip()` in @middleware instead.'],
        [
          'overflowPadding',
          'ember-attacher.arg.overflow-padding',
          'Pass `shift({ padding })` / `flip({ padding })` in @middleware instead.',
        ],
        [
          'floatingUiOptions',
          'ember-attacher.arg.floating-ui-options',
          'Use @placement, @strategy, and @middleware instead.',
        ],
        [
          'floatingElementContainer',
          'ember-attacher.arg.floating-element-container',
          'Attachments promote into the browser Top Layer via [popover="manual"] by default, or use @renderInPlace={{true}}.',
        ],
        [
          'isOffset',
          'ember-attacher.arg.is-offset',
          'The interactive safePolygon hover corridor is active automatically when @interactive={{true}}.',
        ],
        [
          'style',
          'ember-attacher.arg.style',
          'Style the attachment via CSS classes or custom properties instead.',
        ],
        [
          'additionalClass',
          'ember-attacher.arg.additional-class',
          'Use @class or `class="..."` instead.',
        ],
        [
          'onInitializeAttacher',
          'ember-attacher.arg.on-initialize-attacher',
          'Use an element modifier on the Target or Attachment instead.',
        ],
        [
          'onWillDestroy',
          'ember-attacher.arg.on-will-destroy',
          'Use an element modifier or `registerDestructor` instead.',
        ],
      ];

      for (let i = 0; i < deprecatedArgs.length; i++) {
        const [argName, id, hint] = deprecatedArgs[i];
        if (args[argName] !== undefined) {
          this._deprecateOnce(
            id,
            `[ember-attacher] Passing @${argName} is deprecated and will be removed in ember-attacher 5.0.0. ${hint}`
          );
        }
      }
    });
  }

  _arg(key) {
    const entryOpts = this._activeEntryOptions;
    if (entryOpts && entryOpts[key] !== undefined) {
      return entryOpts[key];
    }
    return this._getArgs()?.[key];
  }

  _opt(key) {
    const argVal = this._arg(key);
    if (argVal !== undefined) {
      return argVal;
    }
    const env = this._envConfig;
    const keyed = env[this.configKey];
    if (keyed && keyed[key] !== undefined) {
      return keyed[key];
    }
    if (env[key] !== undefined) {
      return env[key];
    }
    return DEFAULTS[key];
  }

  get arrow() {
    return this._opt('arrow');
  }
  get autoUpdate() {
    return this._opt('autoUpdate');
  }
  get animation() {
    return (
      this._arg('animation') ||
      this._envConfig[this.configKey]?.animation ||
      this._envConfig.animation ||
      DEFAULTS.animation
    );
  }
  get flip() {
    return this._opt('flip');
  }
  get hideDelay() {
    return this._opt('hideDelay');
  }
  get hideDuration() {
    return this._opt('hideDuration');
  }
  get hideOn() {
    return this._arg('hideOn') === null ? null : this._opt('hideOn');
  }
  get interactive() {
    return this._opt('interactive');
  }
  get isOffset() {
    return this._opt('isOffset');
  }
  get controlledIsShown() {
    return this._opt('isShown');
  }
  get liveIsShown() {
    return this._isShown;
  }
  get lazyRender() {
    return this._opt('lazyRender');
  }
  get overflowPadding() {
    return this._opt('overflowPadding');
  }
  get placement() {
    return this._opt('placement');
  }
  get renderInPlace() {
    return this._opt('renderInPlace');
  }
  get showDelay() {
    return this._opt('showDelay');
  }
  get showDuration() {
    return this._opt('showDuration');
  }
  get showOn() {
    return this._arg('showOn') === null ? null : this._opt('showOn');
  }
  get strategy() {
    return this._opt('strategy');
  }
  get style() {
    return this._opt('style');
  }
  get useCapture() {
    return this._opt('useCapture');
  }
  get class() {
    return (
      this._arg('class') ||
      this._envConfig[this.configKey]?.class ||
      this._envConfig.class
    );
  }
  get ariaRole() {
    return this._arg('ariaRole') || this._defaultAriaRole;
  }
  get explicitTarget() {
    const targetArg = this._arg('target');
    return targetArg !== undefined ? targetArg : this._arg('explicitTarget');
  }
  get floatingElementContainer() {
    return (
      this._arg('floatingElementContainer') ||
      this._envConfig[this.configKey]?.floatingElementContainer ||
      this._envConfig.floatingElementContainer ||
      DEFAULTS.floatingElementContainer
    );
  }
  get floatingUiOptions() {
    return (
      this._arg('floatingUiOptions') ||
      this._envConfig[this.configKey]?.floatingUiOptions ||
      this._envConfig.floatingUiOptions ||
      DEFAULTS.floatingUiOptions
    );
  }
  get configKey() {
    if (this._defaultConfigKey) {
      return this._defaultConfigKey;
    }
    const argKey = this._arg('configKey');
    if (argKey) {
      return argKey;
    }
    return this.ariaRole === 'tooltip' ? 'tooltip' : 'popover';
  }
  get _isTooltip() {
    return this.configKey === 'tooltip' || this.ariaRole === 'tooltip';
  }
  get isFillAnimation() {
    return this.animation === 'fill';
  }
  get renderFloatingElement() {
    return Boolean(this.renderInPlace || this._currentTarget);
  }
  get shouldRenderFloatingElement() {
    return !this.lazyRender || this._mustRender;
  }
  get id() {
    return this._arg('id') || this._elementId || this._defaultId;
  }
  get parentElement() {
    return this._parentElement;
  }

  get _class() {
    const showOrHideClass = `ember-attacher-${this._isStartingAnimation ? 'show' : 'hide'}`;
    const arrowClass = `ember-attacher-${this.arrow ? 'with' : 'without'}-arrow`;
    const additionalClass = this._getAdditionalClass
      ? this._getAdditionalClass()
      : this._arg('additionalClass') || '';
    return [
      `ember-attacher-${this.animation}`,
      this.class || '',
      additionalClass,
      showOrHideClass,
      arrowClass,
    ]
      .filter(Boolean)
      .join(' ');
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

  get isDestroyed() {
    return this._isDestroyed;
  }
  get isDestroying() {
    return this._isDestroyed;
  }
  get isHidden() {
    return this._isHidden;
  }
  get entryCount() {
    return this._registeredEntries.size;
  }

  isActiveTarget(element) {
    return this._currentTarget === element;
  }

  setHostElements(floatingElement, arrowElement = null) {
    if (this._floatingElement !== floatingElement) {
      if (this._floatingElement) {
        this._detachPopoverEvents(this._floatingElement);
      }
      this._floatingElement = floatingElement;
      if (floatingElement) {
        registerAttacher(this);
        this._attachPopoverEvents(floatingElement);
      } else {
        unregisterAttacher(this);
      }
    }
    this._setTracked('_arrowElement', arrowElement);
  }

  getHostRenderState() {
    const activeEl = this._currentTarget || this._registeredTarget;
    if (!activeEl) {
      return { activeElement: null, hasContent: false };
    }

    const entry = this._registeredEntries.get(activeEl);
    const parentElement =
      this._parentElement || this._listenerTarget?.parentElement || null;
    const reuseMountedContainer =
      !this._hasCustomFloatingElementContainer &&
      !this._renderInPlace &&
      !this._modalContainer &&
      this._floatingElement?.isConnected &&
      this._floatingElement.parentNode?.tagName !== 'DIALOG';
    let container;
    if (reuseMountedContainer) {
      container = this._floatingElement.parentNode;
    } else {
      container = resolveHostContainer({
        renderInPlace: this._renderInPlace,
        parentElement,
        maybeContainer: this.floatingElementContainer,
        hasCustomContainer: this._hasCustomFloatingElementContainer,
        modalContainer: this._modalContainer,
        usePopoverHost: this._usePopoverHost,
      });
    }

    return {
      activeElement: activeEl,
      id: this.id,
      role: this.ariaRole || 'tooltip',
      popoverAttr: this._popoverAttr,
      className: this._class,
      style: this._style,
      text: entry?.data != null ? String(entry.data) : '',
      hasContent: Boolean(entry && entry.data != null && entry.data !== ''),
      arrow: Boolean(this.arrow),
      isFillAnimation: this.isFillAnimation,
      isShown: this._isShown,
      isHiding: this._isHiding,
      container,
    };
  }

  _notifyRenderStateChange() {
    if (this._onRenderStateChange && !this._isDestroyed) {
      this._onRenderStateChange(this.getHostRenderState());
    }
  }

  get envConfig() {
    return this._envConfig;
  }

  get _envConfig() {
    const entryOwner =
      (this._currentTarget && this._registeredEntries.get(this._currentTarget)?.owner) ||
      (this._registeredTarget && this._registeredEntries.get(this._registeredTarget)?.owner) ||
      this._registeredEntries.values().next().value?.owner ||
      this._owner;

    return readEmberAttacherEnv(entryOwner);
  }

  get _hideOn() {
    return normalizeTriggerList(this.hideOn, DEFAULTS.hideOn);
  }

  get _showOn() {
    return normalizeTriggerList(this.showOn, DEFAULTS.showOn);
  }

  get _middleware() {
    return buildMiddleware({
      rawMiddleware: this._opt('middleware'),
      arrowElement: this._arrowElement,
      flipOption: this.flip,
      overflowPadding: this.overflowPadding,
      arrowEnabled:
        Boolean(this.arrow) || (!this._isComponentHost && Boolean(this._arrowElement)),
    });
  }

  get _hasCustomFloatingElementContainer() {
    return Boolean(
      this._arg('floatingElementContainer') ||
        this._envConfig[this.configKey]?.floatingElementContainer ||
        this._envConfig.floatingElementContainer
    );
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
      parentElement: this._parentElement,
      maybeContainer: this.floatingElementContainer,
      hasCustomContainer: this._hasCustomFloatingElementContainer,
      modalContainer: this._modalContainer,
      usePopoverHost: this._usePopoverHost,
    });
  }

  parentFinder = modifier((element, [hasTargetBlock]) => {
    if (hasTargetBlock !== undefined) {
      this._allowParentFallback = !hasTargetBlock;
    }
    const timer = schedule('actions', () => {
      if (!this._isDestroyed) {
        this._setTracked('_parentElement', element.parentElement);
        this._initializeAttacher();
      }
    });
    return () => cancel(timer);
  });

  // Insert + autoUpdate teardown. Must not read tracked state synchronously in
  // the modifier callback (the scheduled fn is fine) or tracked updates will re-fire teardown.
  setupFloatingElement = modifier((element, [hasTargetBlock]) => {
    if (hasTargetBlock !== undefined) {
      this._allowParentFallback = !hasTargetBlock;
    }
    this._floatingElement = element;
    registerAttacher(this);

    const timer = schedule('actions', () => {
      if (this._isDestroyed) {
        return;
      }

      this._floatingElement = element;
      this._attachPopoverEvents(element);

      if (this.renderInPlace) {
        this._setTracked('_parentElement', element.parentElement);
        this._initializeAttacher();
      } else {
        syncParentAttachment(this);
      }
    });

    return () => {
      cancel(timer);
      this._detachPopoverEvents(element);
      if (this._floatingElement === element) {
        this._floatingElement = null;
      }
      this._cleanup?.();
      this._cleanup = null;
    };
  });

  attachment = modifier((element) => {
    this._floatingElement = element;
    registerAttacher(this);

    const timer = schedule('actions', () => {
      if (this._isDestroyed) {
        return;
      }

      const hadId = Boolean(this._elementId);
      const elementHadExplicitId = Boolean(element.id && element.id !== this._defaultId);
      const hadTarget = Boolean(this._currentTarget);
      this._floatingElement = element;
      this._syncHeadlessAttachmentElement(element);
      this._attachPopoverEvents(element);
      syncParentAttachment(this);

      if ((elementHadExplicitId && !hadId && !this._arg('id')) || !hadTarget) {
        this._initializeAttacher();
      } else if (this._isShown && !this._isHiding) {
        if (element.style.display !== 'block') {
          this._cancelAnimation();
          this._applyVisibility(true);
        }
        this._startShowAnimation();
      }
    });

    return () => {
      cancel(timer);
      this._detachPopoverEvents(element);
      if (this._addedManagedPopover && element.getAttribute('popover') === 'manual') {
        element.removeAttribute('popover');
      }
      this._addedManagedPopover = false;
      if (this._floatingElement === element) {
        this._floatingElement = null;
      }
      this._cleanup?.();
      this._cleanup = null;
    };
  });

  insertArrow = onInsert((element) => {
    if (!this._isDestroyed) {
      this._setTracked('_arrowElement', element);
    }
  });

  arrowModifier = modifier((element) => {
    const timer = schedule('actions', () => {
      if (this._isDestroyed) {
        return;
      }
      this._setTracked('_arrowElement', element);
      if (!this._isHidden || this._isShown) {
        this._update();
      }
    });

    return () => {
      cancel(timer);
      if (!this._isDestroyed && this._arrowElement === element) {
        this._setTracked('_arrowElement', null);
      }
    };
  });

  isShownDidUpdate = onUpdate(() => this._syncIsShown());
  targetDidUpdate = onUpdate(() => this._initializeAttacher());
  optionsDidUpdate = onUpdate(() => {
    this._checkDeprecatedArgs(this._getArgs());
    this._ensureArgumentsAreValid();
    if (this._floatingElement && !this._isComponentHost) {
      this._syncHeadlessAttachmentElement(this._floatingElement);
    }
    this._syncAria();
    this._update();
  });

  scheduleArgsSync() {
    cancel(this._syncArgsTimer);
    this._syncArgsTimer = schedule('actions', () => {
      this._syncArgsTimer = null;
      if (this._isDestroyed) {
        return;
      }

      this._checkDeprecatedArgs(this._getArgs());

      const targetKey = `${this.showOn}|${this.hideOn}|${this.id}`;
      const explicitTarget = this.explicitTarget;
      if (
        !this._prevSyncedTargetKey ||
        this._prevSyncedTargetKey !== targetKey ||
        this._prevSyncedExplicitTarget !== explicitTarget
      ) {
        this._prevSyncedTargetKey = targetKey;
        this._prevSyncedExplicitTarget = explicitTarget;
        this._initializeAttacher();
      }

      const isShown = this.controlledIsShown;
      if (this._prevSyncedIsShown !== isShown) {
        this._prevSyncedIsShown = isShown;
        this._syncIsShown();
      }

      this._ensureArgumentsAreValid();
      if (this._floatingElement && !this._isComponentHost) {
        this._syncHeadlessAttachmentElement(this._floatingElement);
      }
      this._syncAria();
      this._update();
    });
  }

  target = createTargetModifier(this);

  reference = modifier((element) => {
    this._deprecateOnce(
      'ember-attacher.api.reference',
      '[ember-attacher] The yielded `reference` modifier is deprecated and will be removed in ember-attacher 5.0.0. Use `target` (e.g. `{{a.target}}`) instead.'
    );
    this.setReference(element);

    return () => {
      if (!this._isDestroyed && this._registeredTarget === element) {
        this.setReference(null);
      }
    };
  });

  /**
   * Owner used for the tooltip delay-group. Pool cores are constructed without an
   * Ember owner; fall back to the active/registered target's modifier owner.
   */
  get _delayGroupOwner() {
    return (
      this._owner ||
      (this._currentTarget && this._registeredEntries.get(this._currentTarget)?.owner) ||
      (this._registeredTarget && this._registeredEntries.get(this._registeredTarget)?.owner) ||
      this._registeredEntries.values().next().value?.owner ||
      null
    );
  }

  registerTargetElement(element, data, options = null, owner = null) {
    this._checkDeprecatedArgs(options);

    let entry = this._registeredEntries.get(element);
    const isNew = !entry;
    if (!entry) {
      entry = {
        element,
        data,
        options,
        owner,
        showListeners: {},
        showOnKey: null,
        useCapture: null,
      };
      this._registeredEntries.set(element, entry);
    } else {
      entry.data = data;
      entry.options = options;
      if (owner) {
        entry.owner = owner;
      }
    }

    if (owner && !this._owner) {
      this._owner = owner;
    }

    this._syncEntryShowListeners(entry);

    if (!isNew && (this._registeredTarget === element || this._currentTarget === element)) {
      this._activeEntryOptions = options;
      cancel(entry.updateTimer);
      entry.updateTimer = schedule('actions', () => {
        entry.updateTimer = null;
        if (this._isDestroyed) {
          return;
        }
        if (this._registeredTarget === element || this._currentTarget === element) {
          this._setTracked('_data', data);
          this._syncAria();
          this._notifyRenderStateChange();
          if (!this._isHidden || this._isShown) {
            this._update();
          }
        }
      });
    }

    return entry;
  }

  unregisterTargetElement(element) {
    const entry = this._registeredEntries.get(element);
    if (!entry) {
      return;
    }

    cancel(entry.updateTimer);
    this._removeEntryShowListeners(entry);
    this._registeredEntries.delete(element);

    if (this._listenerTarget === element) {
      this._removeHideEventListeners();
      this._aria.unbind();
      this._listenerTarget = null;
    }

    if (this._isDestroyed) {
      return;
    }

    if (this._registeredTarget === element || this._currentTarget === element) {
      this._activeEntryOptions = null;
      const shouldHide = !this._isHidden || this._isShown;

      schedule('actions', () => {
        if (this._isDestroyed) {
          return;
        }
        this._setTracked('_registeredTarget', null);
        this._setTracked('_data', undefined);
        if (shouldHide || !this._isHidden || this._isShown) {
          this._hide();
        }
        this._initializeAttacher();
      });
    }
  }

  _onRegisteredEntryMounted(element, data) {
    if (!this._registeredEntries.has(element)) {
      return;
    }
    const currentRegistered = this._registeredTarget;
    if (!currentRegistered || !this._registeredEntries.has(currentRegistered)) {
      this._setTracked('_registeredTarget', element);
      this._setTracked('_data', data);
      this._activeEntryOptions = this._registeredEntries.get(element)?.options || null;
      this._initializeAttacher();
    }
  }

  _syncHeadlessAttachmentElement(element) {
    if (!element) {
      return;
    }

    if (element.id && element.id !== this._defaultId) {
      this._elementId = element.id;
    } else if (!element.id) {
      element.id = this.id;
    }

    if (this.ariaRole && !element.hasAttribute('role')) {
      element.setAttribute('role', this.ariaRole);
    }

    if (this._usePopoverHost && !element.hasAttribute('popover')) {
      element.setAttribute('popover', 'manual');
      this._addedManagedPopover = true;
      if (!element.classList.contains('ember-attacher')) {
        element.style.inset = 'auto';
        element.style.margin = '0';
      }
    } else if (!this._usePopoverHost && this._addedManagedPopover) {
      element.removeAttribute('popover');
      this._addedManagedPopover = false;
    }

    if (this._isHidden && !this._isShown) {
      element.style.display = 'none';
      element.setAttribute('aria-hidden', 'true');
    }
  }

  _attachPopoverEvents(element) {
    if (!element || this._attachedPopoverEventsOn === element) {
      return;
    }
    this._detachPopoverEvents(this._attachedPopoverEventsOn);
    if (element.hasAttribute('popover') && typeof element.addEventListener === 'function') {
      element.addEventListener('beforetoggle', this._onPopoverBeforeToggle);
      this._attachedPopoverEventsOn = element;
    }
  }

  _detachPopoverEvents(element) {
    if (!element || this._attachedPopoverEventsOn !== element) {
      return;
    }
    element.removeEventListener('beforetoggle', this._onPopoverBeforeToggle);
    this._attachedPopoverEventsOn = null;
  }

  _onPopoverBeforeToggle(event) {
    if (this._isDestroyed || this._syncingPopoverHost) {
      return;
    }

    const trigger =
      this._pendingPopoverTrigger ||
      (event.source?.hasAttribute?.('popovertarget') ? event.source : null);
    this._pendingPopoverTrigger = null;

    if (!trigger && this._popoverTargetEntries.size === 0) {
      return;
    }

    if (event.newState === 'open') {
      if (trigger && this._currentTarget !== trigger) {
        this._switchTargetFromEvent(trigger, undefined, null);
      }
      if (this._isHidden) {
        this._skipNativePopoverToggle = true;
        try {
          this._show();
          this._addListenersForHideEvents();
        } finally {
          this._skipNativePopoverToggle = false;
        }
      }
    } else if (event.newState === 'closed' && !this._isHidden) {
      this._skipNativePopoverToggle = true;
      try {
        this._hide();
      } finally {
        this._skipNativePopoverToggle = false;
      }
    }
  }

  _onPopoverTargetClick(event) {
    const trigger = event.currentTarget;
    if (!trigger || this._isDestroyed) {
      return;
    }

    const floatingEl = this._floatingElement;
    const actionAttr = (trigger.getAttribute('popovertargetaction') || 'toggle').toLowerCase();

    // When the browser promotes `[popover]` natively, the native invoker runs after
    // click dispatch and emits `beforetoggle`, so avoid double-toggling here.
    if (floatingEl?.hasAttribute('popover') && typeof floatingEl.showPopover === 'function') {
      this._pendingPopoverTrigger = trigger;
      if (actionAttr !== 'hide' && this._currentTarget !== trigger) {
        this._switchTargetFromEvent(trigger, undefined, null);
      }
      return;
    }

    if (actionAttr === 'hide') {
      if (!this._isHidden) {
        this._hide();
      }
      return;
    }

    if (actionAttr === 'show' || this._isHidden || this._currentTarget !== trigger) {
      if (this._currentTarget !== trigger) {
        this._switchTargetFromEvent(trigger, undefined, null);
      }
      this._show();
      this._addListenersForHideEvents();
    } else {
      this._hide();
    }
  }

  _syncEntryShowListeners(entry) {
    const opts = entry.options || EMPTY_OBJECT;
    const baseArgs = this._getArgs() || EMPTY_OBJECT;
    const env = this._envConfig;
    const keyedEnv = env[this.configKey];
    const showOn = normalizeTriggerList(
      opts.showOn === undefined ? baseArgs.showOn : opts.showOn,
      keyedEnv?.showOn ?? env.showOn ?? DEFAULTS.showOn
    );
    const useCapture = Boolean(
      opts.useCapture ??
        baseArgs.useCapture ??
        keyedEnv?.useCapture ??
        env.useCapture ??
        DEFAULTS.useCapture
    );
    const showOnKey = showOn.join(' ');

    if (entry.showOnKey === showOnKey && entry.useCapture === useCapture) {
      return;
    }

    cancel(entry.updateTimer);
    this._removeEntryShowListeners(entry);
    entry.showOnKey = showOnKey;
    entry.useCapture = useCapture;

    for (const eventName of showOn) {
      const listener = (event) => {
        if (this._isDestroyed) {
          return;
        }
        if (
          eventName === 'click' &&
          this._currentTarget === entry.element &&
          (!this._isHidden || this._isShown) &&
          !this._isHiding &&
          this._hideOn.includes('click')
        ) {
          this._hideAfterDelay();
          return;
        }
        this._activateRegisteredEntry(entry);
        this._showAfterDelay(event);
      };
      entry.showListeners[eventName] = listener;
      entry.element.addEventListener(eventName, listener, useCapture);
    }
  }

  _removeEntryShowListeners(entry) {
    const listeners = entry.showListeners;
    const capture = Boolean(entry.useCapture);
    for (const eventName of Object.keys(listeners)) {
      entry.element.removeEventListener(eventName, listeners[eventName], capture);
      delete listeners[eventName];
    }
    entry.showOnKey = null;
  }

  _activateRegisteredEntry(entry) {
    const isTargetSwitch =
      this._currentTarget !== entry.element ||
      this._registeredTarget !== entry.element ||
      this._activeEntryOptions !== entry.options;

    this._activeEntryOptions = entry.options || null;
    this._setTracked('_data', entry.data);
    this._setTracked('_registeredTarget', entry.element);

    if (isTargetSwitch) {
      this._switchTargetFromEvent(entry.element, entry.data, entry.options || null);
    } else {
      this._notifyRenderStateChange();
    }
  }

  _switchTargetFromEvent(targetEl, data, options) {
    this._removeHideEventListeners();
    this._activeEntryOptions = options;
    this._setTracked('_data', data);
    this._setTracked('_registeredTarget', targetEl);
    this._listenerTarget = getListenerTarget(targetEl);
    this._setTracked('_currentTarget', targetEl);
    this._syncModalContainer();
    syncParentAttachment(this);
    this._aria.bind(this._listenerTarget, {
      isTooltip: this._isTooltip,
      id: this.id,
      ariaRole: this.ariaRole,
      isOpen: this._ariaOpen,
    });
    this._notifyRenderStateChange();
  }

  _syncPopoverTargetListeners(popoverTargets) {
    const nextSet = new Set(popoverTargets);

    for (const [el, listener] of this._popoverTargetEntries) {
      if (!nextSet.has(el)) {
        el.removeEventListener('click', listener, this.useCapture);
        this._popoverTargetEntries.delete(el);
      }
    }

    for (const el of nextSet) {
      if (!this._popoverTargetEntries.has(el)) {
        el.addEventListener('click', this._onPopoverTargetClick, this.useCapture);
        this._popoverTargetEntries.set(el, this._onPopoverTargetClick);
      }
    }
  }

  _clearPopoverTargetListeners() {
    for (const [el, listener] of this._popoverTargetEntries) {
      el.removeEventListener('click', listener, this.useCapture);
    }
    this._popoverTargetEntries.clear();
  }

  _syncModalContainer() {
    if (this._renderInPlace || this._hasCustomFloatingElementContainer) {
      this._setTracked('_modalContainer', null);
      return false;
    }

    const modalDialog = getModalDialogContainer(
      this._listenerTarget || this._parentElement
    );
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

    if (!this._floatingElement) {
      return;
    }

    this._floatingElement.style.display = isVisible ? 'block' : 'none';
    // Prevent jank until _startShowAnimation() positions the attachment.
    this._floatingElement.style.visibility = isVisible ? 'hidden' : '';

    this._syncingPopoverHost = true;
    try {
      if (!this._skipNativePopoverToggle) {
        if (isVisible) {
          showPopoverHost(this._floatingElement);
        } else {
          hidePopoverHost(this._floatingElement);
        }
      }
    } finally {
      this._syncingPopoverHost = false;
    }

    this._arg('onChange')?.(isVisible);
  }

  _setIsVisibleAfterDelay(isVisible, delay) {
    if (!this._floatingElement) {
      this._scheduleAnimationFrame(() => {
        if (this._isDestroyed || (isVisible ? this._isHiding : !this._isHiding)) {
          return;
        }
        this._setIsVisibleAfterDelay(isVisible, delay);
      });
      return;
    }

    if (delay) {
      this._delayedVisibilityToggle = later(
        this,
        () => {
          if (this._isDestroyed || (isVisible ? this._isHiding : !this._isHiding)) {
            return;
          }
          this._scheduleAnimationFrame(() => {
            if (this._isDestroyed || (isVisible ? this._isHiding : !this._isHiding)) {
              return;
            }
            this._applyVisibility(isVisible);
          });
        },
        delay
      );
    } else {
      this._applyVisibility(isVisible);
    }
  }

  show(target = undefined, data = undefined) {
    if (typeof Event !== 'undefined' && target instanceof Event) {
      target = undefined;
    }

    if (target !== undefined) {
      if (this._registeredEntries.has(target)) {
        const entry = this._registeredEntries.get(target);
        if (data !== undefined) {
          entry.data = data;
        }
        this._activateRegisteredEntry(entry);
      } else if (isElementTarget(target) || isVirtualReference(target)) {
        this._switchTargetFromEvent(target, data, this._activeEntryOptions);
      } else {
        runInDebug(() => {
          warn(
            '[ember-attacher] Ignoring non-Target argument passed to show().',
            false,
            { id: 'ember-attacher.invalid-show-target' }
          );
        });
      }
    }
    this._show();
    if (!this._isDestroyed) {
      next(this, () => {
        if (!this._isDestroyed && !this._isHidden) {
          this._addListenersForHideEvents();
        }
      });
    }
  }

  hide() {
    this._hide();
  }

  toggle() {
    if (this._isShown || !this._isHidden) {
      this.hide();
    } else {
      this.show();
    }
  }

  update() {
    this._updatePosition();
  }

  setTarget(target, data = undefined) {
    cancel(this._setReferenceTimer);

    if (data !== undefined) {
      this._pendingRegisteredData = data;
      this._hasPendingData = true;
    }

    this._setReferenceTimer = schedule('actions', () => {
      this._setReferenceTimer = null;

      if (this._isDestroyed) {
        return;
      }

      const nextTarget = target ?? null;
      const hasExplicitData = this._hasPendingData;
      const nextData = this._pendingRegisteredData;
      this._hasPendingData = false;
      this._pendingRegisteredData = undefined;

      if (hasExplicitData) {
        this._setTracked('_data', nextData);
      }

      if (this._registeredTarget === nextTarget && this._currentTarget === nextTarget) {
        return;
      }

      this._setTracked('_registeredTarget', nextTarget);
      this._initializeAttacher();
    });
  }

  setReference(target) {
    this._deprecateOnce(
      'ember-attacher.api.set-reference',
      '[ember-attacher] The yielded `setReference` method is deprecated and will be removed in ember-attacher 5.0.0. Use `setTarget` instead.'
    );
    this.setTarget(target);
  }

  _ensureArgumentsAreValid() {
    runInDebug(() => {
      if (this.useCapture !== this._lastUseCaptureArgumentValue) {
        warn('The value of the useCapture argument was mutated', {
          id: 'ember-attacher.use-capture-mutated',
        });
      }
    });
  }

  _syncAria() {
    this._aria.bind(this._listenerTarget, {
      isTooltip: this._isTooltip,
      id: this.id,
      ariaRole: this.ariaRole,
      isOpen: this._ariaOpen,
    });
  }

  _initializeAttacher() {
    if (this._isDestroyed) {
      return;
    }

    this._checkDeprecatedArgs(this._getArgs());

    this._removeLegacyShowEventListeners();
    this._removeHideEventListeners();

    const explicitId = this._arg('id') || this._elementId;
    const popoverTargets = explicitId ? findPopoverTargetElements(explicitId) : [];
    this._syncPopoverTargetListeners(popoverTargets);

    const target = resolveAttachmentTarget({
      explicitTarget: this.explicitTarget,
      registeredTarget: this._registeredTarget,
      popoverTargets,
      parentElement: this._parentElement,
      allowParentFallback: this._allowParentFallback,
    });

    const usedParentFallback =
      this._allowParentFallback &&
      this.explicitTarget == null &&
      this._registeredTarget == null &&
      popoverTargets.length === 0 &&
      target != null &&
      target === this._parentElement;

    if (usedParentFallback) {
      this._deprecateOnce(
        'ember-attacher.implicit-parent-target',
        '[ember-attacher] Attaching implicitly to the parent DOM element is deprecated and will be removed in ember-attacher 5.0.0. Bind an explicit Target with {{tooltip}}, @target, {{a.target}}, <:target>, or [popovertarget].'
      );
    }

    this._listenerTarget = getListenerTarget(target);
    this._setTracked('_currentTarget', target);

    if (target && this._registeredEntries.has(target)) {
      const entry = this._registeredEntries.get(target);
      this._activeEntryOptions = entry.options || null;
      this._setTracked('_data', entry.data);
    }

    this._syncModalContainer();
    syncParentAttachment(this);
    this._addLegacyShowListenersIfUnregistered();
    this._notifyRenderStateChange();

    const shouldBeOpen =
      (!this._isHiding && (!this._isHidden || this._isShown)) ||
      Boolean(this.controlledIsShown);
    if (shouldBeOpen) {
      this._ariaOpen = true;
      this._syncAria();
      this._addListenersForHideEvents();
      if (!this._isShown) {
        this._show();
      } else if (this._floatingElement && this._floatingElement.style.display !== 'block') {
        this._cancelAnimation();
        this._applyVisibility(true);
        this._startShowAnimation();
      } else {
        this._update();
      }
    } else {
      this._ariaOpen = false;
      this._syncAria();
    }

    this._arg('onInitializeAttacher')?.(this._currentTarget, this.id);
  }

  _addLegacyShowListenersIfUnregistered() {
    const target = this._listenerTarget;
    if (!target || this._registeredEntries.has(target) || this._popoverTargetEntries.has(target)) {
      return;
    }

    this._showOn.forEach((event) => {
      this._legacyShowListenersOnTargetByEvent[event] = this._showAfterDelay;
      target.addEventListener(event, this._showAfterDelay, this.useCapture);
    });
  }

  _removeLegacyShowEventListeners() {
    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    Object.keys(this._legacyShowListenersOnTargetByEvent).forEach((event) => {
      target.removeEventListener(
        event,
        this._legacyShowListenersOnTargetByEvent[event],
        this.useCapture
      );
      delete this._legacyShowListenersOnTargetByEvent[event];
    });
  }

  _removeHideEventListeners({ restoreClickShow = false } = {}) {
    this._mouseLeaveOrigin = null;
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      document.removeEventListener(
        eventType,
        this._hideListenersOnDocumentByEvent[eventType],
        this.useCapture
      );
      delete this._hideListenersOnDocumentByEvent[eventType];
    });

    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    if (
      restoreClickShow &&
      this._showOn.includes('click') &&
      !this._registeredEntries.has(target) &&
      !this._popoverTargetEntries.has(target)
    ) {
      const hideOnClickListener = this._hideListenersOnTargetByEvent.click;
      if (hideOnClickListener) {
        target.removeEventListener('click', hideOnClickListener, this.useCapture);
        delete this._hideListenersOnTargetByEvent.click;
      }

      this._legacyShowListenersOnTargetByEvent.click = this._showAfterDelay;
      target.addEventListener('click', this._showAfterDelay, this.useCapture);
    }

    Object.keys(this._hideListenersOnTargetByEvent).forEach((event) => {
      target.removeEventListener(
        event,
        this._hideListenersOnTargetByEvent[event],
        this.useCapture
      );
      delete this._hideListenersOnTargetByEvent[event];
    });
  }

  _syncIsShown() {
    const isShown = this.controlledIsShown;

    if (isShown === true && this._isHidden) {
      this._show();
      next(this, () => {
        if (!this._isDestroyed) {
          this._addListenersForHideEvents();
        }
      });
    } else if (isShown === false && !this._isHidden) {
      this._hide();
    }
  }

  _showAfterDelay(event) {
    if (this._suppressFocusShow && (event?.type === 'focus' || event?.type === 'focusin')) {
      return;
    }

    cancel(this._delayedVisibilityToggle);
    this._cancelAnimation();

    this._isHiding = false;
    this._setTracked('_mustRender', true);
    syncParentAttachment(this);

    this._addListenersForHideEvents();

    const parsedShowDelay = parseInt(this.showDelay, 10) || 0;
    const isWarm = Boolean(
      this._isTooltip && peekDelayGroup(this._delayGroupOwner)?.isWarmFor(this)
    );
    const effectiveDelay = isWarm ? 0 : parsedShowDelay;

    this._delayedVisibilityToggle = debounce(
      this,
      this._show,
      effectiveDelay,
      !effectiveDelay
    );
  }

  _show() {
    cancel(this._delayedVisibilityToggle);
    this._cancelAnimation();

    if (!this._currentTarget) {
      return;
    }

    this._restoreFocusOnHide = false;
    this._isHiding = false;
    this._positioningSuspended = false;
    this._setTracked('_mustRender', true);
    this._setTracked('_isShown', true);
    this._ariaOpen = true;
    this._aria.setOpen(true);

    if (this._isTooltip && this.controlledIsShown !== true) {
      getDelayGroup(this._delayGroupOwner)?.open(this);
    }

    const modalContainerChanged = this._syncModalContainer();
    syncParentAttachment(this);
    this._notifyRenderStateChange();

    if (modalContainerChanged) {
      next(this, () => {
        if (!this._isDestroyed && !this._isHiding && this._currentTarget) {
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
    this._scheduleAnimationFrame(() => {
      if (this._isDestroyed || !this._currentTarget || this._isHiding) {
        return;
      }

      const floatingElement = this._floatingElement;
      if (!floatingElement || floatingElement.style.display === 'none') {
        this._startShowAnimation();
        return;
      }

      this._update();

      this._scheduleAnimationFrame(() => {
        if (this._isDestroyed || !this._currentTarget || this._isHiding) {
          return;
        }
        run(() => {
          if (this._isDestroyed || !this._currentTarget || this._isHiding) {
            return;
          }
          if (
            !floatingElement.hasAttribute('data-reference-hidden') &&
            !floatingElement.hasAttribute('data-escaped')
          ) {
            floatingElement.style.visibility = '';
          }
          const showDuration = parseInt(this.showDuration, 10) || 0;
          floatingElement.style.setProperty(
            '--ember-attacher-transition-duration',
            `${showDuration}ms`
          );
          this._setTracked('_isStartingAnimation', true);
          this._notifyRenderStateChange();
          floatingElement.setAttribute('aria-hidden', 'false');
        });

        this._isHidden = false;
      });
    });
  }

  _hideAfterDelay() {
    cancel(this._delayedVisibilityToggle);
    this._isHiding = true;

    const hideDelay = parseInt(this.hideDelay, 10) || 0;
    this._delayedVisibilityToggle = debounce(this, this._hide, hideDelay, !hideDelay);
  }

  _hide() {
    const wasShown = this._isShown || !this._isHidden;
    cancel(this._delayedVisibilityToggle);
    this._cancelAnimation();
    this._isHiding = true;
    this._positioningSuspended = true;
    this._ariaOpen = false;
    this._mouseLeaveOrigin = null;
    this._setTracked('_isShown', false);
    this._cleanup?.();
    this._cleanup = null;

    if (this._isTooltip) {
      peekDelayGroup(this._delayGroupOwner)?.close(this, { markWarm: wasShown });
    }

    this._removeHideEventListeners({ restoreClickShow: true });

    if (!this._floatingElement) {
      this._setTracked('_isStartingAnimation', false);
      this._aria.setOpen(false);
      this._isHidden = true;
      return;
    }

    this._scheduleAnimationFrame(() => {
      if (this._isDestroyed || !this._isHiding) {
        return;
      }

      const hideDuration = parseInt(this.hideDuration, 10) || 0;

      run(() => {
        if (this._isDestroyed || !this._isHiding) {
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

        if (this._floatingElement) {
          this._floatingElement.style.setProperty(
            '--ember-attacher-transition-duration',
            `${hideDuration}ms`
          );
          this._floatingElement.setAttribute('aria-hidden', 'true');
        }
        this._setTracked('_isStartingAnimation', false);
        this._notifyRenderStateChange();
        this._aria.setOpen(false);
        this._setIsVisibleAfterDelay(false, hideDuration);
      });

      this._isHidden = true;
    });
  }

  _addListenersForHideEvents() {
    const hideOn = this._hideOn;
    const target = this._listenerTarget;

    if (!this._currentTarget || this._isDestroyed) {
      return;
    }

    const entry = target ? this._registeredEntries.get(target) : null;
    const entryHandlesClickToggle =
      Boolean(entry && entry.showOnKey?.split(' ').includes('click')) ||
      Boolean(target && this._popoverTargetEntries.has(target));

    if (target && hideOn.includes('click') && !entryHandlesClickToggle) {
      const showOnClickListener = this._legacyShowListenersOnTargetByEvent.click;
      if (showOnClickListener) {
        target.removeEventListener('click', showOnClickListener, this.useCapture);
        delete this._legacyShowListenersOnTargetByEvent.click;
      }

      this._hideListenersOnTargetByEvent.click = this._hideAfterDelay;
      target.addEventListener('click', this._hideAfterDelay, this.useCapture);
    }

    if (hideOn.includes('clickout') && !this._hideListenersOnDocumentByEvent.click && !this._hideListenersOnDocumentByEvent.touchend) {
      const clickoutEvent = 'ontouchstart' in window ? 'touchend' : 'click';
      this._hideListenersOnDocumentByEvent[clickoutEvent] = this._hideOnClickOut;
      document.addEventListener(clickoutEvent, this._hideOnClickOut, this.useCapture);
    }

    if (hideOn.includes('escapekey') && !this._hideListenersOnDocumentByEvent.keydown) {
      this._hideListenersOnDocumentByEvent.keydown = this._hideOnEscapeKey;
      document.addEventListener('keydown', this._hideOnEscapeKey, this.useCapture);
    }

    if (target && hideOn.includes('mouseleave') && !this._hideListenersOnTargetByEvent.mouseleave) {
      this._hideListenersOnTargetByEvent.mouseleave = this._hideOnMouseLeaveTarget;
      target.addEventListener('mouseleave', this._hideOnMouseLeaveTarget, this.useCapture);
    }

    if (target) {
      ['blur', 'focusout'].forEach((eventType) => {
        if (hideOn.includes(eventType) && !this._hideListenersOnTargetByEvent[eventType]) {
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
        document.addEventListener(
          'mousemove',
          this._hideIfMouseOutsideTargetOrAttachment,
          this.useCapture
        );
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
      !isCursorInSafePolygon(
        event,
        this._mouseLeaveOrigin,
        this._currentTarget,
        this._floatingElement
      ) &&
      this._floatingElement &&
      !this._floatingElement.contains(event.target)
    ) {
      this._mouseLeaveOrigin = null;
      delete this._hideListenersOnDocumentByEvent.mousemove;
      document.removeEventListener(
        'mousemove',
        this._hideIfMouseOutsideTargetOrAttachment,
        this.useCapture
      );
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

    if (
      target.contains(event.relatedTarget) ||
      descendantAttachmentContainsNode(this, event.relatedTarget)
    ) {
      return;
    }

    if (!this.interactive || !this._floatingElement?.contains(event.relatedTarget)) {
      this._hideAfterDelay();
    }
  }

  _update() {
    this._cleanup?.();
    this._cleanup = null;

    if (
      this._isDestroyed ||
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

  _updatePosition() {
    if (this._isDestroyed || !this._currentTarget || !this._floatingElement) {
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
          this._isDestroyed ||
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

        this._setTracked('_resolvedPlacement', placement);
        if (!shallowValueEqual(this._middlewareData, middlewareData)) {
          this._middlewareData = middlewareData;
        }
      })
      .catch((error) => {
        animationTestWaiter.endAsync(computePositionToken);

        if (!this._isDestroyed) {
          warn(`[ember-attacher] Positioning error: ${error?.message ?? error}`, {
            id: 'ember-attacher.positioning-error',
          });
        }
      });
  }

  _scheduleAnimationFrame(callback) {
    if (typeof requestAnimationFrame !== 'function') {
      return;
    }
    const token = animationTestWaiter.beginAsync();
    const entry = { id: null, token };
    entry.id = requestAnimationFrame(() => {
      this._pendingRafs.delete(entry);
      animationTestWaiter.endAsync(token);
      callback();
    });
    this._pendingRafs.add(entry);
  }

  _cancelAnimation() {
    for (const entry of this._pendingRafs) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(entry.id);
      }
      animationTestWaiter.endAsync(entry.token);
    }
    this._pendingRafs.clear();
  }

  destroy() {
    if (this._isDestroyed) {
      return;
    }
    this._isDestroyed = true;

    peekDelayGroup(this._delayGroupOwner)?.close(this, { markWarm: false });
    unregisterAttacher(this);

    this._cleanup?.();
    this._cleanup = null;

    cancel(this._syncArgsTimer);
    cancel(this._setReferenceTimer);
    this._cancelAnimation();
    cancel(this._delayedVisibilityToggle);

    this._detachPopoverEvents(this._attachedPopoverEventsOn);
    this._aria.unbind();
    this._removeLegacyShowEventListeners();
    this._removeHideEventListeners();
    this._clearPopoverTargetListeners();

    for (const entry of this._registeredEntries.values()) {
      cancel(entry.updateTimer);
      this._removeEntryShowListeners(entry);
    }
    this._registeredEntries.clear();

    this._checkDeprecatedArgs(this._getArgs());
    this._arg('onWillDestroy')?.(this._currentTarget, this.id);
  }
}
