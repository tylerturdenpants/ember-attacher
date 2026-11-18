import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { on } from '@ember/modifier';
import { find } from '@ember/test-helpers';
import {
  AttachPopover,
  AttachTooltip,
  Attacher,
  BasicAttacher,
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
import { isVisible } from 'ember-attacher/test-support';
import DirectPopover from 'ember-attacher/components/attach-popover';
import DirectTooltip from 'ember-attacher/components/attach-tooltip';
import DirectAttacher from 'ember-attacher/components/attacher';
import DirectBasic from 'ember-attacher/components/basic-attacher';
import DirectTooltipModifier from 'ember-attacher/modifiers/tooltip';
import DEFAULTS, { type EmberAttacherDefaults } from 'ember-attacher/defaults';
import type EmberAttacherRegistry from 'ember-attacher/template-registry';

// Verify TemplateRegistry exports both PascalCase and kebab-case entries matching exported components & modifier
type AssertExact<T, U extends T> = U;
type _VerifyRegistry = [
  AssertExact<typeof AttachPopover, EmberAttacherRegistry['AttachPopover']>,
  AssertExact<typeof AttachPopover, EmberAttacherRegistry['attach-popover']>,
  AssertExact<typeof AttachTooltip, EmberAttacherRegistry['AttachTooltip']>,
  AssertExact<typeof AttachTooltip, EmberAttacherRegistry['attach-tooltip']>,
  AssertExact<typeof Attacher, EmberAttacherRegistry['Attacher']>,
  AssertExact<typeof Attacher, EmberAttacherRegistry['attacher']>,
  AssertExact<typeof BasicAttacher, EmberAttacherRegistry['BasicAttacher']>,
  AssertExact<typeof BasicAttacher, EmberAttacherRegistry['basic-attacher']>,
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

const trustedStyle = htmlSafe('max-width: 240px;');

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

const handleInit = (target: Element | VirtualElement | null, id: string) => {
  void target;
  void id;
};

const handleDestroy = (target: Element | VirtualElement | null, id: string) => {
  void target;
  void id;
};

const registerExternal = (attacher: AttacherBlockParams, el: Element) => {
  attacher.setReference(el);
  attacher.setReference(coordinateVirtualTarget);
  attacher.setReference(null);
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
    <button id="demo-target" type="button">
      Trigger
      <AttachTooltip
        @id="tip-1"
        @animation="fill"
        @ariaRole="tooltip"
        @arrow={{true}}
        @autoUpdate={{true}}
        @class="my-tip"
        @additionalClass="extra-tip"
        @flip="bottom left"
        @hideDelay={{0}}
        @hideDuration="300"
        @hideOn="mouseleave blur escapekey"
        @interactive={{true}}
        @isOffset={{false}}
        @isShown={{true}}
        @lazyRender={{true}}
        @middleware={{customMiddleware}}
        @onChange={{handleChange}}
        @onInitializeAttacher={{handleInit}}
        @onWillDestroy={{handleDestroy}}
        @overflowPadding={{5}}
        @placement="top-start"
        @renderInPlace={{false}}
        @showDelay="0"
        @showDuration={{150}}
        @showOn="mouseenter focus"
        @strategy="fixed"
        @style={{trustedStyle}}
        @useCapture={{false}}
        class="splatted-class"
        data-test-tooltip
        as |tip|
      >
        <div {{tip.reference}}>Content</div>
        <button type="button" {{on "click" tip.hide}}>Close</button>
      </AttachTooltip>
    </button>

    <AttachPopover
      @target={{fullVirtualTarget}}
      @ariaRole="menu"
      @floatingElementContainer="#portal"
      @floatingUiOptions={{null}}
      @placement={{_defaultPlacement}}
      @strategy={{_defaultStrategy}}
      @interactive={{true}}
      as |popover|
    >
      <div {{popover.reference}}>Virtual target popover ({{popover.placement}})</div>
      <button type="button" {{on "click" (fn registerExternal popover targetEl)}}>Retarget</button>
    </AttachPopover>

    <AttachPopover @explicitTarget={{coordinateVirtualTarget}} @showOn={{null}} @hideOn="clickout escapekey">
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

    <BasicAttacher @configKey="tooltip" @ariaRole="tooltip">
      Basic usage
    </BasicAttacher>

    <DirectTooltip @placement="right" />
    <DirectPopover @placement="left" />
    <DirectAttacher @placement="top" as |a|>
      <button type="button" {{a.target}}>Headless</button>
      <div {{a.attachment}}>Body</div>
    </DirectAttacher>
    <DirectBasic @configKey="popover" />
  </template>
}

export class InvalidUsageChecks extends Component {
  <template>
    {{! @glint-expect-error: invalid placement union member }}
    <AttachTooltip @placement="nowhere" />

    {{! @glint-expect-error: invalid strategy union member }}
    <AttachPopover @strategy="sticky" />

    {{! @glint-expect-error: plain string is rejected for @style (requires htmlSafe) }}
    <AttachTooltip @style="color: red;" />

    {{! @glint-expect-error: @nonExistentArg is not part of AttachPopoverArgs }}
    <AttachPopover @nonExistentArg={{true}} />

    {{! @glint-expect-error: @configKey is internalized on AttachTooltip }}
    <AttachTooltip @configKey="popover" />

    {{! @glint-expect-error: tooltip modifier requires positional string argument }}
    <button type="button" {{tooltip placement="bad-placement"}}>Invalid</button>
  </template>
}

void _v1;
void _v2;
void ({} as _VerifyRegistry);

function fn<A, R>(callback: (a: A, b: Element) => R, a: A): () => R {
  return () => callback(a, targetEl);
}

// @ts-expect-error: isVisible rejects arbitrary numbers
isVisible(123);

// @ts-expect-error: VirtualElement requires getBoundingClientRect()
const _badVirtual: VirtualElement = { contextElement: targetEl };
void _badVirtual;
