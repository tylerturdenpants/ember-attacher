import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, find, render } from '@ember/test-helpers';
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
} from 'ember-attacher';
import { isVisible } from 'ember-attacher/test-support';

module('Integration | Vite + .gjs | ember-attacher root exports', function (hooks) {
  setupRenderingTest(hooks);

  test('explicit root exports and styles work in Ember 7 + Vite .gjs', async function (assert) {
    assert.strictEqual(
      rootIsVisible,
      isVisible,
      'root isVisible matches ember-attacher/test-support',
    );
    assert.strictEqual(typeof offset, 'function', 're-exports offset middleware builder');
    assert.strictEqual(typeof flip, 'function', 're-exports flip middleware builder');
    assert.strictEqual(typeof shift, 'function', 're-exports shift middleware builder');
    assert.strictEqual(typeof limitShift, 'function', 're-exports limitShift middleware builder');
    assert.strictEqual(typeof size, 'function', 're-exports size middleware builder');
    assert.strictEqual(typeof inline, 'function', 're-exports inline middleware builder');
    assert.strictEqual(typeof hide, 'function', 're-exports hide middleware builder');
    assert.strictEqual(typeof autoPlacement, 'function', 're-exports autoPlacement middleware builder');
    assert.strictEqual(typeof arrow, 'function', 're-exports arrow middleware builder');

    await render(<template>
      <button id="vite-tooltip-btn" type="button">
        Tooltip Trigger
        <AttachTooltip @id="vite-tooltip" @showOn="click" @hideOn="click">
          Vite tooltip content
        </AttachTooltip>
      </button>

      <button id="vite-popover-btn" type="button">Popover Trigger</button>
      <AttachPopover
        @id="vite-popover"
        @explicitTarget="#vite-popover-btn"
        @showOn="click"
        @hideOn="click"
      >
        Vite popover content
      </AttachPopover>

      <div id="vite-basic-target">
        <BasicAttacher @id="vite-basic" @showOn="click" @hideOn="click">
          Vite basic content
        </BasicAttacher>
      </div>
    </template>);

    assert.false(isVisible('#vite-tooltip'), 'tooltip starts hidden');
    assert.false(isVisible('#vite-popover'), 'popover starts hidden');
    assert.false(isVisible('#vite-basic'), 'basic attacher starts hidden');

    await click('#vite-tooltip-btn');
    assert.true(isVisible('#vite-tooltip'), 'tooltip opens on click');
    assert.strictEqual(
      getComputedStyle(find('#vite-tooltip > .ember-attacher-tooltip')).paddingLeft,
      '16px',
      'ember-attacher/styles CSS is loaded in Vite build',
    );

    await click('#vite-popover-btn');
    assert.true(isVisible('#vite-popover'), 'popover opens for @explicitTarget');

    await click('#vite-basic-target');
    assert.true(isVisible('#vite-basic'), 'BasicAttacher opens on click');
  });

  test('Attacher and tooltip root exports work in Ember 7 + Vite .gjs', async function (assert) {
    await render(<template>
      <button
        id="vite-singleton-btn"
        type="button"
        {{tooltip "Singleton in Vite" class="vite-tip" showOn="click" hideOn="click" showDuration=0 hideDuration=0}}
      >
        Singleton
      </button>

      <Attacher @id="vite-headless" @showOn="click" @hideOn="click" @showDuration={{0}} @hideDuration={{0}} as |a|>
        <button id="vite-headless-btn" type="button" {{a.target}}>Headless</button>
        <div id="vite-headless-panel" {{a.attachment}}>Headless {{a.placement}}</div>
      </Attacher>
    </template>);

    await click('#vite-singleton-btn');
    const tipEl = find('.ember-attacher-tooltip.vite-tip');
    assert.ok(tipEl, 'singleton tooltip rendered with custom class');
    assert.true(isVisible(tipEl.closest('.ember-attacher')), 'singleton tooltip opens on click in Vite');

    await click('#vite-headless-btn');
    assert.true(isVisible('#vite-headless-panel'), 'headless Attacher opens on click in Vite');
  });
});
