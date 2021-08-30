import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, click, find, settled } from '@ember/test-helpers';

module('Integration | Component | onChange', function(hooks) {
  setupRenderingTest(hooks);

  test('fires the onChange hook when visibility is toggled', async function(assert) {
    assert.expect(5);

    this.set('isShown', true);

    await render(hbs`
      <button id="click-toggle">
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn='click'
                          isShown=this.isShown
                          onChange=(action (mut this.isShown))
                          showOn='click'}}
          showOn click
        {{/attach-popover}}
      </button>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await click('#click-toggle');

    await settled();

    assert.equal(isVisible(attachment), false, 'Now hidden');
    assert.equal(this.isShown, false);

    // Show again by toggling isShown
    this.set('isShown', true);

    await settled();

    assert.equal(isVisible(attachment), true, 'Shown again');

    // Make sure isShown is still true
    assert.equal(this.isShown, true);
  });
});
