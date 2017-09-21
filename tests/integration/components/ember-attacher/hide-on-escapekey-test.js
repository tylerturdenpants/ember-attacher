import hbs from 'htmlbars-inline-precompile';
import { find, keyEvent } from 'ember-native-dom-helpers';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "escapekey"', {
  integration: true
});

test('hides when the escape key is pressed', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <div>
      {{#ember-attacher id='attachment'
                        hideOn='escapekey'
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </div>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), true, 'Initially shown');

  // Press escape key (keyCode === 27)
  await keyEvent(document, 'keydown', 27);

  assert.equal(isVisible(attachment), false, 'Now hidden');
});
