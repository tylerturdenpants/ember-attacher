import hbs from 'htmlbars-inline-precompile';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | aria-hidden', {
  integration: true
});

test('aria-hidden updates when shown/hidden', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher id='attachment' hideOn='click' showOn='click'}}
        showOn/hideOn click updates aria-hidden
      {{/ember-attacher}}
    </button>
  `);

  await click('#click-toggle');

  assert.equal(find('#attachment > .inner').getAttribute('aria-hidden'), 'false', 'When shown, aria-hidden="false"');

  await click('#click-toggle');

  assert.equal(find('#attachment > .inner').getAttribute('aria-hidden'), 'true', 'When hidden aria-hidden="true"');
});
