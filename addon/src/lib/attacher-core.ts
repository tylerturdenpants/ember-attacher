import { getOwner } from '@ember/application';
import type Owner from '@ember/owner';
import { registerDestructor } from '@ember/destroyable';
import { assert, runInDebug, warn } from '@ember/debug';
import {
  autoUpdate,
  computePosition,
  type AutoUpdateOptions,
  type ComputePositionConfig,
  type MiddlewareData,
  type OffsetOptions,
  type Placement,
  type Strategy,
} from '@floating-ui/dom';
import { tracked } from '@glimmer/tracking';
import Modifier, { modifier, type FunctionBasedModifier } from 'ember-modifier';
import DEFAULTS, { POPOVER_DEFAULTS, type AttacherAnimation } from '../defaults';
import { AttachmentAriaController, restoreFocusOnEscape } from './a11y';
import {
  descendantAttachmentContainsEvent,
  descendantAttachmentContainsNode,
  registerAttacher,
  shouldHandleEscapeKey,
  syncParentAttachment,
  unregisterAttacher,
} from './attachment-tree';
import { getDelayGroup, peekDelayGroup } from './delay-group';
import { elementContainsEvent, isCursorInSafePolygon, type PointerOrigin } from './dom';
import {
  getModalDialogContainer,
  hidePopoverHost,
  showPopoverHost,
  supportsPopoverHost,
} from './host';
import {
  applyPositionResult,
  buildMiddleware,
  hasOffsetMiddleware,
  isTargetConnected,
  topLayerAwarePlatform,
} from './positioning';
import {
  attacherWaiter,
  cancelScheduled,
  debounceTimeout,
  scheduleMicrotask,
  type ScheduledHandle,
} from './schedule';
import {
  findTriggerTargetElements,
  getListenerTarget,
  isElementTarget,
  isRelativeTargetToken,
  isVirtualReference,
  peekRelativeTarget,
  resolveAttachmentTarget,
  type AttachmentTarget,
  type AttachmentTargetInput,
} from './target-resolution';

export type { AttacherAnimation };
export type AttacherTarget = AttachmentTargetInput;

export type AttacherTargetModifier<TData = unknown> = FunctionBasedModifier<{
  Element: Element;
  Args: {
    Positional: [data?: TData];
    Named: { data?: TData };
  };
}>;

export interface AttacherBlockParams<TData = unknown> {
  /** Element modifier registering an element as a Target and associating optional `data`. */
  target: AttacherTargetModifier<TData>;
  /** Element modifier marking the caller's Attachment DOM element (headless `<Attacher>`). */
  attachment: FunctionBasedModifier<{ Element: HTMLElement }>;
  /** Element modifier registering a custom arrow element. */
  arrow: FunctionBasedModifier<{ Element: HTMLElement }>;
  /** Programmatically registers an explicit target Element or VirtualElement and optional `data`. */
  setTarget: (target: AttachmentTarget | null | undefined, data?: TData) => void;
  /** Programmatically shows the attachment (optionally switching target and data). */
  show: (target?: AttachmentTarget, data?: TData) => void;
  /** Programmatically hides the attachment. */
  hide: () => void;
  /** Programmatically toggles visibility of the attachment. */
  toggle: () => void;
  /** Recomputes Floating UI positioning immediately. */
  update: () => void;
  /** Current open visibility state. */
  readonly isShown: boolean;
  /** Whether inner content should render (respecting `@lazyRender`). */
  readonly shouldRender: boolean;
  /** Payload associated with the currently active Target (`{{a.target data}}` / `setTarget`). */
  readonly data: TData | undefined;
  /** Resolved Floating UI placement after middleware execution. */
  readonly placement: Placement;
  /** Latest Floating UI `middlewareData` from `computePosition()`. */
  readonly middlewareData: MiddlewareData;
}

export interface AttacherNamedBlocks<TData = unknown> {
  default: [attacher: AttacherBlockParams<TData>];
  target: [target: AttacherTargetModifier<TData>, attacher: AttacherBlockParams<TData>];
  content: [attacher: AttacherBlockParams<TData>];
}

export interface AttacherArgs {
  /** Animation applied when showing and hiding the attachment. Defaults to `'fill'`. */
  animation?: AttacherAnimation | null;
  /** ARIA role attribute applied to the attachment element (`'dialog'` by default for `<AttachPopover>`, `'tooltip'` for `<AttachTooltip>`). */
  ariaRole?: string;
  /** Whether to render an arrow element positioned by Floating UI. Defaults to `false`. */
  arrow?: boolean;
  /** Keeps attachment position synced via Floating UI `autoUpdate`. Defaults to `true`. */
  autoUpdate?: boolean | AutoUpdateOptions;
  /** CSS class(es) applied to the inner attachment container. */
  class?: string | null;
  /** Target DOM Element, single-match CSS selector string, or Floating UI `VirtualElement`. */
  target?: AttacherTarget | null;
  /** Delay in ms (number or numeric string) before hiding. Defaults to `0`. */
  hideDelay?: number | string;
  /** Exit transition duration in ms (number or numeric string). Defaults to `300`. */
  hideDuration?: number | string;
  /** Space-separated hide triggers (`click`, `clickout`, `mouseleave`, `blur`, `focusout`, `escapekey`), or `null` to disable. */
  hideOn?: string | null;
  /** DOM `id` on the attachment element (also used for ARIA linkage, `[popovertarget]`, and `[interestfor]`). */
  id?: string;
  /** Keeps attachment open when pointer/focus enters it or traverses the `safePolygon` corridor. Defaults to `true`. */
  interactive?: boolean;
  /** Controlled visibility flag. */
  isShown?: boolean;
  /** Defers rendering inner block content until the attachment is first triggered. */
  lazyRender?: boolean;
  /** Floating UI middleware pipeline (merged and deduplicated by `m.name`). */
  middleware?: ComputePositionConfig['middleware'] | null;
  /** Floating UI `offset()` shorthand (number or `OffsetOptions`), prepended unless `@middleware` already includes `offset`. */
  offset?: OffsetOptions | null;
  /** Callback invoked when attachment visibility toggles. */
  onChange?: (isVisible: boolean) => unknown;
  /** Floating UI placement. Defaults to `'top'`. */
  placement?: Placement;
  /** Renders the attachment in place within its parent DOM instead of promoting to the Top Layer. */
  renderInPlace?: boolean;
  /** Delay in ms (number or numeric string) before showing. Defaults to `0`. */
  showDelay?: number | string;
  /** Enter transition duration in ms (number or numeric string). Defaults to `300`. */
  showDuration?: number | string;
  /** Space-separated show triggers (`click`, `mouseenter`, `focus`), or `null` to disable. */
  showOn?: string | null;
  /** CSS positioning strategy (`'absolute'` or `'fixed'`). Defaults to `'absolute'`. */
  strategy?: Strategy;
  /** Attaches event listeners in the capture phase (`true`) or bubble phase (`false`). */
  useCapture?: boolean;
}

export interface HostRenderState {
  activeElement: AttachmentTarget | null;
  hasContent: boolean;
  id?: string;
  role?: string;
  popoverAttr?: 'manual';
  className?: string;
  text?: string;
  arrow?: boolean;
  isFillAnimation?: boolean;
  isShown?: boolean;
  isHiding?: boolean;
  hasOffset?: boolean;
  container?: Element | null;
}

type ConfigKey = 'tooltip' | 'popover';

export interface EmberAttacherConfigGroup {
  animation?: AttacherAnimation | null;
  arrow?: boolean;
  autoUpdate?: boolean | AutoUpdateOptions;
  class?: string | null;
  hideDelay?: number | string;
  hideDuration?: number | string;
  hideOn?: string | null;
  interactive?: boolean;
  isShown?: boolean;
  lazyRender?: boolean;
  middleware?: ComputePositionConfig['middleware'] | null;
  offset?: OffsetOptions | null;
  placement?: Placement;
  popoverClass?: string;
  renderInPlace?: boolean;
  showDelay?: number | string;
  showDuration?: number | string;
  showOn?: string | null;
  strategy?: Strategy;
  tooltipClass?: string;
  useCapture?: boolean;
}

export interface EmberAttacherEnvConfig extends EmberAttacherConfigGroup {
  tooltip?: EmberAttacherConfigGroup;
  popover?: EmberAttacherConfigGroup;
}

interface AttacherCoreOptions {
  defaultConfigKey?: ConfigKey | null;
  defaultAriaRole?: string;
  getDefaultClass?: (() => string) | null;
  isComponentHost?: boolean;
  onRenderStateChange?: ((state: HostRenderState) => void) | null;
}

interface RegisteredEntry {
  element: Element;
  data: unknown;
  options: AttacherArgs | null;
  owner: Owner | null;
  showListeners: Record<string, EventListener>;
  showOnKey: string | null;
  useCapture: boolean | null;
  updateHandle: ScheduledHandle | null;
}

type PopoverBeforeToggleEvent = Event & {
  newState?: string;
  source?: Element | null;
};

type ApplicationRootLookup = { rootElement?: unknown } | undefined;
type InternalOwner = Owner & {
  resolveRegistration?: (fullName: string) => unknown;
  lookup?: (fullName: string) => ApplicationRootLookup;
};

let nextInstanceNumber = 0;

function nextFloatingId(): string {
  nextInstanceNumber += 1;
  return `ember-attacher-${nextInstanceNumber}-floating`;
}

export function resolveTooltipClass(envConfig: EmberAttacherEnvConfig | null | undefined): string {
  const { tooltip, tooltipClass } = envConfig || {};
  return tooltip?.tooltipClass ?? tooltipClass ?? DEFAULTS.tooltipClass;
}

export function resolvePopoverClass(envConfig: EmberAttacherEnvConfig | null | undefined): string {
  const { popover, popoverClass } = envConfig || {};
  return popover?.popoverClass ?? popoverClass ?? DEFAULTS.popoverClass;
}

const TRUTHY_OPTION_KEYS = new Set<keyof AttacherArgs>(['animation', 'class']);
const REMOVED_4X_ARGS: Readonly<Record<string, string>> = {
  explicitTarget: 'Use `@target` instead.',
  flip: 'Pass `flip()` in `@middleware` instead.',
  overflowPadding: 'Pass `shift({ padding })` / `flip({ padding })` in `@middleware` instead.',
  floatingUiOptions: 'Use `@placement`, `@strategy`, and `@middleware` instead.',
  floatingElementContainer: 'Use the default Top-Layer host or `@renderInPlace={{true}}`.',
  isOffset: 'Remove; the diagonal safePolygon corridor is active automatically when `@interactive={{true}}`.',
  style: 'Style via `@class` / `class="..."` or `--ember-attacher-*` CSS custom properties instead.',
  additionalClass: 'Use `@class` or `class="..."` instead.',
  onInitializeAttacher: 'Use an element modifier on the Target or Attachment instead.',
  onWillDestroy: 'Use an element modifier teardown or `registerDestructor` instead.',
  configKey: 'Use `<AttachTooltip>` or `<AttachPopover>` instead.',
};
const EMPTY_OBJECT: EmberAttacherEnvConfig = Object.freeze({});
const rawEnvByOwner = new WeakMap<object, { emberAttacher?: EmberAttacherEnvConfig } | null>();

function readEmberAttacherEnv(owner: InternalOwner | null | undefined): EmberAttacherEnvConfig {
  if (!owner || typeof owner !== 'object') {
    return EMPTY_OBJECT;
  }

  let env = rawEnvByOwner.get(owner);
  if (env === undefined) {
    env =
      (owner.resolveRegistration?.('config:environment') as
        | { emberAttacher?: EmberAttacherEnvConfig }
        | undefined) || null;
    rawEnvByOwner.set(owner, env);
  }

  return env?.emberAttacher || EMPTY_OBJECT;
}

function resolveOwnerRootElement(
  owner: InternalOwner | null | undefined,
  doc: Document | null | undefined
): Element | null {
  if (!doc) {
    return null;
  }

  let root: unknown = null;
  if (owner && typeof owner.lookup === 'function') {
    const app = owner.lookup('application:main') as ApplicationRootLookup;
    root = app?.rootElement ?? null;
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

function shallowValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => {
    const valA = objA[key];
    const valB = objB[key];
    if (valA === valB) {
      return true;
    }
    if (valA && valB && typeof valA === 'object' && typeof valB === 'object') {
      const subA = valA as Record<string, unknown>;
      const subB = valB as Record<string, unknown>;
      const subKeysA = Object.keys(subA);
      const subKeysB = Object.keys(subB);
      return (
        subKeysA.length === subKeysB.length &&
        subKeysA.every((subKey) => subA[subKey] === subB[subKey])
      );
    }
    return false;
  });
}

function normalizeTriggerList(
  value: string | null | undefined,
  fallback: string | null
): string[] {
  const resolved = value === undefined ? fallback : value;
  return resolved === null ? [] : resolved.split(' ').filter(Boolean);
}

function createTargetModifier(core: AttacherCore): AttacherTargetModifier {
  class AttacherTargetModifierImpl extends Modifier<{
    Element: Element;
    Args: { Positional: [data?: unknown]; Named: { data?: unknown } };
  }> {
    _element: Element | null = null;
    _installed = false;
    _destroyed = false;
    _mountHandle: ScheduledHandle | null = null;
    private _lastBoundData: unknown = undefined;

    constructor(owner: Owner, args: { positional: [unknown?]; named: { data?: unknown } }) {
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

    modify(
      element: Element,
      positional: [unknown?],
      named: { data?: unknown }
    ): void {
      if (this._destroyed || core.isDestroyed) {
        return;
      }

      core._usedTargetModifier = true;
      const boundData = positional.length > 0 ? positional[0] : named?.data;
      const data =
        this._installed && element === this._element && boundData === this._lastBoundData
          ? core._registeredEntries.get(element)?.data
          : boundData;
      this._lastBoundData = boundData;
      const entry = core.registerTargetElement(element, data, null, getOwner(this) ?? null);

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
  }

  return AttacherTargetModifierImpl as unknown as AttacherTargetModifier;
}

/**
 * Shared reactive controller backing `<AttachTooltip>`, `<AttachPopover>`,
 * `<Attacher>`, and the `{{tooltip}}` singleton pool.
 */
export default class AttacherCore {
  @tracked _arrowElement: HTMLElement | null = null;
  @tracked _currentTarget: AttachmentTarget | null = null;
  @tracked _registeredTarget: AttachmentTarget | null = null;
  @tracked _mustRender = false;
  @tracked _modalContainer: Element | null = null;
  @tracked _isShown = false;
  @tracked _data: unknown = undefined;
  @tracked _resolvedPlacement: Placement | undefined = undefined;
  @tracked _middlewareData: MiddlewareData = {};

  private _ownerContext: object | null;
  private _owner: InternalOwner | null;
  private _getArgs: () => AttacherArgs;
  private _defaultConfigKey: ConfigKey | null;
  private _defaultAriaRole: string | undefined;
  private _getDefaultClass: (() => string) | null;
  private _isComponentHost: boolean;
  private _onRenderStateChange: ((state: HostRenderState) => void) | null;

  _defaultId: string;
  _elementId: string | null = null;
  _hasTargetBlock = false;
  _usedTargetModifier = false;
  _usedSetTarget = false;
  _hasCheckedInitialTarget = false;
  _setTargetHandle: ScheduledHandle | null = null;
  _syncArgsHandle: ScheduledHandle | null = null;
  // Untracked copy of the node listeners are on so `_removeHideEventListeners`
  // does not read `_currentTarget` in the same frame that writes it.
  _listenerTarget: Element | null = null;
  _floatingElement: HTMLElement | null = null;
  _registeredEntries = new Map<Element, RegisteredEntry>();
  _popoverTargetEntries = new Map<Element, EventListener>();
  _activeEntryOptions: AttacherArgs | null = null;
  _pendingRegisteredData: unknown = undefined;
  _hasPendingData = false;
  _pendingPopoverTrigger: Element | null = null;
  _syncingPopoverHost = false;
  _skipNativePopoverToggle = false;
  _addedManagedPopover = false;
  _attachedPopoverEventsOn: Element | null = null;
  _prevSyncedIsShown: boolean | undefined = undefined;
  _prevSyncedTargetKey: string | undefined = undefined;
  _prevSyncedTarget: AttacherTarget | null | undefined = undefined;
  _closeGeneration = 0;
  _activeCloseCancel: (() => void) | null = null;

  _delayedVisibilityToggle: ScheduledHandle | null = null;
  _isHidden = true;
  _isHiding = false;
  _positioningSuspended = true;
  _isDestroyed = false;

  _hideListenersOnDocumentByEvent: Record<string, EventListener> = {};
  _hideListenersOnTargetByEvent: Record<string, EventListener> = {};
  _targetShowListenersByEvent: Record<string, EventListener> = {};

  _aria = new AttachmentAriaController();
  _ariaOpen = false;
  _mouseLeaveOrigin: PointerOrigin | null = null;
  _restoreFocusOnHide = false;
  _suppressFocusShow = false;
  _lastUseCaptureArgumentValue: boolean;
  _warnedRemovedArgs = new Set<string>();
  _cleanup: (() => void) | null = null;
  _relativeTargetObserver: MutationObserver | null = null;
  _observedRelativeParent: Element | null = null;

  readonly api: AttacherBlockParams;

  /** Tracks template args read inside `<template>` and schedules an idle args sync. */
  syncArgs = (..._positional: unknown[]): '' => {
    void _positional;
    this.scheduleArgsSync();
    return '';
  };

  constructor(
    ownerContext: object | null,
    getArgs: () => AttacherArgs,
    {
      defaultConfigKey = null,
      defaultAriaRole = undefined,
      getDefaultClass = null,
      isComponentHost = true,
      onRenderStateChange = null,
    }: AttacherCoreOptions = {}
  ) {
    this._ownerContext = ownerContext;
    this._owner =
      ownerContext && typeof ownerContext === 'object'
        ? ((getOwner(ownerContext) as InternalOwner | undefined) ?? null)
        : null;
    this._getArgs = getArgs;
    this._defaultConfigKey = defaultConfigKey;
    this._defaultAriaRole = defaultAriaRole;
    this._getDefaultClass = getDefaultClass;
    this._isComponentHost = isComponentHost;
    this._onRenderStateChange = onRenderStateChange;
    this._defaultId = nextFloatingId();

    this.hide = this.hide.bind(this);
    this.show = this.show.bind(this);
    this.toggle = this.toggle.bind(this);
    this.update = this.update.bind(this);
    this.setTarget = this.setTarget.bind(this);
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

    this._lastUseCaptureArgumentValue = Boolean(this._opt('useCapture'));

    this.api = Object.defineProperties(
      {
        target: this.target,
        attachment: this.attachment as unknown as AttacherBlockParams['attachment'],
        arrow: this.arrowModifier as unknown as AttacherBlockParams['arrow'],
        setTarget: this.setTarget,
        show: this.show,
        hide: this.hide,
        toggle: this.toggle,
        update: this.update,
      } as AttacherBlockParams,
      {
        isShown: { enumerable: true, get: () => this.liveIsShown },
        shouldRender: { enumerable: true, get: () => this.shouldRenderFloatingElement },
        data: { enumerable: true, get: () => this._data },
        placement: {
          enumerable: true,
          get: () => this._resolvedPlacement ?? (this._opt('placement') as Placement),
        },
        middlewareData: { enumerable: true, get: () => this._middlewareData },
      }
    );

    if (ownerContext && typeof ownerContext === 'object') {
      registerDestructor(ownerContext, () => this.destroy());
    }
  }

  private _setTracked<K extends keyof this>(field: K, value: this[K]): void {
    if (this[field] !== value) {
      this[field] = value;
    }
  }

  _arg<K extends keyof AttacherArgs>(key: K): AttacherArgs[K] {
    const entryOpts = this._activeEntryOptions;
    if (entryOpts && entryOpts[key] !== undefined) {
      return entryOpts[key];
    }
    return this._getArgs()?.[key];
  }

  _defaultFor<K extends keyof AttacherArgs>(key: K): unknown {
    if (!this._isTooltip && this.configKey === 'popover' && key in POPOVER_DEFAULTS) {
      return POPOVER_DEFAULTS[key as keyof typeof POPOVER_DEFAULTS];
    }
    return DEFAULTS[key as keyof typeof DEFAULTS];
  }

  _opt<K extends keyof AttacherArgs>(key: K): unknown {
    const argVal = this._arg(key);
    if ((key === 'showOn' || key === 'hideOn') && argVal === null) {
      return null;
    }

    const truthyOnly = TRUTHY_OPTION_KEYS.has(key);
    if (truthyOnly ? argVal : argVal != null) {
      return argVal;
    }

    const env = this._envConfig as Record<string, unknown>;
    const keyed = env[this.configKey] as Record<string, unknown> | undefined;
    const keyedVal = keyed?.[key as string];
    if (truthyOnly ? keyedVal : keyedVal != null) {
      return keyedVal;
    }

    const envVal = env[key as string];
    if (truthyOnly ? envVal : envVal != null) {
      return envVal;
    }

    return this._defaultFor(key);
  }

  get ariaRole(): string | undefined {
    return this._arg('ariaRole') || this._defaultAriaRole;
  }

  get targetArg(): AttacherTarget | null | undefined {
    return this._arg('target');
  }

  get configKey(): ConfigKey {
    if (this._defaultConfigKey) {
      return this._defaultConfigKey;
    }
    return this.ariaRole === 'tooltip' ? 'tooltip' : 'popover';
  }

  get _isTooltip(): boolean {
    return this.configKey === 'tooltip' || this.ariaRole === 'tooltip';
  }

  get arrow(): boolean {
    return Boolean(this._opt('arrow'));
  }

  get isFillAnimation(): boolean {
    return this._opt('animation') === 'fill';
  }

  get shouldRenderFloatingElement(): boolean {
    return !this._opt('lazyRender') || this._mustRender;
  }

  get id(): string {
    return this._arg('id') || this._elementId || this._defaultId;
  }

  get popoverAttr(): 'manual' | undefined {
    return this._usePopoverHost ? 'manual' : undefined;
  }

  get liveIsShown(): boolean {
    return this._isShown;
  }

  get innerClass(): string {
    const arrowClass = `ember-attacher-${this.arrow ? 'with' : 'without'}-arrow`;
    const defaultClass = this._getDefaultClass ? this._getDefaultClass() : '';
    return [
      `ember-attacher-${this._opt('animation') as string}`,
      (this._opt('class') as string) || '',
      defaultClass,
      arrowClass,
    ]
      .filter(Boolean)
      .join(' ');
  }

  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  get isDestroying(): boolean {
    return this._isDestroyed;
  }

  get isHidden(): boolean {
    return this._isHidden;
  }

  get entryCount(): number {
    return this._registeredEntries.size;
  }

  isActiveTarget(element: AttachmentTarget): boolean {
    return this._currentTarget === element;
  }

  setHostElements(
    floatingElement: HTMLElement | null,
    arrowElement: HTMLElement | null = null
  ): void {
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

  getHostRenderState(): HostRenderState {
    const activeEl = this._currentTarget || this._registeredTarget;
    if (!activeEl) {
      return { activeElement: null, hasContent: false };
    }

    const entry = isElementTarget(activeEl) ? this._registeredEntries.get(activeEl) : undefined;
    const ownerForRoot = (entry?.owner as InternalOwner | null) || this._owner;
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
      text: entry?.data != null ? String(entry.data) : '',
      hasContent: Boolean(entry && entry.data != null && entry.data !== ''),
      arrow: this.arrow,
      isFillAnimation: this.isFillAnimation,
      isShown: this._isShown,
      isHiding: this._isHiding,
      hasOffset: this.hasOffset,
      container,
    };
  }

  _notifyRenderStateChange(): void {
    if (this._onRenderStateChange && !this._isDestroyed) {
      this._onRenderStateChange(this.getHostRenderState());
    }
  }

  get envConfig(): EmberAttacherEnvConfig {
    return this._envConfig;
  }

  get _envConfig(): EmberAttacherEnvConfig {
    const currentEl = isElementTarget(this._currentTarget) ? this._currentTarget : null;
    const registeredEl = isElementTarget(this._registeredTarget) ? this._registeredTarget : null;
    const entryOwner =
      (currentEl && (this._registeredEntries.get(currentEl)?.owner as InternalOwner | null)) ||
      (registeredEl &&
        (this._registeredEntries.get(registeredEl)?.owner as InternalOwner | null)) ||
      (this._registeredEntries.values().next().value?.owner as InternalOwner | null) ||
      this._owner;

    return readEmberAttacherEnv(entryOwner);
  }

  get _hideOn(): string[] {
    const fallback = (this._defaultFor('hideOn') as string | null) ?? null;
    return normalizeTriggerList(this._opt('hideOn') as string | null | undefined, fallback);
  }

  get _showOn(): string[] {
    const fallback = (this._defaultFor('showOn') as string | null) ?? null;
    return normalizeTriggerList(this._opt('showOn') as string | null | undefined, fallback);
  }

  get _middleware() {
    return buildMiddleware({
      rawMiddleware: this._opt('middleware') as AttacherArgs['middleware'],
      offsetOptions: this._opt('offset') as OffsetOptions | null | undefined,
      arrowElement: this._arrowElement,
      arrowEnabled: this.arrow || (!this._isComponentHost && Boolean(this._arrowElement)),
    });
  }

  get hasOffset(): boolean {
    return hasOffsetMiddleware(this._middleware);
  }

  get _usePopoverHost(): boolean {
    return supportsPopoverHost() && !this._renderInPlace;
  }

  get _renderInPlace(): boolean {
    return typeof document !== 'undefined' ? Boolean(this._opt('renderInPlace')) : true;
  }

  get _delayGroupOwner(): object | null {
    const currentEl = isElementTarget(this._currentTarget) ? this._currentTarget : null;
    const registeredEl = isElementTarget(this._registeredTarget) ? this._registeredTarget : null;
    return (
      this._owner ||
      (currentEl && this._registeredEntries.get(currentEl)?.owner) ||
      (registeredEl && this._registeredEntries.get(registeredEl)?.owner) ||
      this._registeredEntries.values().next().value?.owner ||
      null
    );
  }

  _hasSuppliedTargetBinding(): boolean {
    const args = this._getArgs() || (EMPTY_OBJECT as AttacherArgs);
    if (
      'target' in args ||
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

  _assertInitialTargetBinding(): void {
    if (
      !this._isComponentHost ||
      this._hasCheckedInitialTarget ||
      typeof document === 'undefined'
    ) {
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
  setupFloatingElement = modifier<{
    Element: HTMLElement;
    Args: { Positional: [hasTargetBlock?: boolean] };
  }>((element, [hasTargetBlock]) => {
    this._hasTargetBlock = Boolean(hasTargetBlock);
    this._floatingElement = element;
    registerAttacher(this);
    this._attachPopoverEvents(element);
    this.scheduleArgsSync();

    return () => {
      this._detachPopoverEvents(element);
      if (this._floatingElement === element) {
        this._floatingElement = null;
        this._disconnectRelativeTargetObserver();
      }
      this._cleanup?.();
      this._cleanup = null;
    };
  });

  // Headless `<Attacher as |a|>` floating element modifier.
  attachment = modifier<{ Element: HTMLElement }>((element) => {
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
        this._disconnectRelativeTargetObserver();
      }
      this._cleanup?.();
      this._cleanup = null;
    };
  });

  arrowModifier = modifier<{ Element: HTMLElement }>((element) => {
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

  scheduleArgsSync(): void {
    cancelScheduled(this._syncArgsHandle);
    this._syncArgsHandle = scheduleMicrotask(() => {
      this._syncArgsHandle = null;
      if (this._isDestroyed) {
        return;
      }

      this._warnRemoved4xArgs(this._getArgs() as Record<string, unknown> | undefined);

      const targetKey = `${this._opt('showOn')}|${this._opt('hideOn')}|${this.id}|${this._renderInPlace}`;
      const targetArg = this.targetArg;
      const isInitialSync = !this._prevSyncedTargetKey;
      const relativeTargetStale =
        isRelativeTargetToken(targetArg) &&
        (!isTargetConnected(this._currentTarget) ||
          (this._floatingElement != null &&
            peekRelativeTarget(targetArg, this._floatingElement) !== this._currentTarget));
      const targetChanged =
        isInitialSync ||
        this._prevSyncedTargetKey !== targetKey ||
        this._prevSyncedTarget !== targetArg ||
        relativeTargetStale;

      if (targetChanged) {
        this._prevSyncedTargetKey = targetKey;
        this._prevSyncedTarget = targetArg;
        this._initializeAttacher();
      }

      if (isInitialSync) {
        this._assertInitialTargetBinding();
      }

      const isShown = this._opt('isShown') as boolean | undefined;
      if (this._prevSyncedIsShown !== isShown) {
        this._prevSyncedIsShown = isShown;
        this._syncIsShown();
      }

      this._ensureArgumentsAreValid();
      if (this._floatingElement) {
        if (this.hasOffset) {
          this._floatingElement.setAttribute('data-offset', '');
        } else {
          this._floatingElement.removeAttribute('data-offset');
        }
        if (!this._isComponentHost) {
          this._syncHeadlessAttachmentElement(this._floatingElement);
        }
      }
      this._syncAria();
      if (!targetChanged) {
        this._update();
      }
    });
  }

  target: AttacherTargetModifier = createTargetModifier(this);

  registerTargetElement(
    element: Element,
    data: unknown,
    options: AttacherArgs | null = null,
    owner: Owner | null = null
  ): RegisteredEntry {
    if (options) {
      this._warnRemoved4xArgs(options as Record<string, unknown>);
    }

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

    const internalOwner = owner as InternalOwner | null;
    if (internalOwner && !this._owner) {
      this._owner = internalOwner;
    }

    this._syncEntryShowListeners(entry);

    if (!isNew && (this._registeredTarget === element || this._currentTarget === element)) {
      this._activeEntryOptions = options;
      cancelScheduled(entry.updateHandle);
      entry.updateHandle = scheduleMicrotask(() => {
        if (entry) {
          entry.updateHandle = null;
        }
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

  unregisterTargetElement(element: Element): void {
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

  _onRegisteredEntryMounted(element: Element, data: unknown): void {
    if (!this._registeredEntries.has(element)) {
      return;
    }
    const currentRegistered = isElementTarget(this._registeredTarget) ? this._registeredTarget : null;
    if (!currentRegistered || !this._registeredEntries.has(currentRegistered)) {
      this._setTracked('_registeredTarget', element);
      this._setTracked('_data', data);
      this._activeEntryOptions = this._registeredEntries.get(element)?.options || null;
      this._initializeAttacher();
    }
  }

  _syncHeadlessAttachmentElement(element: HTMLElement | null): void {
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

    if (this.hasOffset) {
      element.setAttribute('data-offset', '');
    } else {
      element.removeAttribute('data-offset');
    }
  }

  _attachPopoverEvents(element: Element | null): void {
    if (!element || this._attachedPopoverEventsOn === element) {
      return;
    }
    this._detachPopoverEvents(this._attachedPopoverEventsOn);
    if (element.hasAttribute('popover') && typeof element.addEventListener === 'function') {
      element.addEventListener('beforetoggle', this._onPopoverBeforeToggle);
      this._attachedPopoverEventsOn = element;
    }
  }

  _detachPopoverEvents(element: Element | null): void {
    if (!element || this._attachedPopoverEventsOn !== element) {
      return;
    }
    element.removeEventListener('beforetoggle', this._onPopoverBeforeToggle);
    this._attachedPopoverEventsOn = null;
  }

  _onPopoverBeforeToggle(rawEvent: Event): void {
    if (this._isDestroyed || this._syncingPopoverHost) {
      return;
    }

    const event = rawEvent as PopoverBeforeToggleEvent;
    const trigger =
      this._pendingPopoverTrigger ||
      (event.source?.hasAttribute?.('popovertarget') || event.source?.hasAttribute?.('interestfor')
        ? event.source
        : null);
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

  _isEventFromAttachment(event: Event | undefined): boolean {
    if (!(typeof Event !== 'undefined' && event instanceof Event) || !this._floatingElement) {
      return false;
    }

    if (descendantAttachmentContainsEvent(this, event)) {
      return true;
    }

    if (!elementContainsEvent(this._floatingElement, event)) {
      return false;
    }

    // Allow Targets that intentionally live inside this Attachment's own content block,
    // while ignoring events bubbling out of the Attachment into an enclosing ancestor Target.
    const current = event.currentTarget;
    if (
      current instanceof Element &&
      this._floatingElement.contains(current) &&
      (current === this._listenerTarget ||
        this._registeredEntries.has(current) ||
        this._popoverTargetEntries.has(current))
    ) {
      return false;
    }

    return true;
  }

  _onPopoverTargetClick(event: Event): void {
    const trigger = event.currentTarget;
    if (!(trigger instanceof Element) || this._isDestroyed || this._isEventFromAttachment(event)) {
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

  _syncEntryShowListeners(entry: RegisteredEntry): void {
    const opts = entry.options || (EMPTY_OBJECT as AttacherArgs);
    const baseArgs = this._getArgs() || (EMPTY_OBJECT as AttacherArgs);
    const env = this._envConfig;
    const keyedEnv = env[this.configKey];
    const showOnFallback =
      keyedEnv?.showOn ?? env.showOn ?? ((this._defaultFor('showOn') as string | null) ?? null);
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
      const listener: EventListener = (event) => {
        if (this._isDestroyed || this._isEventFromAttachment(event)) {
          return;
        }
        if (
          eventName === 'click' &&
          this._currentTarget === entry.element &&
          (!this._isHidden || this._isShown) &&
          !this._isHiding &&
          this._hideOn.includes('click')
        ) {
          this._hideAfterDelay(event);
          return;
        }
        this._activateRegisteredEntry(entry);
        this._showAfterDelay(event);
      };
      entry.showListeners[eventName] = listener;
      entry.element.addEventListener(eventName, listener, useCapture);
    }
  }

  _removeEntryShowListeners(entry: RegisteredEntry): void {
    const listeners = entry.showListeners;
    const capture = Boolean(entry.useCapture);
    for (const eventName of Object.keys(listeners)) {
      const listener = listeners[eventName];
      if (listener) {
        entry.element.removeEventListener(eventName, listener, capture);
      }
      delete listeners[eventName];
    }
    entry.showOnKey = null;
  }

  _activateRegisteredEntry(entry: RegisteredEntry): void {
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

  _switchTargetFromEvent(
    targetEl: AttachmentTarget,
    data: unknown,
    options: AttacherArgs | null
  ): void {
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

  _syncPopoverTargetListeners(popoverTargets: readonly Element[]): void {
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

  _clearPopoverTargetListeners(): void {
    const useCapture = Boolean(this._opt('useCapture'));
    for (const [el, listener] of this._popoverTargetEntries) {
      el.removeEventListener('click', listener, useCapture);
    }
    this._popoverTargetEntries.clear();
  }

  _syncModalContainer(): boolean {
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

  _applyVisibility(isVisible: boolean): void {
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

    const showDuration = parseInt(String(this._opt('showDuration') ?? 0), 10) || 0;
    const initialPlacement = (this._opt('placement') as Placement) || DEFAULTS.placement;

    el.removeAttribute('data-closing');
    if (!el.hasAttribute('data-placement')) {
      el.setAttribute('data-placement', initialPlacement);
    }
    if (!el.hasAttribute('x-placement')) {
      el.setAttribute('x-placement', initialPlacement);
    }

    el.style.setProperty('--ember-attacher-transition-duration', `${showDuration}ms`);

    if (this.hasOffset) {
      el.setAttribute('data-offset', '');
    } else {
      el.removeAttribute('data-offset');
    }

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

    this._syncingPopoverHost = true;
    try {
      if (!this._skipNativePopoverToggle) {
        showPopoverHost(el);
      }
    } finally {
      this._syncingPopoverHost = false;
    }

    (this._arg('onChange') as ((visible: boolean) => unknown) | undefined)?.(true);
  }

  _waitForExitAnimations(element: HTMLElement | null, hideDuration: number, onDone: () => void): void {
    if (hideDuration <= 0 || !element) {
      onDone();
      return;
    }

    // Flush styles so CSS transitions triggered by [data-closing] are registered
    // before querying WAAPI animations on the same turn.
    if (typeof getComputedStyle === 'function') {
      void getComputedStyle(element).opacity;
    }

    const animations =
      typeof element.getAnimations === 'function' ? element.getAnimations({ subtree: true }) : [];

    const generation = this._closeGeneration;
    const token = attacherWaiter.beginAsync();
    let done = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
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
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        attacherWaiter.endAsync(token);
        this._activeCloseCancel = null;
      }
    };

    if (animations.length > 0) {
      timeoutId = setTimeout(finish, hideDuration + 250);
      Promise.allSettled(animations.map((anim) => anim.finished)).then(finish);
    } else {
      // Fall back to hideDuration timer when no WAAPI animations are reported
      // (older engines, headless custom markup without CSS transitions, etc.)
      // so exit never silently short-circuits to an instant hide.
      timeoutId = setTimeout(finish, hideDuration);
    }
  }

  _finishHide(): void {
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

    (this._arg('onChange') as ((visible: boolean) => unknown) | undefined)?.(false);
  }

  _cancelCloseAnimation(): void {
    this._closeGeneration += 1;
    this._activeCloseCancel?.();
    this._activeCloseCancel = null;
  }

  show(target: AttachmentTarget | Event | undefined = undefined, data: unknown = undefined): void {
    if (typeof Event !== 'undefined' && target instanceof Event) {
      target = undefined;
    }

    if (target !== undefined) {
      const targetEl = target as AttachmentTarget;
      const entry = isElementTarget(targetEl) ? this._registeredEntries.get(targetEl) : undefined;
      if (entry) {
        if (data !== undefined) {
          entry.data = data;
        }
        this._activateRegisteredEntry(entry);
      } else if (isElementTarget(targetEl) || isVirtualReference(targetEl)) {
        this._switchTargetFromEvent(targetEl, data, this._activeEntryOptions);
      } else {
        runInDebug(() => {
          warn('[ember-attacher] Ignoring non-Target argument passed to show().', false, {
            id: 'ember-attacher.invalid-show-target',
          });
        });
      }
    } else if (data !== undefined) {
      this._setTracked('_data', data);
      this._notifyRenderStateChange();
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

  hide(): void {
    this._hide();
  }

  toggle(): void {
    if (this._isShown || !this._isHidden) {
      this.hide();
    } else {
      this.show();
    }
  }

  update(): void {
    this._updatePosition();
  }

  setTarget(target: AttachmentTarget | null | undefined, data: unknown = undefined): void {
    this._usedSetTarget = true;
    cancelScheduled(this._setTargetHandle);

    if (data !== undefined) {
      this._pendingRegisteredData = data;
      this._hasPendingData = true;
    }

    this._setTargetHandle = scheduleMicrotask(() => {
      this._setTargetHandle = null;

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

  _warnRemoved4xArgs(args: Record<string, unknown> | undefined): void {
    if (!args) {
      return;
    }

    runInDebug(() => {
      for (const argName of Object.keys(REMOVED_4X_ARGS)) {
        if (args[argName] !== undefined && !this._warnedRemovedArgs.has(argName)) {
          this._warnedRemovedArgs.add(argName);
          warn(
            `[ember-attacher] @${argName} was removed in 5.0.0 and is ignored. ${REMOVED_4X_ARGS[argName]}`,
            false,
            { id: `ember-attacher.removed-arg.${argName}` }
          );
        }
      }
    });
  }

  _ensureArgumentsAreValid(): void {
    runInDebug(() => {
      if (Boolean(this._opt('useCapture')) !== this._lastUseCaptureArgumentValue) {
        warn('The value of the useCapture argument was mutated', {
          id: 'ember-attacher.use-capture-mutated',
        });
      }
    });
  }

  _syncAria(): void {
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

  _initializeAttacher(): void {
    if (this._isDestroyed) {
      return;
    }

    this._removeTargetShowEventListeners();
    this._removeHideEventListeners();

    const explicitId = this._arg('id') || this._elementId;
    const { popoverTargets, allTargets } = explicitId
      ? findTriggerTargetElements(explicitId)
      : { popoverTargets: [] as Element[], allTargets: [] as Element[] };
    this._syncPopoverTargetListeners(popoverTargets);

    const target = resolveAttachmentTarget({
      target: this.targetArg,
      registeredTarget: this._registeredTarget,
      triggerTargets: allTargets,
      floatingElement: this._floatingElement,
    });

    runInDebug(() => {
      if (
        !this._isTooltip &&
        this._floatingElement &&
        this._floatingElement.parentElement?.closest('button, a')
      ) {
        warn(
          '[ember-attacher] Interactive <AttachPopover> / <Attacher> is rendered inside a <button> or <a> element, which creates invalid nested-interactive HTML and bubbles clicks to the parent control. Render the attachment as a sibling with @target=":previous" instead.',
          false,
          { id: 'ember-attacher.nested-interactive-target' }
        );
      }
    });

    this._listenerTarget = getListenerTarget(target);
    this._setTracked('_currentTarget', target);

    if (isElementTarget(target) && this._registeredEntries.has(target)) {
      const entry = this._registeredEntries.get(target)!;
      this._activeEntryOptions = entry.options || null;
      this._setTracked('_data', entry.data);
    }

    this._syncModalContainer();
    syncParentAttachment(this);
    this._syncRelativeTargetObserver();
    this._addShowListenersIfUnregistered();
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
  }

  _addShowListenersIfUnregistered(): void {
    const target = this._listenerTarget;
    if (!target || this._registeredEntries.has(target) || this._popoverTargetEntries.has(target)) {
      return;
    }

    const useCapture = Boolean(this._opt('useCapture'));
    this._showOn.forEach((event) => {
      this._targetShowListenersByEvent[event] = this._showAfterDelay;
      target.addEventListener(event, this._showAfterDelay, useCapture);
    });
  }

  _removeTargetShowEventListeners(): void {
    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    const useCapture = Boolean(this._opt('useCapture'));
    Object.keys(this._targetShowListenersByEvent).forEach((event) => {
      const listener = this._targetShowListenersByEvent[event];
      if (listener) {
        target.removeEventListener(event, listener, useCapture);
      }
      delete this._targetShowListenersByEvent[event];
    });
  }

  _removeHideEventListeners({ restoreClickShow = false } = {}): void {
    const useCapture = Boolean(this._opt('useCapture'));
    this._mouseLeaveOrigin = null;
    Object.keys(this._hideListenersOnDocumentByEvent).forEach((eventType) => {
      const listener = this._hideListenersOnDocumentByEvent[eventType];
      if (listener) {
        document.removeEventListener(eventType, listener, useCapture);
      }
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

      this._targetShowListenersByEvent.click = this._showAfterDelay;
      target.addEventListener('click', this._showAfterDelay, useCapture);
    }

    Object.keys(this._hideListenersOnTargetByEvent).forEach((event) => {
      const listener = this._hideListenersOnTargetByEvent[event];
      if (listener) {
        target.removeEventListener(event, listener, useCapture);
      }
      delete this._hideListenersOnTargetByEvent[event];
    });
  }

  _syncIsShown(): void {
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

  _showAfterDelay(event?: Event): void {
    if (this._isEventFromAttachment(event)) {
      return;
    }

    if (this._suppressFocusShow && (event?.type === 'focus' || event?.type === 'focusin')) {
      return;
    }

    cancelScheduled(this._delayedVisibilityToggle);
    this._cancelCloseAnimation();

    this._isHiding = false;
    this._setTracked('_mustRender', true);
    syncParentAttachment(this);

    this._addListenersForHideEvents();

    const parsedShowDelay = parseInt(String(this._opt('showDelay') ?? 0), 10) || 0;
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

  _show(): void {
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

  _hideAfterDelay(event?: Event): void {
    if (this._isEventFromAttachment(event)) {
      return;
    }

    cancelScheduled(this._delayedVisibilityToggle);
    this._isHiding = true;

    const hideDelay = parseInt(String(this._opt('hideDelay') ?? 0), 10) || 0;
    this._delayedVisibilityToggle = debounceTimeout(
      this._delayedVisibilityToggle,
      this._hide,
      hideDelay,
      !hideDelay
    );
  }

  _hide(): void {
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
    this._isHidden = true;
    this._notifyRenderStateChange();

    const floatingElement = this._floatingElement;
    if (!floatingElement) {
      if (wasShown) {
        (this._arg('onChange') as ((visible: boolean) => unknown) | undefined)?.(false);
      }
      return;
    }

    const hideDuration = parseInt(String(this._opt('hideDuration') ?? 0), 10) || 0;
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

  _addListenersForHideEvents(): void {
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
      const showOnClickListener = this._targetShowListenersByEvent.click;
      if (showOnClickListener) {
        target.removeEventListener('click', showOnClickListener, useCapture);
        delete this._targetShowListenersByEvent.click;
      }

      this._hideListenersOnTargetByEvent.click = this._hideAfterDelay;
      target.addEventListener('click', this._hideAfterDelay, useCapture);
    }

    if (
      hideOn.includes('clickout') &&
      !this._hideListenersOnDocumentByEvent.click &&
      !this._hideListenersOnDocumentByEvent.touchend
    ) {
      const clickoutEvent =
        typeof window !== 'undefined' && 'ontouchstart' in window ? 'touchend' : 'click';
      this._hideListenersOnDocumentByEvent[clickoutEvent] = this._hideOnClickOut;
      document.addEventListener(clickoutEvent, this._hideOnClickOut, useCapture);
    }

    if (hideOn.includes('escapekey') && !this._hideListenersOnDocumentByEvent.keydown) {
      this._hideListenersOnDocumentByEvent.keydown = this._hideOnEscapeKey as EventListener;
      document.addEventListener('keydown', this._hideOnEscapeKey, useCapture);
    }

    if (
      target &&
      hideOn.includes('mouseleave') &&
      !this._hideListenersOnTargetByEvent.mouseleave
    ) {
      this._hideListenersOnTargetByEvent.mouseleave = this._hideOnMouseLeaveTarget as EventListener;
      target.addEventListener('mouseleave', this._hideOnMouseLeaveTarget, useCapture);
    }

    if (target) {
      ['blur', 'focusout'].forEach((eventType) => {
        if (hideOn.includes(eventType) && !this._hideListenersOnTargetByEvent[eventType]) {
          this._hideListenersOnTargetByEvent[eventType] = this._hideOnLostFocus as EventListener;
          target.addEventListener(eventType, this._hideOnLostFocus, useCapture);
        }
      });
    }
  }

  _hideOnMouseLeaveTarget(rawEvent: Event): void {
    const event = rawEvent as MouseEvent;
    if (this._isHidden && !this._isShown) {
      this._hideAfterDelay();
      return;
    }

    if (this._opt('interactive')) {
      this._mouseLeaveOrigin = event ? { x: event.clientX, y: event.clientY } : null;

      if (!this._hideListenersOnDocumentByEvent.mousemove) {
        const useCapture = Boolean(this._opt('useCapture'));
        this._hideListenersOnDocumentByEvent.mousemove =
          this._hideIfMouseOutsideTargetOrAttachment as EventListener;
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

  _hideIfMouseOutsideTargetOrAttachment(rawEvent: Event): void {
    const event = rawEvent as MouseEvent;
    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    const eventTarget = event.target instanceof Node ? event.target : null;
    if (
      !target.contains(eventTarget) &&
      !descendantAttachmentContainsEvent(this, event) &&
      !isCursorInSafePolygon(
        event,
        this._mouseLeaveOrigin,
        this._currentTarget,
        this._floatingElement
      ) &&
      this._floatingElement &&
      !this._floatingElement.contains(eventTarget)
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

  _hideOnClickOut(event: Event): void {
    const target = this._listenerTarget;
    if (elementContainsEvent(target, event) || descendantAttachmentContainsEvent(this, event)) {
      return;
    }

    if (!this._opt('interactive') || !elementContainsEvent(this._floatingElement, event)) {
      this._hideAfterDelay();
    }
  }

  _hideOnEscapeKey(rawEvent: Event): void {
    const event = rawEvent as KeyboardEvent;
    if ((event.key === 'Escape' || event.keyCode === 27) && shouldHandleEscapeKey(this, event)) {
      this._restoreFocusOnHide = !this._isTooltip;
      this._hideAfterDelay();
    }
  }

  _hideOnLostFocus(rawEvent: Event): void {
    const event = rawEvent as FocusEvent;
    if (event.relatedTarget === null) {
      this._hideAfterDelay();
      return;
    }

    const target = this._listenerTarget;
    if (!target) {
      return;
    }

    const relatedNode = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (target.contains(relatedNode) || descendantAttachmentContainsNode(this, relatedNode)) {
      return;
    }

    if (!this._opt('interactive') || !this._floatingElement?.contains(relatedNode)) {
      this._hideAfterDelay();
    }
  }

  _update(): void {
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

    const autoUpdateOpt = this._opt('autoUpdate') as boolean | AutoUpdateOptions | undefined;
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

  _updatePosition(): void {
    if (this._isDestroyed || !this._currentTarget || !this._floatingElement) {
      return;
    }

    if (!isTargetConnected(this._currentTarget) || !this._floatingElement.isConnected) {
      this._cleanup?.();
      this._cleanup = null;
      return;
    }

    const strategy = (this._opt('strategy') as Strategy) || DEFAULTS.strategy;
    const middleware = this._middleware;
    if (hasOffsetMiddleware(middleware)) {
      this._floatingElement.setAttribute('data-offset', '');
    } else {
      this._floatingElement.removeAttribute('data-offset');
    }
    const computePositionToken = attacherWaiter.beginAsync();
    computePosition(this._currentTarget, this._floatingElement, {
      middleware,
      placement: this._opt('placement') as Placement,
      strategy,
      platform: topLayerAwarePlatform,
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
      .catch((error: unknown) => {
        attacherWaiter.endAsync(computePositionToken);

        if (!this._isDestroyed) {
          warn(`[ember-attacher] Positioning error: ${(error as Error)?.message ?? error}`, {
            id: 'ember-attacher.positioning-error',
          });
        }
      });
  }

  _disconnectRelativeTargetObserver(): void {
    this._relativeTargetObserver?.disconnect();
    this._relativeTargetObserver = null;
    this._observedRelativeParent = null;
  }

  _syncRelativeTargetObserver(): void {
    const targetArg = this.targetArg;
    const isPreviousToken =
      typeof targetArg === 'string' &&
      (targetArg === ':previous' || targetArg.startsWith(':previous('));
    const parent = isPreviousToken ? this._floatingElement?.parentElement ?? null : null;

    if (!parent || this._isDestroyed || typeof MutationObserver !== 'function') {
      this._disconnectRelativeTargetObserver();
      return;
    }

    if (this._observedRelativeParent === parent && this._relativeTargetObserver) {
      return;
    }

    this._disconnectRelativeTargetObserver();
    this._observedRelativeParent = parent;
    this._relativeTargetObserver = new MutationObserver(() => {
      if (this._isDestroyed) {
        return;
      }
      const nextToken = this.targetArg;
      if (
        isRelativeTargetToken(nextToken) &&
        (!isTargetConnected(this._currentTarget) ||
          (this._floatingElement != null &&
            peekRelativeTarget(nextToken, this._floatingElement) !== this._currentTarget))
      ) {
        this._initializeAttacher();
      }
    });
    this._relativeTargetObserver.observe(parent, { childList: true });
  }

  destroy(): void {
    if (this._isDestroyed) {
      return;
    }
    this._isDestroyed = true;

    this._disconnectRelativeTargetObserver();
    peekDelayGroup(this._delayGroupOwner)?.close(this, { markWarm: false });
    unregisterAttacher(this);

    this._cleanup?.();
    this._cleanup = null;

    cancelScheduled(this._syncArgsHandle);
    cancelScheduled(this._setTargetHandle);
    this._cancelCloseAnimation();
    cancelScheduled(this._delayedVisibilityToggle);

    this._detachPopoverEvents(this._attachedPopoverEventsOn);
    this._aria.unbind();
    this._removeTargetShowEventListeners();
    this._removeHideEventListeners();
    this._clearPopoverTargetListeners();

    for (const entry of this._registeredEntries.values()) {
      cancelScheduled(entry.updateHandle);
      this._removeEntryShowListeners(entry);
    }
    this._registeredEntries.clear();
  }
}
