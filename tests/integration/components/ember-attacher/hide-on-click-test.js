import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, click, settled } from '@ember/test-helpers';

module('Integration | Component | hideOn "click"', function(hooks) {
  setupRenderingTest(hooks);

  test('hides when the target is clicked', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <button id="click-toggle">
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn='click'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </button>
    `);

    assert.equal(isVisible('#attachment'), true, 'Initially shown');

    await click('#click-toggle');

    await settled();

    assert.equal(isVisible('#attachment'), false, 'Now hidden');
  });
});
