import hbs from 'htmlbars-inline-precompile';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "click"', {
  integration: true
});

test('hides when the target is clicked', function(assert) {
  assert.expect(2);

  this.render(hbs`
    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher class='hello'
                        hideOn='click'
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  return click(find('#click-toggle')).then(() => {
    assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
  });
});
