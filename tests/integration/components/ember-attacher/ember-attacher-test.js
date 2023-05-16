import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find } from '@ember/test-helpers';

module('Integration | Component | ember attacher', function(hooks) {
  setupRenderingTest(hooks);

  test('it leaves no content', async function(assert) {
    await render(hbs`<div id='wrapper'><AttachPopover /></div>`);

    const wrapper = find('#wrapper');
    debugger;

    assert.equal(wrapper.textContent, '');
  });

  test('it renders', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div>
        {{#attach-popover id='attachment'}}
          floating text
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.dom('div[x-circle]', attachment).exists('div[x-circle] exists');

    assert.ok(attachment.innerHTML.includes('floating text'));
  });

  test('uses the user-supplied popover class over global config class', async function(assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      class: 'different-default'
    };

    await render(hbs`
      <div id="target">
        {{#attach-popover id='attachment' class='some-class some-other-class'}}
          tooltip text
        {{/attach-popover}}
      </div>
    `);

    const popover = find('#attachment > .some-class');

    assert.contains(
      popover.className.split(' '),
      [
        'ember-attacher-fill',
        'some-class',
        'some-other-class',
        'ember-attacher-hide',
        'ember-attacher-without-arrow'
      ],
      'it adds the user-supplied default classes'
    );
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
          floating text
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
