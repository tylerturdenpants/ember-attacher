import { getOwner } from '@ember/application';
import { helper } from '@ember/component/helper';
import { registerDestructor } from '@ember/destroyable';
import { isHTMLSafe } from '@ember/template';
import { assert, deprecate, runInDebug, warn } from '@ember/debug';
import { autoUpdate, computePosition } from '@floating-ui/dom';
import { tracked } from '@glimmer/tracking';
import Modifier, { modifier } from 'ember-modifier';
import DEFAULTS, { POPOVER_DEFAULTS } from '../defaults';
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
  showPopoverHost,
  supportsPopoverHost,
} from './host.js';
import {
  applyPositionResult,
  buildMiddleware,
  isTargetConnected,
} from './positioning.js';
import {
  attacherWaiter,
  cancelScheduled,
  debounceTimeout,
  scheduleMicrotask,
} from './schedule.js';
import {
  findTriggerTargetElements,
  getListenerTarget,
  isElementTarget,
  isVirtualReference,
  resolveAttachmentTarget,
} from './target-resolution.js';

let nextInstanceNumber = 0;

function nextFloatingId() {
  nextInstanceNumber += 1;
  return `ember-attacher-${nextInstanceNumber}-floating`;
}

export function resolveTooltipClass(envConfig) {
  const { tooltip, tooltipClass } = envConfig || {};
  return tooltip?.tooltipClass ?? tooltipClass ?? DEFAULTS.tooltipClass;
}

const TRUTHY_OPTION_KEYS = new Set(['animation', 'class', 'floatingUiOptions']);
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

function resolveOwnerRootElement(owner, doc) {
  if (!doc) {
    return null;
  }

  let root = null;
  if (owner && typeof owner.lookup === 'function') {
    root = owner.lookup('application:main')?.rootElement ?? null;
  }

  if (root instanceof Element) {
    return root;
  }
  if (typeof root === 'string') {
    const matched = doc.querySelector(root);
    if (matched) {
      return matched;
    }
  }

  return doc.querySelector('.ember-application') || doc.body;
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

function createTargetModifier(core) {
  return class AttacherTargetModifier extends Modifier {
    _element = null;
    _installed = false;
    _destroyed = false;
    _mountHandle = null;

    constructor(owner, args) {
      super(owner, args);
      registerDestructor(this, () => {
        this._destroyed = true;
        cancelScheduled(this._mountHandle);
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

      core._usedTargetModifier = true;
      const data = positional.length > 0 ? positional[0] : named?.data;
      const entry = core.registerTargetElement(element, data, null, getOwner(this));

      if (!this._installed) {
        this._installed = true;
        this._element = element;
        this._mountHandle = scheduleMicrotask(() => {
          this._mountHandle = null;
          if (!this._destroyed && !core.isDestroyed) {
            core._onRegisteredEntryMounted(element, entry.data);
          }
        });
      }
    }
  };
}

/**
 * Shared reactive controller backing `<AttachTooltip>`, `<AttachPopover>`,
 * `<Attacher>`, and the `{{tooltip}}` singleton pool.
 */
export default class AttacherCore {
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
  _hasTargetBlock = false;
  _usedTargetModifier = false;
  _usedSetTarget = false;
  _hasCheckedInitialTarget = false;
  _setReferenceHandle = null;
  _syncArgsHandle = null;
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
  _prevSyncedIsShown = undefined;
  _prevSyncedTargetKey = undefined;
  _prevSyncedExplicitTarget = undefined;
  _lastShownByDelay = 0;
  _closeGeneration = 0;
  _activeCloseCancel = null;

  syncArgs = helper((positional) => {
    for (let i = 0; i < positional.length; i++) {
      void positional[i];
    }
    this.scheduleArgsSync();
    return '';
  });

  constructor(
    ownerContext,
    getArgs,
    {
      defaultConfigKey = null,
      defaultAriaRole = undefined,
      getAdditionalClass = null,
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
    this._isComponentHost = isComponentHost;
    this._onRenderStateChange = onRenderStateChange;
    this._defaultId = nextFloatingId();

    this._delayedVisibilityToggle = null;
    this._isHidden = true;
    this._isHiding = false;
    this._positioningSuspended = true;
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

    this._lastUseCaptureArgumentValue = this._opt('useCapture');

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
        return core._resolvedPlacement ?? core._opt('placement');
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

  _defaultFor(key) {
    if (!this._isTooltip && this.configKey === 'popover' && key in POPOVER_DEFAULTS) {
      return POPOVER_DEFAULTS[key];
    }
    return DEFAULTS[key];
  }

  _opt(key) {
    const argVal = this._arg(key);
    if ((key === 'showOn' || key === 'hideOn') && argVal === null) {
      return null;
    }

    const truthyOnly = TRUTHY_OPTION_KEYS.has(key);
    if (truthyOnly ? argVal : argVal != null) {
      return argVal;
    }

    const env = this._envConfig;
    const keyed = env[this.configKey];
    const keyedVal = keyed?.[key];
    if (truthyOnly ? keyedVal : keyedVal != null) {
      return keyedVal;
    }

    const envVal = env[key];
    if (truthyOnly ? envVal : envVal != null) {
      return envVal;
    }

    return this._defaultFor(key);
  }

  get ariaRole() {
    return this._arg('ariaRole') || this._defaultAriaRole;
  }

  get explicitTarget() {
    const targetArg = this._arg('target');
    return targetArg !== undefined ? targetArg : this._arg('explicitTarget');
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

  get arrow() {
    return Boolean(this._opt('arrow'));
  }

  get isFillAnimation() {
    return this._opt('animation') === 'fill';
  }

  get shouldRenderFloatingElement() {
    return !this._opt('lazyRender') || this._mustRender;
  }

  get id() {
    return this._arg('id') || this._elementId || this._defaultId;
  }

  get popoverAttr() {
    return this._usePopoverHost ? 'manual' : undefined;
  }

  get liveIsShown() {
    return this._isShown;
  }

  get innerClass() {
    const showOrHideClass = `ember-attacher-${this._isStartingAnimation ? 'show' : 'hide'}`;
    const arrowClass = `ember-attacher-${this.arrow ? 'with' : 'without'}-arrow`;
    const additionalClass = this._getAdditionalClass
      ? this._getAdditionalClass()
      : this._arg('additionalClass') || '';
    return [
      `ember-attacher-${this._opt('animation')}`,
      this._opt('class') || '',
      additionalClass,
      showOrHideClass,
      arrowClass,
    ]
      .filter(Boolean)
      .join(' ');
  }

  get innerStyle() {
    const style = this._opt('style');
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
    const ownerForRoot = entry?.owner || this._owner;
    const container =
      typeof document !== 'undefined'
        ? this._modalContainer || resolveOwnerRootElement(ownerForRoot, document)
        : null;

    return {
      activeElement: activeEl,
      id: this.id,
      role: this.ariaRole || 'tooltip',
      popoverAttr: this.popoverAttr,
      className: this.innerClass,
      style: this.innerStyle,
      text: entry?.data != null ? String(entry.data) : '',
      hasContent: Boolean(entry && entry.data != null && entry.data !== ''),
      arrow: this.arrow,
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
    const fallback = this._defaultFor('hideOn');
    return normalizeTriggerList(this._opt('hideOn'), fallback);
  }

  get _showOn() {
    const fallback = this._defaultFor('showOn');
    return normalizeTriggerList(this._opt('showOn'), fallback);
  }

  get _middleware() {
    return buildMiddleware({
      rawMiddleware: this._opt('middleware'),
      arrowElement: this._arrowElement,
      flipOption: this._opt('flip'),
      overflowPadding: this._opt('overflowPadding'),
      arrowEnabled: this.arrow || (!this._isComponentHost && Boolean(this._arrowElement)),
    });
  }

  get _usePopoverHost() {
    return supportsPopoverHost() && !this._renderInPlace;
  }

  get _renderInPlace() {
    return typeof document !== 'undefined' ? Boolean(this._opt('renderInPlace')) : true;
  }

  get _delayGroupOwner() {
    return (
      this._owner ||
      (this._currentTarget && this._registeredEntries.get(this._currentTarget)?.owner) ||
      (this._registeredTarget && this._registeredEntries.get(this._registeredTarget)?.owner) ||
      this._registeredEntries.values().next().value?.owner ||
      null
    );
  }

  _hasSuppliedTargetBinding() {
    const args = this._getArgs() || EMPTY_OBJECT;
    if (
      'target' in args ||
      'explicitTarget' in args ||
      this._hasTargetBlock ||
      this._usedTargetModifier ||
      this._usedSetTarget ||
      this._registeredTarget != null ||
      this._registeredEntries.size > 0 ||
      this._popoverTargetEntries.size > 0 ||
      this._currentTarget != null
    ) {
      return true;
    }

    const explicitId = this._arg('id') || this._elementId;
    if (explicitId) {
      const { allTargets } = findTriggerTargetElements(explicitId);
      if (allTargets.length > 0) {
        return true;
      }
    }

    return false;
  }

  _assertInitialTargetBinding() {
    if (!this._isComponentHost || this._hasCheckedInitialTarget || typeof document === 'undefined') {
      return;
    }
    this._hasCheckedInitialTarget = true;

    runInDebug(() => {
      assert(
        '[ember-attacher] <AttachTooltip> and <AttachPopover> require a Target in 5.0.0. Supply @target, <:target>, {{a.target}}, a.setTarget(), [popovertarget], or [interestfor].',
        this._hasSuppliedTargetBinding()
      );
    });
  }

  // In-place host mount & cleanup for `<AttachTooltip>` / `<AttachPopover>` (pass 1).
  setupFloatingElement = modifier((element, [hasTargetBlock]) => {
    this._hasTargetBlock = Boolean(hasTargetBlock);
    this._floatingElement = element;
    registerAttacher(this);
    this._attachPopoverEvents(element);
    this.scheduleArgsSync();

    return () => {
      this._detachPopoverEvents(element);
      if (this._floatingElement === element) {
        this._floatingElement = null;
      }
      this._cleanup?.();
      this._cleanup = null;
    };
  });

  // Headless `<Attacher as |a|>` floating element modifier.
  attachment = modifier((element) => {
    this._floatingElement = element;
    registerAttacher(this);

    const handle = scheduleMicrotask(() => {
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
        this._applyVisibility(true);
        this._update();
      }
    });

    return () => {
      cancelScheduled(handle);
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

  arrowModifier = modifier((element) => {
    const handle = scheduleMicrotask(() => {
      if (this._isDestroyed) {
        return;
      }
      this._setTracked('_arrowElement', element);
      if (!this._isHidden || this._isShown) {
        this._update();
      }
    });

    return () => {
      cancelScheduled(handle);
      if (!this._isDestroyed && this._arrowElement === element) {
        this._setTracked('_arrowElement', null);
      }
    };
  });

  insertArrow = this.arrowModifier;

  scheduleArgsSync() {
    cancelScheduled(this._syncArgsHandle);
    this._syncArgsHandle = scheduleMicrotask(() => {
      this._syncArgsHandle = null;
      if (this._isDestroyed) {
        return;
      }

      this._checkDeprecatedArgs(this._getArgs());

      const targetKey = `${this._opt('showOn')}|${this._opt('hideOn')}|${this.id}|${this._renderInPlace}`;
      const explicitTarget = this.explicitTarget;
      const isInitialSync = !this._prevSyncedTargetKey;
      const targetChanged =
        isInitialSync ||
        this._prevSyncedTargetKey !== targetKey ||
        this._prevSyncedExplicitTarget !== explicitTarget;

      if (targetChanged) {
        this._prevSyncedTargetKey = targetKey;
        this._prevSyncedExplicitTarget = explicitTarget;
        this._initializeAttacher();
      }

      if (isInitialSync) {
        this._assertInitialTargetBinding();
      }

      const isShown = this._opt('isShown');
      if (this._prevSyncedIsShown !== isShown) {
        this._prevSyncedIsShown = isShown;
        this._syncIsShown();
      }

      this._ensureArgumentsAreValid();
      if (this._floatingElement && !this._isComponentHost) {
        this._syncHeadlessAttachmentElement(this._floatingElement);
      }
      this._syncAria();
      if (!targetChanged) {
        this._update();
      }
    });
  }

  target = createTargetModifier(this);

  reference = modifier((element) => {
    this._deprecateOnce(
      'ember-attacher.api.reference',
      '[ember-attacher] The yielded `reference` modifier is deprecated and will be removed in ember-attacher 5.0.0. Use `target` (e.g. `{{a.target}}`) instead.'
    );
    this._usedTargetModifier = true;
    this.setTarget(element);

    return () => {
      if (!this._isDestroyed && this._registeredTarget === element) {
        this.setTarget(null);
      }
    };
  });

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
        updateHandle: null,
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
      cancelScheduled(entry.updateHandle);
      entry.updateHandle = scheduleMicrotask(() => {
        entry.updateHandle = null;
        if (this._isDestroyed) {
          return;
        }
        if (this._registeredTarget === element || this._currentTarget === element) {
          this._setTracked('_data', data);
          this._notifyRenderStateChange();
          this._syncAria();
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

    cancelScheduled(entry.updateHandle);
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

      scheduleMicrotask(() => {
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

    if (this._isHidden && !this._isShown && !element.classList.contains('ember-attacher')) {
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
    const showOnFallback = keyedEnv?.showOn ?? env.showOn ?? this._defaultFor('showOn');
    const showOn = normalizeTriggerList(
      opts.showOn === undefined ? baseArgs.showOn : opts.showOn,
      showOnFallback
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

    cancelScheduled(entry.updateHandle);
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
    this._notifyRenderStateChange();
    this._syncAria();
  }

  _syncPopoverTargetListeners(popoverTargets) {
    const nextSet = new Set(popoverTargets);
    const useCapture = Boolean(this._opt('useCapture'));

    for (const [el, listener] of this._popoverTargetEntries) {
      if (!nextSet.has(el)) {
        el.removeEventListener('click', listener, useCapture);
        this._popoverTargetEntries.delete(el);
      }
    }

    for (const el of nextSet) {
      if (!this._popoverTargetEntries.has(el)) {
        el.addEventListener('click', this._onPopoverTargetClick, useCapture);
        this._popoverTargetEntries.set(el, this._onPopoverTargetClick);
      }
    }
  }

  _clearPopoverTargetListeners() {
    const useCapture = Boolean(this._opt('useCapture'));
    for (const [el, listener] of this._popoverTargetEntries) {
      el.removeEventListener('click', listener, useCapture);
    }
    this._popoverTargetEntries.clear();
  }

  _syncModalContainer() {
    if (this._renderInPlace) {
      this._setTracked('_modalContainer', null);
      return false;
    }

    const modalDialog = getModalDialogContainer(this._listenerTarget);
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
      return;
    }

    this._isHidden = false;
    const el = this._floatingElement;
    if (!el) {
      return;
    }

    const showDuration = parseInt(this._opt('showDuration'), 10) || 0;
    const initialPlacement = this._opt('placement') || DEFAULTS.placement;

    el.removeAttribute('data-closing');
    if (!el.hasAttribute('data-placement')) {
      el.setAttribute('data-placement', initialPlacement);
    }
    if (!el.hasAttribute('x-placement')) {
      el.setAttribute('x-placement', initialPlacement);
    }

    el.style.setProperty('--ember-attacher-transition-duration', `${showDuration}ms`);

    if (!el.classList.contains('ember-attacher')) {
      el.style.display = 'block';
    } else if (el.style.display === 'none') {
      el.style.display = '';
    }

    if (!el.style.left) {
      // Avoid a 0,0 flash for the microtask before computePosition() resolves.
      el.style.visibility = 'hidden';
    } else if (
      !el.hasAttribute('data-reference-hidden') &&
      !el.hasAttribute('data-escaped')
    ) {
      el.style.visibility = '';
    }

    el.setAttribute('data-open', '');
    el.setAttribute('aria-hidden', 'false');
    this._setTracked('_isStartingAnimation', true);

    this._syncingPopoverHost = true;
    try {
      if (!this._skipNativePopoverToggle) {
        showPopoverHost(el);
      }
    } finally {
      this._syncingPopoverHost = false;
    }

    this._arg('onChange')?.(true);
  }

  _waitForExitAnimations(element, hideDuration, onDone) {
    if (hideDuration <= 0 || !element || typeof element.getAnimations !== 'function') {
      onDone();
      return;
    }

    const animations = element.getAnimations({ subtree: true });
    if (animations.length === 0) {
      onDone();
      return;
    }

    const generation = this._closeGeneration;
    const token = attacherWaiter.beginAsync();
    let done = false;
    let failsafeId = null;

    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      if (failsafeId !== null) {
        clearTimeout(failsafeId);
        failsafeId = null;
      }
      attacherWaiter.endAsync(token);
      this._activeCloseCancel = null;
      if (!this._isDestroyed && this._closeGeneration === generation && this._isHiding) {
        onDone();
      }
    };

    this._activeCloseCancel = () => {
      if (!done) {
        done = true;
        if (failsafeId !== null) {
          clearTimeout(failsafeId);
          failsafeId = null;
        }
        attacherWaiter.endAsync(token);
        this._activeCloseCancel = null;
      }
    };

    failsafeId = setTimeout(finish, Math.max(hideDuration + 250, 2000));
    Promise.allSettled(animations.map((anim) => anim.finished)).then(finish);
  }

  _finishHide() {
    const el = this._floatingElement;
    if (el) {
      el.style.setProperty('--ember-attacher-transition-duration', '0ms');
      el.removeAttribute('data-closing');
      el.removeAttribute('data-open');

      if (!el.classList.contains('ember-attacher')) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
      el.style.visibility = '';

      this._syncingPopoverHost = true;
      try {
        if (!this._skipNativePopoverToggle) {
          hidePopoverHost(el);
        }
      } finally {
        this._syncingPopoverHost = false;
      }
    }

    this._arg('onChange')?.(false);
  }

  _cancelCloseAnimation() {
    this._closeGeneration += 1;
    this._activeCloseCancel?.();
    this._activeCloseCancel = null;
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
      scheduleMicrotask(() => {
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
    this._usedSetTarget = true;
    cancelScheduled(this._setReferenceHandle);

    if (data !== undefined) {
      this._pendingRegisteredData = data;
      this._hasPendingData = true;
    }

    this._setReferenceHandle = scheduleMicrotask(() => {
      this._setReferenceHandle = null;

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
      if (this._opt('useCapture') !== this._lastUseCaptureArgumentValue) {
        warn('The value of the useCapture argument was mutated', {
          id: 'ember-attacher.use-capture-mutated',
        });
      }
    });
  }

  _syncAria() {
    const entryText =
      this._data != null && this._data !== '' ? String(this._data) : null;
    this._aria.bind(this._listenerTarget, {
      isTooltip: this._isTooltip,
      id: this.id,
      ariaRole: this.ariaRole,
      isOpen: this._ariaOpen,
      attachmentEl: this._floatingElement,
      tooltipText: entryText,
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
    const { popoverTargets, allTargets } = explicitId
      ? findTriggerTargetElements(explicitId)
      : { popoverTargets: [], allTargets: [] };
    this._syncPopoverTargetListeners(popoverTargets);

    const target = resolveAttachmentTarget({
      explicitTarget: this.explicitTarget,
      registeredTarget: this._registeredTarget,
      popoverTargets: allTargets,
      parentElement: null,
      allowParentFallback: false,
    });

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
      Boolean(this._opt('isShown'));
    if (shouldBeOpen && target) {
      this._ariaOpen = true;
      this._syncAria();
      this._addListenersForHideEvents();
      if (!this._isShown) {
        this._show();
      } else {
        this._applyVisibility(true);
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

    const useCapture = Boolean(this._opt('useCapture'));
    this._showOn.forEach((event) => {
      this._legacyShowListenersOnTargetByEvent[event] = this._showAfterDelay;
      target.addEventListener(event, this._showAfterDelay, useCapture);
    });
  }

  _removeLegacyShowEventListeners() {
    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    const useCapture = Boolean(this._opt('useCapture'));
    Object.keys(this._legacyShowListenersOnTargetByEvent).forEach((event) => {
      target.removeEventListener(
        event,
        this._legacyShowListenersOnTargetByEvent[event],
        useCapture
      );
      delete this._legacyShowListenersOnTargetByEvent[event];
    });
  }

  _removeHideEventListeners({ restoreClickShow = false } = {}) {
    const useCapture = Boolean(this._opt('useCapture'));
    this._mouseLeaveOrigin = null;
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      document.removeEventListener(
        eventType,
        this._hideListenersOnDocumentByEvent[eventType],
        useCapture
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
        target.removeEventListener('click', hideOnClickListener, useCapture);
        delete this._hideListenersOnTargetByEvent.click;
      }

      this._legacyShowListenersOnTargetByEvent.click = this._showAfterDelay;
      target.addEventListener('click', this._showAfterDelay, useCapture);
    }

    Object.keys(this._hideListenersOnTargetByEvent).forEach((event) => {
      target.removeEventListener(
        event,
        this._hideListenersOnTargetByEvent[event],
        useCapture
      );
      delete this._hideListenersOnTargetByEvent[event];
    });
  }

  _syncIsShown() {
    const isShown = this._opt('isShown');

    if (isShown === true && this._isHidden) {
      this._show();
      scheduleMicrotask(() => {
        if (!this._isDestroyed && !this._isHidden) {
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

    cancelScheduled(this._delayedVisibilityToggle);
    this._cancelCloseAnimation();

    this._isHiding = false;
    this._setTracked('_mustRender', true);
    syncParentAttachment(this);

    this._addListenersForHideEvents();

    const parsedShowDelay = parseInt(this._opt('showDelay'), 10) || 0;
    const isWarm = Boolean(
      this._isTooltip && peekDelayGroup(this._delayGroupOwner)?.isWarmFor()
    );
    const effectiveDelay = isWarm ? 0 : parsedShowDelay;

    this._delayedVisibilityToggle = debounceTimeout(
      this._delayedVisibilityToggle,
      this._show,
      effectiveDelay,
      !effectiveDelay
    );
  }

  _show() {
    cancelScheduled(this._delayedVisibilityToggle);
    this._delayedVisibilityToggle = null;
    this._cancelCloseAnimation();

    if (!this._currentTarget) {
      return;
    }

    this._restoreFocusOnHide = false;
    this._isHiding = false;
    this._positioningSuspended = false;
    this._setTracked('_mustRender', true);
    this._setTracked('_isShown', true);
    this._ariaOpen = true;

    if (this._isTooltip && this._opt('isShown') !== true) {
      getDelayGroup(this._delayGroupOwner)?.open(this);
    }

    this._syncModalContainer();
    syncParentAttachment(this);
    this._notifyRenderStateChange();
    this._applyVisibility(true);
    this._syncAria();
    this._update();
  }

  _hideAfterDelay() {
    cancelScheduled(this._delayedVisibilityToggle);
    this._isHiding = true;

    const hideDelay = parseInt(this._opt('hideDelay'), 10) || 0;
    this._delayedVisibilityToggle = debounceTimeout(
      this._delayedVisibilityToggle,
      this._hide,
      hideDelay,
      !hideDelay
    );
  }

  _hide() {
    const wasShown = this._isShown || !this._isHidden;
    cancelScheduled(this._delayedVisibilityToggle);
    this._delayedVisibilityToggle = null;
    this._cancelCloseAnimation();
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

    if (this._restoreFocusOnHide) {
      this._restoreFocusOnHide = false;
      this._suppressFocusShow = true;
      try {
        restoreFocusOnEscape(this._listenerTarget, this._floatingElement);
      } finally {
        this._suppressFocusShow = false;
      }
    }

    this._aria.setOpen(false);
    this._setTracked('_isStartingAnimation', false);
    this._isHidden = true;
    this._notifyRenderStateChange();

    const floatingElement = this._floatingElement;
    if (!floatingElement) {
      if (wasShown) {
        this._arg('onChange')?.(false);
      }
      return;
    }

    const hideDuration = parseInt(this._opt('hideDuration'), 10) || 0;
    floatingElement.setAttribute('aria-hidden', 'true');

    if (hideDuration <= 0) {
      this._finishHide();
      return;
    }

    floatingElement.style.setProperty(
      '--ember-attacher-transition-duration',
      `${hideDuration}ms`
    );
    floatingElement.setAttribute('data-closing', '');

    this._waitForExitAnimations(floatingElement, hideDuration, () => {
      this._finishHide();
    });
  }

  _addListenersForHideEvents() {
    const hideOn = this._hideOn;
    const target = this._listenerTarget;
    const useCapture = Boolean(this._opt('useCapture'));

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
        target.removeEventListener('click', showOnClickListener, useCapture);
        delete this._legacyShowListenersOnTargetByEvent.click;
      }

      this._hideListenersOnTargetByEvent.click = this._hideAfterDelay;
      target.addEventListener('click', this._hideAfterDelay, useCapture);
    }

    if (
      hideOn.includes('clickout') &&
      !this._hideListenersOnDocumentByEvent.click &&
      !this._hideListenersOnDocumentByEvent.touchend
    ) {
      const clickoutEvent = 'ontouchstart' in window ? 'touchend' : 'click';
      this._hideListenersOnDocumentByEvent[clickoutEvent] = this._hideOnClickOut;
      document.addEventListener(clickoutEvent, this._hideOnClickOut, useCapture);
    }

    if (hideOn.includes('escapekey') && !this._hideListenersOnDocumentByEvent.keydown) {
      this._hideListenersOnDocumentByEvent.keydown = this._hideOnEscapeKey;
      document.addEventListener('keydown', this._hideOnEscapeKey, useCapture);
    }

    if (target && hideOn.includes('mouseleave') && !this._hideListenersOnTargetByEvent.mouseleave) {
      this._hideListenersOnTargetByEvent.mouseleave = this._hideOnMouseLeaveTarget;
      target.addEventListener('mouseleave', this._hideOnMouseLeaveTarget, useCapture);
    }

    if (target) {
      ['blur', 'focusout'].forEach((eventType) => {
        if (hideOn.includes(eventType) && !this._hideListenersOnTargetByEvent[eventType]) {
          this._hideListenersOnTargetByEvent[eventType] = this._hideOnLostFocus;
          target.addEventListener(eventType, this._hideOnLostFocus, useCapture);
        }
      });
    }
  }

  _hideOnMouseLeaveTarget(event) {
    if (this._isHidden && !this._isShown) {
      this._hideAfterDelay();
      return;
    }

    if (this._opt('interactive')) {
      this._mouseLeaveOrigin = event ? { x: event.clientX, y: event.clientY } : null;

      if (!this._hideListenersOnDocumentByEvent.mousemove) {
        const useCapture = Boolean(this._opt('useCapture'));
        this._hideListenersOnDocumentByEvent.mousemove = this._hideIfMouseOutsideTargetOrAttachment;
        document.addEventListener(
          'mousemove',
          this._hideIfMouseOutsideTargetOrAttachment,
          useCapture
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
      const useCapture = Boolean(this._opt('useCapture'));
      this._mouseLeaveOrigin = null;
      delete this._hideListenersOnDocumentByEvent.mousemove;
      document.removeEventListener(
        'mousemove',
        this._hideIfMouseOutsideTargetOrAttachment,
        useCapture
      );
      this._hideAfterDelay();
    }
  }

  _hideOnClickOut(event) {
    const target = this._listenerTarget;
    if (elementContainsEvent(target, event) || descendantAttachmentContainsEvent(this, event)) {
      return;
    }

    if (!this._opt('interactive') || !elementContainsEvent(this._floatingElement, event)) {
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

    if (!this._opt('interactive') || !this._floatingElement?.contains(event.relatedTarget)) {
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

    const autoUpdateOpt = this._opt('autoUpdate');
    if (autoUpdateOpt) {
      this._cleanup = autoUpdate(
        this._currentTarget,
        this._floatingElement,
        this._updatePosition,
        typeof autoUpdateOpt === 'object' && autoUpdateOpt !== null ? autoUpdateOpt : undefined
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

    const strategy = this._opt('strategy');
    const computePositionToken = attacherWaiter.beginAsync();
    computePosition(this._currentTarget, this._floatingElement, {
      ...this._opt('floatingUiOptions'),
      middleware: this._middleware,
      placement: this._opt('placement'),
      strategy,
    })
      .then(({ x, y, placement, strategy: computedStrategy, middlewareData }) => {
        attacherWaiter.endAsync(computePositionToken);

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
        attacherWaiter.endAsync(computePositionToken);

        if (!this._isDestroyed) {
          warn(`[ember-attacher] Positioning error: ${error?.message ?? error}`, {
            id: 'ember-attacher.positioning-error',
          });
        }
      });
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

    cancelScheduled(this._syncArgsHandle);
    cancelScheduled(this._setReferenceHandle);
    this._cancelCloseAnimation();
    cancelScheduled(this._delayedVisibilityToggle);

    this._detachPopoverEvents(this._attachedPopoverEventsOn);
    this._aria.unbind();
    this._removeLegacyShowEventListeners();
    this._removeHideEventListeners();
    this._clearPopoverTargetListeners();

    for (const entry of this._registeredEntries.values()) {
      cancelScheduled(entry.updateHandle);
      this._removeEntryShowListeners(entry);
    }
    this._registeredEntries.clear();

    this._checkDeprecatedArgs(this._getArgs());
    this._arg('onWillDestroy')?.(this._currentTarget, this.id);
  }
}
