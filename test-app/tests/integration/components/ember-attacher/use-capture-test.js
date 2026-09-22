import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';

module('Integration | Component | useCapture "true"', function(hooks) {
  setupRenderingTest(hooks);

  test('hides a popover when the clicked element does not bubble the click event', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div id="click-out-target" {{on 'click' (fn (mut this.unusedVar) bubbles=false)}}>
      </div>

      <button>
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          isShown=true
                          useCapture=true}}
          hideOn clickout
        {{/attach-popover}}
      </button>
    `);

    assert.equal(isVisible('#attachment'), true, 'Initially shown');

    await click('#click-out-target');

    assert.equal(isVisible('#attachment'), false, 'Now hidden');
  });
});
