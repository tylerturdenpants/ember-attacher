import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, find, render } from '@ember/test-helpers';
import {
  AttachPopover,
  AttachTooltip,
  BasicAttacher,
  isVisible as rootIsVisible,
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
});
