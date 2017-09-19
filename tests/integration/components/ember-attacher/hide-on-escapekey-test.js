import hbs from 'htmlbars-inline-precompile';
import { find, keyEvent } from 'ember-native-dom-helpers';
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

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  // Press escape key (keyCode === 27)
  await keyEvent(document, 'keydown', 27);

  assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
});
