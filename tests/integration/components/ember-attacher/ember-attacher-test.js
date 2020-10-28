import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, find } from '@ember/test-helpers';

module('Integration | Component | ember attacher', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div>
        {{#attach-popover id='attachment'}}
          popper text
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.dom('div[x-circle]', attachment).exists('div[x-circle] exists');

    assert.ok(attachment.innerHTML.includes('popper text'));
  });

  test('uses the user-supplied default popover class - separate config', async function(assert) {
    assert.expect(1);

    this.owner.resolveRegistration('config:environment').emberAttacher = {
      popover: {
        class: 'user-defined',
      }
    };

    await render(hbs`
      <div>
        {{#attach-popover id='attachment'}}
          popper text
        {{/attach-popover}}
      </div>
    `);

    const popover = find('#attachment > .user-defined');

    assert.contains(
      popover.className.split(' '),
      ['user-defined'],
      'it adds the user-supplied default classes'
    );
  });
});
