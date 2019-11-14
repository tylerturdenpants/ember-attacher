import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, click, find, triggerEvent, settled } from '@ember/test-helpers';

module('Integration | Component | showOn', function(hooks) {
  setupRenderingTest(hooks);

  test('uses the defaults when passed `undefined`', async function(assert) {
    assert.expect(4);

    this.set('showOn', undefined);

    await render(hbs`
      <button id="target">
        {{#attach-popover id='attachment' hideOn='click' showOn=showOn}}
          showOn mouseenter
        {{/attach-popover}}
      </button>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await triggerEvent('#target', 'mouseenter');

    await settled();

    assert.equal(isVisible(attachment), true, 'Now shown');

    await click('#target');

    await settled();

    assert.equal(isVisible(attachment), false, 'Hidden again');

    await triggerEvent('#target', 'focus');

    await settled();

    assert.equal(isVisible(attachment), true, 'Shown again');
  });

  test('sets showOn to an empty array when passed `null`', async function(assert) {
    assert.expect(3);

    this.set('showOn', null);

    await render(hbs`
        <button id="target">
          {{#attach-popover id='attachment' hideOn='click' showOn=showOn}}
            showOn mouseenter
          {{/attach-popover}}
        </button>
      `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await triggerEvent('#target', 'mouseenter');

    await settled();

    assert.equal(isVisible(attachment), false, 'Still hidden after mouseenter');

    await triggerEvent('#target', 'focus');

    await settled();

    assert.equal(isVisible(attachment), false, 'Still hidden after focus');
  });

  test("sets showOn to an empty array when passed `''` (empty string)", async function(assert) {
    assert.expect(3);

    this.set('showOn', '');

    await render(hbs`
        <button id="target">
          {{#attach-popover id='attachment' hideOn='click' showOn=showOn}}
            showOn mouseenter
          {{/attach-popover}}
        </button>
      `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await triggerEvent('#target', 'mouseenter');

    await settled();

    assert.equal(isVisible(attachment), false, 'Still hidden after mouseenter');

    await triggerEvent('#target', 'focus');

    await settled();

    assert.equal(isVisible(attachment), false, 'Still hidden after focus');
  });
});
