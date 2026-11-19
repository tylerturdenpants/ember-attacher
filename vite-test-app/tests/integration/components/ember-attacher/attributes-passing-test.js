import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, waitFor } from '@ember/test-helpers';

module('Integration | Component | passing attributes', function (hooks) {
  setupRenderingTest(hooks);

  test('it passes the data-attributes down to popover', async function (assert) {
    await render(hbs`
      <button id="popover-target" type="button">Click me, captain!</button>
      <AttachPopover @id="attachment" @target="#popover-target" @isShown={{true}} data-test-popover data-test-attribute="test">
        Popover With a data-attribute
      </AttachPopover>
    `);

    const attachment = await waitFor('#attachment');
    assert.dom(attachment).hasAttribute('data-test-popover');
    assert.dom(attachment).hasAttribute('data-test-attribute', 'test');
  });

  test('it passes the data-attributes down to tooltip', async function (assert) {
    await render(hbs`
      <button id="tooltip-target" type="button">Hover me, captain!</button>
      <AttachTooltip @id="attachment" @target="#tooltip-target" @isShown={{true}} data-test-tooltip data-test-attribute="test">
        Popover With a data-attribute
      </AttachTooltip>
    `);

    const attachment = await waitFor('#attachment');
    assert.dom(attachment).hasAttribute('data-test-tooltip');
    assert.dom(attachment).hasAttribute('data-test-attribute', 'test');
  });
});
