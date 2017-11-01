import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('attach-popover', 'Integration | Component | attach popover', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{attach-popover}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#attach-popover}}
      template block text
    {{/attach-popover}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
