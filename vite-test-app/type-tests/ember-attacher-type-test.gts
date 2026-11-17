import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import { on } from '@ember/modifier';
import { find } from '@ember/test-helpers';
import {
  AttachPopover,
  AttachTooltip,
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
  type AttacherArrowOptions,
  type AttacherBlockParams,
  type Middleware,
  type Placement,
  type Strategy,
  type VirtualElement,
} from 'ember-attacher';
import { isVisible } from 'ember-attacher/test-support';
import DirectPopover from 'ember-attacher/components/attach-popover';
import DirectTooltip from 'ember-attacher/components/attach-tooltip';
import DirectBasic from 'ember-attacher/components/basic-attacher';
import DEFAULTS, { type EmberAttacherDefaults } from 'ember-attacher/defaults';
import type EmberAttacherRegistry from 'ember-attacher/template-registry';

// Verify TemplateRegistry exports both PascalCase and kebab-case entries matching exported components
type AssertExact<T, U extends T> = U;
type _VerifyRegistry = [
  AssertExact<typeof AttachPopover, EmberAttacherRegistry['AttachPopover']>,
  AssertExact<typeof AttachPopover, EmberAttacherRegistry['attach-popover']>,
  AssertExact<typeof AttachTooltip, EmberAttacherRegistry['AttachTooltip']>,
  AssertExact<typeof AttachTooltip, EmberAttacherRegistry['attach-tooltip']>,
  AssertExact<typeof BasicAttacher, EmberAttacherRegistry['BasicAttacher']>,
  AssertExact<typeof BasicAttacher, EmberAttacherRegistry['basic-attacher']>,
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
};

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
        as |tooltip|
      >
        <div {{tooltip.reference}}>Content</div>
        <button type="button" {{on "click" tooltip.hide}}>Close</button>
      </AttachTooltip>
    </button>

    <AttachPopover
      @explicitTarget={{fullVirtualTarget}}
      @ariaRole="menu"
      @floatingElementContainer="#portal"
      @floatingUiOptions={{null}}
      @placement={{_defaultPlacement}}
      @strategy={{_defaultStrategy}}
      @interactive={{true}}
      as |popover|
    >
      <div {{popover.reference}}>Virtual target popover</div>
      <button type="button" {{on "click" (fn registerExternal popover targetEl)}}>Retarget</button>
    </AttachPopover>

    <AttachPopover @explicitTarget={{coordinateVirtualTarget}} @showOn={{null}} @hideOn="clickout escapekey">
      Coordinate virtual reference
    </AttachPopover>

    <AttachPopover @explicitTarget="#selector-target" />

    <BasicAttacher @configKey="tooltip" @ariaRole="tooltip">
      Basic usage
    </BasicAttacher>

    <DirectTooltip @placement="right" />
    <DirectPopover @placement="left" />
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
