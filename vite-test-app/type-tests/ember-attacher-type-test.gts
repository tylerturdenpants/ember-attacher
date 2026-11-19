import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { find } from '@ember/test-helpers';
import {
  AttachPopover,
  AttachTooltip,
  Attacher,
  arrow,
  autoPlacement,
  flip,
  hide,
  inline,
  isVisible as rootIsVisible,
  limitShift,
  offset,
  shift,
  size,
  tooltip,
  type AttacherArrowOptions,
  type AttacherBlockParams,
  type AttacherYieldedApi,
  type Middleware,
  type MiddlewareData,
  type Placement,
  type Strategy,
  type TooltipModifierOptions,
  type VirtualElement,
} from 'ember-attacher';
import {
  assertAttached,
  isVisible,
  type AssertAttachedOptions,
  type ElementOrSelector,
  type ResultPusher,
} from 'ember-attacher/test-support';
import DirectPopover from 'ember-attacher/components/attach-popover';
import DirectTooltip from 'ember-attacher/components/attach-tooltip';
import DirectAttacher from 'ember-attacher/components/attacher';
import DirectTooltipModifier from 'ember-attacher/modifiers/tooltip';
import DEFAULTS, { type EmberAttacherDefaults } from 'ember-attacher/defaults';
import type EmberAttacherRegistry from 'ember-attacher/template-registry';

// @ts-expect-error: BasicAttacher was removed in 5.0.0
import { BasicAttacher as _RemovedBasicAttacher } from 'ember-attacher';
void _RemovedBasicAttacher;

// @ts-expect-error: ember-attacher/components/basic-attacher was removed in 5.0.0
import _DirectRemovedBasic from 'ember-attacher/components/basic-attacher';
void _DirectRemovedBasic;

// @ts-expect-error: BasicAttacher was removed from EmberAttacherRegistry in 5.0.0
type _RemovedRegistryEntry = EmberAttacherRegistry['BasicAttacher'];
// @ts-expect-error: basic-attacher was removed from EmberAttacherRegistry in 5.0.0
type _RemovedKebabRegistryEntry = EmberAttacherRegistry['basic-attacher'];

// Verify TemplateRegistry exports both PascalCase and kebab-case entries matching exported components & modifier
type AssertExact<T, U extends T> = U;
type _VerifyRegistry = [
  AssertExact<typeof AttachPopover, EmberAttacherRegistry['AttachPopover']>,
  AssertExact<typeof AttachPopover, EmberAttacherRegistry['attach-popover']>,
  AssertExact<typeof AttachTooltip, EmberAttacherRegistry['AttachTooltip']>,
  AssertExact<typeof AttachTooltip, EmberAttacherRegistry['attach-tooltip']>,
  AssertExact<typeof Attacher, EmberAttacherRegistry['Attacher']>,
  AssertExact<typeof Attacher, EmberAttacherRegistry['attacher']>,
  AssertExact<typeof tooltip, EmberAttacherRegistry['tooltip']>,
];

const _defaults: EmberAttacherDefaults = DEFAULTS;
const _defaultPlacement: Placement = _defaults.placement;
const _defaultStrategy: Strategy = _defaults.strategy;

// Verify test-support & root isVisible
const _v1: boolean = isVisible('#my-tooltip');
const _v2: boolean = rootIsVisible(find('#my-tooltip'), find('#container'));

// Verify VirtualElement shape (with and without getClientRects / contextElement)
const coordinateVirtualTarget: VirtualElement = {
  getBoundingClientRect() {
    return {
      x: 10,
      y: 20,
      top: 20,
      left: 10,
      bottom: 40,
      right: 50,
      width: 40,
      height: 20,
    };
  },
};

const targetEl = document.createElement('span');
const fullVirtualTarget: VirtualElement = {
  contextElement: targetEl,
  getBoundingClientRect: () => targetEl.getBoundingClientRect(),
  getClientRects: () => targetEl.getClientRects(),
};

const _arrowOptsWithoutElement: AttacherArrowOptions = { padding: 4 };
const customMiddleware: Array<Middleware> = [
  offset(8),
  flip(),
  shift({ limiter: limitShift(), padding: 4 }),
  autoPlacement(),
  hide(),
  inline(),
  size({ apply: () => {} }),
  arrow(),
  arrow(_arrowOptsWithoutElement),
  arrow({ element: targetEl, padding: 6 }),
  arrow((state) => ({ padding: state.rects.floating.width > 100 ? 8 : 4 })),
];

const _tooltipModifierOpts: TooltipModifierOptions = {
  class: 'tip-custom',
  placement: 'bottom',
  animation: 'fade',
  arrow: true,
  showDelay: 200,
};
void _tooltipModifierOpts;

const handleChange = (visible: boolean) => {
  void visible;
};

const registerExternal = (attacher: AttacherBlockParams, el: Element) => {
  attacher.setTarget(el, { label: 'row-1' });
  attacher.show(el, { label: 'row-2' });
  attacher.toggle();
  attacher.update();
};

const readAttacherYields = (a: AttacherYieldedApi) => {
  const shown: boolean = a.isShown;
  const rendered: boolean = a.shouldRender;
  const placement: Placement = a.placement;
  const middlewareData: MiddlewareData = a.middlewareData;
  const data: unknown = a.data;
  void shown;
  void rendered;
  void placement;
  void middlewareData;
  void data;
};
void readAttacherYields;

const itemA = { id: 1, name: 'Alpha' };

export class ValidUsageDemo extends Component {
  <template>
    <AttachTooltip
      @id="tip-1"
      @target="#demo-target"
      @animation="fill"
      @ariaRole="tooltip"
      @arrow={{true}}
      @autoUpdate={{true}}
      @class="my-tip"
      @hideDelay={{0}}
      @hideDuration="300"
      @hideOn="mouseleave blur escapekey"
      @interactive={{true}}
      @isShown={{true}}
      @lazyRender={{true}}
      @middleware={{customMiddleware}}
      @onChange={{handleChange}}
      @placement="top-start"
      @renderInPlace={{false}}
      @showDelay="0"
      @showDuration={{150}}
      @showOn="mouseenter focus"
      @strategy="fixed"
      @useCapture={{false}}
      class="splatted-class"
      data-test-tooltip
      as |tip|
    >
      <div {{tip.target}}>Content</div>
      <button type="button" {{on "click" tip.hide}}>Close</button>
    </AttachTooltip>

    <AttachPopover
      @target={{fullVirtualTarget}}
      @ariaRole="menu"
      @placement={{_defaultPlacement}}
      @strategy={{_defaultStrategy}}
      @interactive={{true}}
      as |popover|
    >
      <div {{popover.target}}>Virtual target popover ({{popover.placement}})</div>
      <button type="button" {{on "click" (fn registerExternal popover targetEl)}}>Retarget</button>
    </AttachPopover>

    <AttachPopover @target={{coordinateVirtualTarget}} @showOn={{null}} @hideOn="clickout escapekey">
      Coordinate virtual reference
    </AttachPopover>

    <AttachTooltip @target="#selector-target" />

    <AttachTooltip>
      <:target as |target a|>
        <button type="button" {{target itemA}} aria-expanded={{if a.isShown "true" "false"}}>
          Hover named target
        </button>
      </:target>
      <:content as |a|>
        Placement: {{a.placement}} / Open: {{if a.isShown "yes" "no"}}
        <button type="button" {{on "click" a.update}}>Update</button>
      </:content>
    </AttachTooltip>

    <button type="button" {{tooltip "Quick hint" class="singleton-tip" placement="bottom" arrow=true}}>
      Singleton tooltip
    </button>

    <input aria-label="Filter" {{DirectTooltipModifier "Search" placement="right"}} />

    <Attacher @placement="bottom-start" @showOn="click" @hideOn="clickout escapekey" as |a|>
      <button type="button" {{a.target itemA}}>Open Headless</button>
      {{#if a.shouldRender}}
        <div class="headless-panel" {{a.attachment}}>
          Panel at {{a.placement}} (offset: {{a.middlewareData.offset.y}})
          <div {{a.arrow}}></div>
          <button type="button" {{on "click" a.hide}}>Done</button>
        </div>
      {{/if}}
    </Attacher>

    <DirectTooltip @target="#selector-target" @placement="right" />
    <DirectPopover @target="#selector-target" @placement="left" />
    <DirectAttacher @placement="top" as |a|>
      <button type="button" {{a.target}}>Headless</button>
      <div {{a.attachment}}>Body</div>
    </DirectAttacher>
  </template>
}

export class InvalidUsageChecks extends Component {
  <template>
    {{! @glint-expect-error: invalid placement union member }}
    <AttachTooltip @placement="nowhere" />

    {{! @glint-expect-error: invalid strategy union member }}
    <AttachPopover @strategy="sticky" />

    {{! @glint-expect-error: @nonExistentArg is not part of AttachPopoverArgs }}
    <AttachPopover @nonExistentArg={{true}} />

    {{! @glint-expect-error: @explicitTarget was removed in 5.0.0 }}
    <AttachPopover @explicitTarget="#x" />

    {{! @glint-expect-error: @flip was removed in 5.0.0 }}
    <AttachTooltip @flip="bottom left" />

    {{! @glint-expect-error: @overflowPadding was removed in 5.0.0 }}
    <AttachTooltip @overflowPadding={{5}} />

    {{! @glint-expect-error: @floatingUiOptions was removed in 5.0.0 }}
    <AttachPopover @floatingUiOptions={{null}} />

    {{! @glint-expect-error: @floatingElementContainer was removed in 5.0.0 }}
    <AttachPopover @floatingElementContainer="#portal" />

    {{! @glint-expect-error: @isOffset was removed in 5.0.0 }}
    <AttachTooltip @isOffset={{true}} />

    {{! @glint-expect-error: @style was removed in 5.0.0 }}
    <AttachTooltip @style="color: red;" />

    {{! @glint-expect-error: @additionalClass was removed in 5.0.0 }}
    <AttachTooltip @additionalClass="extra" />

    {{! @glint-expect-error: @onInitializeAttacher was removed in 5.0.0 }}
    <AttachPopover @onInitializeAttacher={{handleChange}} />

    {{! @glint-expect-error: @onWillDestroy was removed in 5.0.0 }}
    <AttachPopover @onWillDestroy={{handleChange}} />

    {{! @glint-expect-error: @configKey was removed in 5.0.0 }}
    <AttachTooltip @configKey="popover" />

    <AttachTooltip @target="#x" as |tip|>
      {{! @glint-expect-error: yielded tip.reference modifier was removed in 5.0.0 }}
      <span {{tip.reference}}>Removed</span>
    </AttachTooltip>

    {{! @glint-expect-error: tooltip modifier requires positional string argument }}
    <button type="button" {{tooltip placement="bad-placement"}}>Invalid</button>
  </template>
}

void _v1;
void _v2;
void ({} as _VerifyRegistry);

// @ts-expect-error: setReference method was removed from AttacherBlockParams in 5.0.0
const _removedSetRef = (a: AttacherBlockParams) => a.setReference(targetEl);
void _removedSetRef;

function fn<A, R>(callback: (a: A, b: Element) => R, a: A): () => R {
  return () => callback(a, targetEl);
}

// @ts-expect-error: isVisible rejects arbitrary numbers
isVisible(123);

// Verify test-support assertAttached accepts find() / querySelector() Element | null and options
const _assertPusher: ResultPusher = {
  pushResult: (_res) => {},
};
const _attachSelector: ElementOrSelector = find('#my-tooltip');
const _attachOptions: AssertAttachedOptions = {
  placement: 'bottom-start',
  maxGap: 16,
  tolerance: 2,
  message: 'positioned cleanly',
};
assertAttached(_assertPusher, _attachSelector, find('#trigger'), _attachOptions);
assertAttached(_assertPusher, '#tip', document.querySelector('#trigger'));

// @ts-expect-error: assertAttached rejects invalid placement literals
assertAttached(_assertPusher, '#tip', '#trigger', { placement: 'nowhere' });

// @ts-expect-error: assertAttached rejects arbitrary numbers
assertAttached(_assertPusher, 123, '#trigger');

// @ts-expect-error: VirtualElement requires getBoundingClientRect()
const _badVirtual: VirtualElement = { contextElement: targetEl };
void _badVirtual;
