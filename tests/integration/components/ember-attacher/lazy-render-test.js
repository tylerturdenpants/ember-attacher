import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, click } from '@ember/test-helpers';

module('Integration | Component | lazyRender', function(hooks) {
  setupRenderingTest(hooks);

  test('will lazily render the yield block when lazyRender is passed as true', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <button id="toggle-show">
        Click me, captain!

        {{#attach-popover id='attachment' lazyRender=true}}
          <div id='should-not-be-present-until-clicked'></div>
        {{/attach-popover}}
      </button>
    `);

    assert.dom('#should-not-be-present-until-clicked').doesNotExist('Has not initially rendered the yield block.');

    await click('#toggle-show');

    assert.dom('#should-not-be-present-until-clicked').exists('Has rendered the yield block.');
  });

  test('lazily render will default to false which will eager render the yeild block', async function(assert) {
    assert.expect(1);

    await render(hbs`
      <button id="toggle-show">
        Click me, captain!

        {{#attach-popover id='attachment'}}
          <div id='should-not-be-present-until-clicked'></div>
        {{/attach-popover}}
      </button>
    `);

    assert.dom('#should-not-be-present-until-clicked').exists('Has initially rendered the yield block.');
  });
});
