import { find, triggerEvent } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | showOn "mouseenter"', {
  integration: true
});

test('shows when the user mouses over the target', async function(assert) {
  assert.expect(2);

  this.render(hbs`
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
