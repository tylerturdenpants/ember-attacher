import hbs from 'htmlbars-inline-precompile';
import { find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | ember attacher', {
  integration: true
});

test('it renders', function(assert) {
  assert.expect(3);

  this.render(hbs`
    <div>
      {{#ember-attacher id='attachment'}}
        popper text
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.ok(innerAttacher, '.inner class exists');

  assert.ok(find('div[x-circle]', innerAttacher), 'div[x-circle] exists');

  const innerHTML = innerAttacher.innerHTML.trim();

  assert.equal(innerHTML.indexOf('popper text'), 0);
});
