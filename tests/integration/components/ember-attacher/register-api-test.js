import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, settled } from '@ember/test-helpers';

module('Integration | Component | registerAPI', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    this.actions = {};
    this.send = (actionName, ...args) => this.actions[actionName].apply(this, args);
  });

  hooks.beforeEach(function() {
    this.set('foundTarget', null);
    this.set('show', false);
  });

  test('registerAPI returns the target', async function(assert) {
    assert.expect(1);

    this.actions.registerAPI = ({ popperTarget }) => {
      const expectedTarget = document.getElementById('parent');
      assert.equal(popperTarget, expectedTarget);
    };

    await render(hbs`
      <div id='parent'>
        {{#if this.show}}
          {{#attach-popover id='attachment' registerAPI=(action 'registerAPI')}}
            template block text
          {{/attach-popover}}
        {{/if}}
      </div>
    `);

    this.set('show', true);

    return settled();
  });

  test('when the popper changes the API is reregistered', async function(assert) {
    assert.expect(1);

    this.actions.registerAPI = () => assert.ok('register API called');

    this.set('eventsEnabled', true);

    await render(hbs`
      <div class='parent'>
        {{#attach-popover class='popper-element'
                          eventsEnabled=eventsEnabled
                          registerAPI=(action 'registerAPI')}}
          template block text
        {{/attach-popover}}
      </div>
    `);

    this.set('eventsEnabled', false);
  });
});
