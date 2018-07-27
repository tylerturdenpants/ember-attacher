import { click, find } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | aria-hidden', {
  integration: true
});

test('aria-hidden updates when shown/hidden', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <button id="click-toggle">
      Click me, captain!

      {{#attach-popover id='attachment' hideOn='click' showOn='click'}}
        showOn/hideOn click updates aria-hidden
      {{/attach-popover}}
    </button>
  `);

  await click('#click-toggle');

  assert.equal(find('#attachment').getAttribute('aria-hidden'),
               'false',
               'When shown, aria-hidden="false"');

  await click('#click-toggle');

  assert.equal(find('#attachment').getAttribute('aria-hidden'),
               'true',
               'When hidden aria-hidden="true"');
});
