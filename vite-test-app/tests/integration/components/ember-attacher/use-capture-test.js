import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';

module('Integration | Component | useCapture "true"', function (hooks) {
  setupRenderingTest(hooks);

  test('hides a popover when the clicked element does not bubble the click event', async function (assert) {
    assert.expect(2);

    this.set('stopClick', (e) => {
      e.stopPropagation();
    });

    await render(hbs`
      <div id="click-out-target" {{on "click" this.stopClick}}></div>

      <button id="target-btn" type="button">
        Click me, captain!
      </button>
      <AttachPopover
        @id="attachment"
        @target="#target-btn"
        @hideOn="clickout"
        @isShown={{true}}
        @useCapture={{true}}
      >
        hideOn clickout
      </AttachPopover>
    `);

    assert.true(isVisible('#attachment'), 'Initially shown');

    await click('#click-out-target');

    assert.false(isVisible('#attachment'), 'Now hidden');
  });
});
