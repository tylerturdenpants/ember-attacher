import hbs from 'htmlbars-inline-precompile';
import { find, triggerEvent } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | showOn "mouseenter"', {
  integration: true
});

test('shows when the user mouses over the target', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <button id="target">
      Mouseenter me, captain!

      {{#ember-attacher id='attachment' showOn='mouseenter'}}
        showOn mouseenter
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  await triggerEvent('#target', 'mouseenter');

  assert.equal(innerAttacher.style.display, '', 'Now shown');
});
