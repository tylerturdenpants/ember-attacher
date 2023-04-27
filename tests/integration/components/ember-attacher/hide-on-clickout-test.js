import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, click, find, triggerEvent, waitUntil } from '@ember/test-helpers';

module('Integration | Component | hideOn "clickout"', function(hooks) {
  setupRenderingTest(hooks);

  test('hides when an element outside the target is clicked', async function(assert) {
    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me"/>

      <div id="parent">
        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    // Make sure the attachment is still shown when the target is clicked
    await click('#parent');

    assert.equal(isVisible(attachment), true, 'Still shown');

    await click('#focus-me');

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Now hidden');
  });

  test('with interactive=false: hides when attachment is clicked', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div id="parent">
        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await click(attachment);

    assert.equal(isVisible(attachment), false, 'Now hidden');
  });

  test("with interactive=true: doesn't hide when attachment is clicked", async function(assert) {
    assert.expect(4);

    await render(hbs`
      <input type="text" id="focus-me"/>

      <div id="parent">
        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          interactive=true
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    // Make sure attachment stays shown when attachment clicked
    await click(attachment);

    assert.equal(isVisible(attachment), true, 'Still shown');

    // Make sure attachment stays shown when target clicked
    await click('#parent');

    assert.equal(isVisible(attachment), true, 'Still shown');

    // Make sure attachment is hidden once an element outside target or attachment is clicked
    await click('#focus-me');

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Now hidden');
  });

  test('hides when an element outside the target is touched on touch devices', async function(assert) {
    // using `ontouchstart` internally to identify if the current device is touchable
    window.ontouchstart = () => {};

    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me"/>

      <div id="parent">
        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    // Make sure the attachment is still shown when the target is tapped
    await triggerEvent('#parent', 'touchend');

    assert.equal(isVisible(attachment), true, 'Still shown');

    await triggerEvent('#focus-me', 'touchend');

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Now hidden');

    delete window.ontouchstart;
  });
});
