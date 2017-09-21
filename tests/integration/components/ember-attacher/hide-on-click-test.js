import hbs from 'htmlbars-inline-precompile';
import { click } from 'ember-native-dom-helpers';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "click"', {
  integration: true
});

test('hides when the target is clicked', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher id='attachment'
                        hideOn='click'
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </button>
  `);

  assert.equal(isVisible('#attachment'), true, 'Initially shown');

  await click('#click-toggle');

  assert.equal(isVisible('#attachment'), false, 'Now hidden');
});
