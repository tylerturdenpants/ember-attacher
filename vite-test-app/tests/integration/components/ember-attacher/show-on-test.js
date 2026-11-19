import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, find, triggerEvent } from '@ember/test-helpers';

module('Integration | Component | showOn', function (hooks) {
  setupRenderingTest(hooks);

  test('uses the defaults when passed `undefined`', async function (assert) {
    assert.expect(4);

    this.set('showOn', undefined);

    await render(hbs`
      <button id="target" type="button">Target</button>
      <AttachPopover @id="attachment" @target="#target" @hideOn="click" @showOn={{this.showOn}}>
        showOn mouseenter
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await triggerEvent('#target', 'mouseenter');

    assert.true(isVisible(attachment), 'Now shown');

    await click('#target');

    assert.false(isVisible(attachment), 'Hidden again');

    await triggerEvent('#target', 'focus');

    assert.true(isVisible(attachment), 'Shown again');
  });

  test('sets showOn to an empty array when passed `null`', async function (assert) {
    assert.expect(3);

    this.set('showOn', null);

    await render(hbs`
      <button id="target" type="button">Target</button>
      <AttachPopover @id="attachment" @target="#target" @hideOn="click" @showOn={{this.showOn}}>
        showOn mouseenter
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await triggerEvent('#target', 'mouseenter');

    assert.false(isVisible(attachment), 'Still hidden after mouseenter');

    await triggerEvent('#target', 'focus');

    assert.false(isVisible(attachment), 'Still hidden after focus');
  });

  test("sets showOn to an empty array when passed `''` (empty string)", async function (assert) {
    assert.expect(3);

    this.set('showOn', '');

    await render(hbs`
      <button id="target" type="button">Target</button>
      <AttachPopover @id="attachment" @target="#target" @hideOn="click" @showOn={{this.showOn}}>
        showOn mouseenter
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await triggerEvent('#target', 'mouseenter');

    assert.false(isVisible(attachment), 'Still hidden after mouseenter');

    await triggerEvent('#target', 'focus');

    assert.false(isVisible(attachment), 'Still hidden after focus');
  });
});
