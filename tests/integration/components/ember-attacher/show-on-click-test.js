import { click, find, render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

module('Integration | Component | showOn "click"', function(hooks) {
  setupRenderingTest(hooks);

  test('shows when the target is clicked', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <button id="click-toggle">
        Click me, captain!

        {{#attach-popover id='attachment' showOn='click'}}
          showOn click
        {{/attach-popover}}
      </button>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#click-toggle');

    assert.equal(isVisible(attachment), true, 'Now shown');
  });
});
