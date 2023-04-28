import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, waitFor } from '@ember/test-helpers';

module('Integration | Component | passing attributes', function(hooks) {
  setupRenderingTest(hooks);

  test('passes the data-attributes down', async function(assert) {

    await render(hbs`
      <button>
        Click me, captain!
        <AttachPopover @id='attachment' @isShown=true data-test-popover data-test-attribute="test">
          Popover With a data-attribute
        </AttachPopover>
      </button>
    `);

    const attachment = await waitFor('#attachment')
    assert.dom(attachment).hasAttribute('data-test-popover')
    assert.dom(attachment).hasAttribute('data-test-attribute', 'test')
  });
});
