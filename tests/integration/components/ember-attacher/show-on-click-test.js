import hbs from 'htmlbars-inline-precompile';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | showOn "click"', {
  integration: true
});

test('shows when the target is clicked', function(assert) {
  assert.expect(2);

  this.render(hbs`
    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher class='hello' showOn='click'}}
        showOn click
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  return click(find('#click-toggle')).then(() => {
    assert.equal(innerAttacher.style.display, '', 'Now shown');
  });
});
