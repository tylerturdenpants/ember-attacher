import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, triggerKeyEvent, waitUntil, waitFor } from '@ember/test-helpers';

module('Integration | Component | hideOn "escapekey"', function(hooks) {
  setupRenderingTest(hooks);

  test('hides when the escape key is pressed', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div>
        {{#attach-popover id='attachment'
                          hideOn='escapekey'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = await waitFor('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    // Press escape key (keyCode === 27)
    await triggerKeyEvent(document, 'keydown', 27);

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Now hidden');
  });
});
