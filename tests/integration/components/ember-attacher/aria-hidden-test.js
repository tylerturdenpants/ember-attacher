import { click, find, render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

module('Integration | Component | aria-hidden', function(hooks) {
  setupRenderingTest(hooks);

  test('aria-hidden updates when shown/hidden', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <button id="click-toggle">
        Click me, captain!

        {{#attach-popover id='attachment' hideOn='click' showOn='click'}}
          showOn/hideOn click updates aria-hidden
        {{/attach-popover}}
      </button>
    `);

    await click('#click-toggle');

    assert.equal(find('#attachment').getAttribute('aria-hidden'),
                 'false',
                 'When shown, aria-hidden="false"');

    await click('#click-toggle');

    assert.equal(find('#attachment').getAttribute('aria-hidden'),
                 'true',
                 'When hidden aria-hidden="true"');
  });
});
