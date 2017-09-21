import hbs from 'htmlbars-inline-precompile';
import { find, focus } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | showOn "focus"', {
  integration: true
});

test('shows when the target gains focus', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <button id="target">
      Focus me, captain!

      {{#ember-attacher id='attachment' showOn='focus'}}
        showOn focus
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  await focus('#target');

  assert.equal(innerAttacher.style.display, '', 'Now shown');
});
