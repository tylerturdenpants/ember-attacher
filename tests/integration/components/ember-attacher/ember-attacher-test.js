import hbs from 'htmlbars-inline-precompile';
import { find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | ember attacher', {
  integration: true
});

test('it renders', function(assert) {
  assert.expect(2);

  this.render(hbs`
    <div>
      {{#attach-popover id='attachment'}}
        popper text
      {{/attach-popover}}
    </div>
  `);

  const attachment = find('#attachment');

  assert.ok(find('div[x-circle]', attachment), 'div[x-circle] exists');

  assert.ok(attachment.innerHTML.indexOf('popper text') !== -1);
});
