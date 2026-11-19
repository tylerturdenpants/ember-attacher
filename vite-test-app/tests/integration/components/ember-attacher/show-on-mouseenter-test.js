import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find, triggerEvent } from '@ember/test-helpers';

module('Integration | Component | showOn "mouseenter"', function (hooks) {
  setupRenderingTest(hooks);

  test('shows when the user mouses over the target', async function (assert) {
    assert.expect(2);

    await render(hbs`
      <button id="target" type="button">
        Mouseenter me, captain!
      </button>
      <AttachPopover @id="attachment" @target="#target" @showOn="mouseenter">
        showOn mouseenter
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await triggerEvent('#target', 'mouseenter');

    assert.true(isVisible(attachment), 'Now shown');
  });
});
