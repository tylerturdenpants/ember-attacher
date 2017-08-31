import hbs from 'htmlbars-inline-precompile';
import { click, find } from 'ember-native-dom-helpers';
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

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  await click(find('#click-toggle'));

  assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
});
