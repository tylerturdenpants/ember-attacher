/* eslint-disable ember/no-settled-after-test-helper */
import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, click, find, focus, waitUntil, settled } from '@ember/test-helpers';

module('Integration | Component | hideOn "blur"', function(hooks) {
  setupRenderingTest(hooks);

  test('hides when the target loses focus', async function(assert) {
    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me"/>

      <button id="click-toggle">
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn='blur'
                          showOn='click'}}
          hideOn click
        {{/attach-popover}}
      </button>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#click-toggle');

    await settled();

    assert.equal(isVisible(attachment), true, 'Now shown');

    await focus('#focus-me');

    await settled();

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Hidden again');
  });

  test('with interactive=false: hides when the attachment gains focus', async function(assert) {
    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me"/>

      <button id="click-toggle">
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn='blur'
                          showOn='click'}}
          <input type="text" id="attachment-focus-me"/>
        {{/attach-popover}}
      </button>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#click-toggle');

    await settled();

    assert.equal(isVisible(attachment), true, 'Now shown');

    await focus('#attachment-focus-me');

    await settled();

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Hidden again');
  });

  test("with interactive=true: doesn't hide when attachment gains focus", async function(assert) {
    assert.expect(4);

    await render(hbs`
      <input type="text" id="outer-focus-me"/>

      <button id="click-toggle">
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn='blur'
                          interactive=true
                          showOn='click'}}
          <input type="text" id="attachment-focus-me"/>
        {{/attach-popover}}
      </button>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#click-toggle');

    await settled();

    assert.equal(isVisible(attachment), true, 'Now shown');

    await focus('#attachment-focus-me');

    assert.equal(isVisible(attachment), true, 'Still shown');

    await focus('#click-toggle');

    await waitUntil(() => isVisible(attachment));

    await focus('#outer-focus-me');

    await settled();

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Hidden again');
  });
});
