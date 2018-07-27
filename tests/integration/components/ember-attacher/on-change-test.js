import { click, find } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | onChange', {
  integration: true
});

test('fires the onChange hook when visibility is toggled', async function(assert) {
  assert.expect(5);

  this.set('isShown', true);

  this.render(hbs`
    <button id="click-toggle">
      Click me, captain!

      {{#attach-popover id='attachment'
                        hideOn='click'
                        isShown=isShown
                        onChange=(action (mut isShown))
                        showOn='click'}}
        showOn click
      {{/attach-popover}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), true, 'Initially shown');

  await click('#click-toggle');

  assert.equal(isVisible(attachment), false, 'Now hidden');
  assert.equal(this.get('isShown'), false);

  // Show again by toggling isShown
  this.set('isShown', true);

  assert.equal(isVisible(attachment), true, 'Shown again');

  // Make sure isShown is still true
  assert.equal(this.get('isShown'), true);
});
