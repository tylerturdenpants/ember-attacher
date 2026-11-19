import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, find } from '@ember/test-helpers';

module('Integration | Component | showOn "click"', function (hooks) {
  setupRenderingTest(hooks);

  test('shows when the target is clicked', async function (assert) {
    assert.expect(2);

    await render(hbs`
      <button id="click-toggle" type="button">
        Click me, captain!
      </button>
      <AttachPopover @id="attachment" @target="#click-toggle" @showOn="click">
        showOn click
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#click-toggle');

    assert.true(isVisible(attachment), 'Now shown');
  });
});
