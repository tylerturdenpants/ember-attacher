import hbs from 'htmlbars-inline-precompile';
import { find, keyEvent } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "escapekey"', {
  integration: true
});

test('hides when the escape key is pressed', function(assert) {
  assert.expect(2);

  this.render(hbs`
    <div>
      {{#ember-attacher class='hello'
                        hideOn='escapekey'
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  // Press escape key (keyCode === 27)
  return keyEvent(document, 'keydown', 27).then(() => {
    assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
  });
});
