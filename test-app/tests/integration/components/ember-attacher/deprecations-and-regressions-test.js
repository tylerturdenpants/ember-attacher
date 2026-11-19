import { registerDeprecationHandler } from '@ember/debug';
import { hbs } from 'ember-cli-htmlbars';
import { isVisible, offset } from 'ember-attacher';
import { isVisible as testSupportIsVisible } from 'ember-attacher/test-support';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import {
  clearRender,
  click,
  find,
  render,
  settled,
  triggerEvent,
  triggerKeyEvent,
  waitUntil,
} from '@ember/test-helpers';

let activeDeprecations = null;

registerDeprecationHandler((message, options, next) => {
  if (activeDeprecations && options?.id?.startsWith('ember-attacher.')) {
    activeDeprecations.push({ message, options });
    return;
  }

  next(message, options);
});

async function collectDeprecations(fn) {
  const collected = [];
  activeDeprecations = collected;
  try {
    await fn();
  } finally {
    activeDeprecations = null;
  }
  return collected;
}

module('Integration | Component | deprecations & regressions', function (hooks) {
  setupRenderingTest(hooks);

  test('emits zero deprecations on explicit-target APIs', async function (assert) {
    this.set('middleware', [offset(6)]);

    const deprecations = await collectDeprecations(async () => {
      await render(hbs`
        <button id="modern-tip-btn" type="button" {{tooltip "Modern modifier" class="clean-tip" showDuration=0 hideDuration=0}}>
          Modifier
        </button>

        <button id="modern-ext-btn" type="button">External Target</button>
        <AttachTooltip @id="modern-ext-tip" @target="#modern-ext-btn" @middleware={{this.middleware}} @showDuration={{0}} @hideDuration={{0}}>
          External tooltip
        </AttachTooltip>

        <AttachPopover @id="modern-block-pop" @showOn="click" @hideOn="click clickout escapekey" @showDuration={{0}} @hideDuration={{0}}>
          <:target as |target|>
            <button id="modern-block-btn" type="button" {{target}}>Block target</button>
          </:target>
          <:content as |a|>
            Block popover ({{a.placement}})
          </:content>
        </AttachPopover>

        <button id="modern-invoker-btn" type="button" popovertarget="modern-invoker-pop">Invoker</button>
        <AttachPopover @id="modern-invoker-pop" @showDuration={{0}} @hideDuration={{0}}>
          Invoker popover
        </AttachPopover>

        <Attacher @id="modern-headless" @showOn="click" @hideOn="clickout escapekey" @showDuration={{0}} @hideDuration={{0}} as |a|>
          <button id="modern-headless-btn" type="button" {{a.target}}>Headless</button>
          <div id="modern-headless-panel" {{a.attachment}}>
            Headless content
            <div {{a.arrow}}></div>
          </div>
        </Attacher>
      `);

      await triggerEvent('#modern-tip-btn', 'mouseenter');
      await triggerEvent('#modern-ext-btn', 'mouseenter');
      await click('#modern-block-btn');
      await click('#modern-invoker-btn');
      await click('#modern-headless-btn');
      await clearRender();
    });

    assert.deepEqual(deprecations, [], 'zero deprecations emitted on 4.4 explicit usage');
  });

  test('re-showing before hideDuration elapses cancels stale hide timer/rAF cleanly', async function (assert) {
    await render(hbs`
      <button id="race-btn" type="button">Race target</button>
      <AttachTooltip
        @id="race-tip"
        @target="#race-btn"
        @showOn="click"
        @hideOn="click"
        @showDuration={{0}}
        @hideDuration={{120}}
        @animation="fade"
      >
        Race content
      </AttachTooltip>
    `);

    const tip = find('#race-tip');
    await click('#race-btn');
    await waitUntil(() => isVisible(tip));
    assert.true(isVisible(tip), 'opens initially');

    // Start hide (schedules 120ms hideDuration timer) then immediately re-show before 120ms elapses
    await click('#race-btn');
    await click('#race-btn');

    await new Promise((resolve) => setTimeout(resolve, 180));
    await settled();

    assert.true(isVisible(tip), 'remains visible after stale hideDuration window elapses');
  });

  test('LIFO Escape and clickout handle singleton {{tooltip}} inside popover and headless <Attacher> trees', async function (assert) {
    await render(hbs`
      <button id="outside-target" type="button" {{tooltip "Outside tip" showDuration=0 hideDuration=0}}>
        Outside
      </button>

      <button id="outer-pop-btn" type="button">Outer Popover</button>
      <AttachPopover
        @id="outer-pop"
        @target="#outer-pop-btn"
        @showOn="click"
        @hideOn="clickout escapekey"
        @interactive={{true}}
        @showDuration={{0}}
        @hideDuration={{0}}
      >
        <button id="inner-pooled-btn" type="button" {{tooltip "Inner pooled tip" showDuration=0 hideDuration=0}}>
          Inner tooltip trigger
        </button>
      </AttachPopover>

      <Attacher
        @id="headless-parent"
        @showOn="click"
        @hideOn="clickout escapekey"
        @interactive={{true}}
        @showDuration={{0}}
        @hideDuration={{0}}
        as |a|
      >
        <button id="headless-parent-btn" type="button" {{a.target}}>Headless parent</button>
        <div id="headless-parent-panel" class="custom-headless-surface" {{a.attachment}}>
          <button id="headless-child-btn" type="button">Child trigger</button>
          <AttachPopover
            @id="headless-child-pop"
            @target="#headless-child-btn"
            @showOn="click"
            @hideOn="clickout escapekey"
            @interactive={{true}}
            @showDuration={{0}}
            @hideDuration={{0}}
          >
            <span id="headless-child-content">Inside headless child</span>
          </AttachPopover>
        </div>
      </Attacher>
    `);

    const outerPop = find('#outer-pop');
    await click('#outer-pop-btn');
    await waitUntil(() => isVisible(outerPop));

    await triggerEvent('#inner-pooled-btn', 'mouseenter');
    await waitUntil(() => isVisible(find('.ember-attacher-tooltip').closest('.ember-attacher')));
    const singletonTip = find('.ember-attacher-tooltip').closest('.ember-attacher');

    // First Escape closes the nested singleton tooltip, leaving the outer popover open
    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => !isVisible(singletonTip));
    assert.false(isVisible(singletonTip), 'first Escape dismisses inner singleton tooltip');
    assert.true(isVisible(outerPop), 'outer popover stays open after first Escape');

    // Second Escape dismisses the outer popover
    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => !isVisible(outerPop));
    assert.false(isVisible(outerPop), 'second Escape dismisses outer popover');

    // Outside tooltip no longer treated as inside closed popover
    await triggerEvent('#outside-target', 'mouseenter');
    await waitUntil(() => isVisible(singletonTip));
    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => !isVisible(singletonTip));
    assert.false(isVisible(singletonTip), 'outside singleton tooltip dismisses cleanly via Escape');

    // Headless <Attacher> without .ember-attacher class participates in nested clickout & LIFO Escape
    const headlessParent = find('#headless-parent-panel');
    const headlessChild = find('#headless-child-pop');
    await click('#headless-parent-btn');
    await waitUntil(() => isVisible(headlessParent));

    await click('#headless-child-btn');
    await waitUntil(() => isVisible(headlessChild));

    await click('#headless-child-content');
    assert.true(isVisible(headlessChild), 'clicking inside child keeps child open');
    assert.true(isVisible(headlessParent), 'clicking inside child keeps headless parent open');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => !isVisible(headlessChild));
    assert.false(isVisible(headlessChild), 'first Escape closes child inside headless <Attacher>');
    assert.true(isVisible(headlessParent), 'headless parent stays open after first Escape');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => !isVisible(headlessParent));
    assert.false(isVisible(headlessParent), 'second Escape closes headless parent');
  });

  test('empty {{tooltip}} allocates zero DOM nodes and activates/deactivates dynamically', async function (assert) {
    this.set('tipText', '');

    await render(hbs`
      <button id="empty-tip-btn" type="button" {{tooltip this.tipText showDuration=0 hideDuration=0}}>
        Dynamic tooltip
      </button>
    `);

    const btn = find('#empty-tip-btn');
    await triggerEvent(btn, 'mouseenter');

    assert.strictEqual(
      document.querySelectorAll('.ember-attacher').length,
      0,
      'allocates zero Attachment DOM nodes when tooltip text is empty'
    );
    assert.dom(btn).doesNotHaveAttribute('aria-describedby');

    this.set('tipText', null);
    await settled();
    assert.strictEqual(document.querySelectorAll('.ember-attacher').length, 0);

    // Setting text activates tooltip
    this.set('tipText', 'Dynamic hello');
    await settled();
    await triggerEvent(btn, 'mouseenter');
    await waitUntil(() => isVisible(find('.ember-attacher')));
    assert.dom('.ember-attacher').hasText('Dynamic hello');
    assert.dom(btn).hasAttribute('aria-describedby');

    // Clearing text while open hides and tears down unused singleton DOM node
    this.set('tipText', '');
    await settled();
    assert.strictEqual(
      document.querySelectorAll('.ember-attacher').length,
      0,
      'removes singleton DOM node when text clears back to empty'
    );
    assert.dom(btn).doesNotHaveAttribute('aria-describedby');
  });

  test('controlled @isShown={{true}} arg updates do not re-trigger @onChange and isVisible error names missing selector', async function (assert) {
    const onChangeCalls = [];
    this.set('placement', 'top');
    this.set('onChange', (val) => onChangeCalls.push(val));

    await render(hbs`
      <button id="ctrl-btn" type="button">Controlled</button>
      <AttachTooltip
        @id="ctrl-tip"
        @target="#ctrl-btn"
        @isShown={{true}}
        @placement={{this.placement}}
        @onChange={{this.onChange}}
        @showDuration={{0}}
        @hideDuration={{0}}
      >
        Controlled tooltip
      </AttachTooltip>
    `);

    const tip = find('#ctrl-tip');
    await waitUntil(() => isVisible(tip));
    assert.deepEqual(onChangeCalls, [true], 'initial @isShown={{true}} fires @onChange(true) once');

    this.set('placement', 'bottom');
    await settled();
    assert.true(isVisible(tip), 'remains visible after placement update');
    assert.deepEqual(
      onChangeCalls,
      [true],
      'updating @placement while @isShown={{true}} does not re-fire @onChange(true)'
    );

    assert.throws(
      () => testSupportIsVisible('#missing-attacher-selector'),
      /Could not locate attachment from selector: #missing-attacher-selector/,
      'isVisible error message includes the missing selector string'
    );
  });

  test('explicit {{null}} on non-trigger options falls back to defaults', async function (assert) {
    this.set('virtualTarget', {
      getBoundingClientRect: () => ({
        top: 200,
        bottom: 230,
        left: 200,
        right: 280,
        width: 80,
        height: 30,
        x: 200,
        y: 200,
      }),
    });

    await render(hbs`
      <AttachTooltip
        @id="null-opt-tip"
        @target={{this.virtualTarget}}
        @placement={{null}}
        @strategy={{null}}
        @isShown={{true}}
        @showDuration={{0}}
        @hideDuration={{0}}
      >
        Null fallback tip
      </AttachTooltip>
    `);

    const tip = find('#null-opt-tip');
    await waitUntil(() => isVisible(tip));
    assert.strictEqual(tip.getAttribute('x-placement'), 'top', 'falls back to default top placement');
    assert.strictEqual(tip.style.position, 'absolute', 'falls back to default absolute strategy');
  });
});
