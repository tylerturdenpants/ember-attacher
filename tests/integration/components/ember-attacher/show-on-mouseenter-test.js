import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, find, triggerEvent } from '@ember/test-helpers';

module('Integration | Component | showOn "mouseenter"', function(hooks) {
  setupRenderingTest(hooks);

  test('shows when the user mouses over the target', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <button id="target">
        Mouseenter me, captain!

        {{#attach-popover id='attachment' showOn='mouseenter'}}
          showOn mouseenter
        {{/attach-popover}}
      </button>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await triggerEvent('#target', 'mouseenter');

    assert.equal(isVisible(attachment), true, 'Now shown');
  });
});
