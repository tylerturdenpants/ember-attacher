import { find, triggerEvent } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | showOn "focus"', {
  integration: true
});

test('shows when the target gains focus', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <button id="target">
      Focus me, captain!

      {{#attach-popover id='attachment' showOn='focus'}}
        showOn focus
      {{/attach-popover}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await triggerEvent('#target', 'focus');

  assert.equal(isVisible(attachment), true, 'Now shown');
});
