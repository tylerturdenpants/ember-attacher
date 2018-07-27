import { click, find, triggerEvent } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | showOn', {
  integration: true
});

test('uses the defaults when passed `undefined`', async function(assert) {
  assert.expect(4);

  this.set('showOn', undefined);

  this.render(hbs`
    <button id="target">
      {{#attach-popover id='attachment' hideOn='click' showOn=showOn}}
        showOn mouseenter
      {{/attach-popover}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await triggerEvent('#target', 'mouseenter');

  assert.equal(isVisible(attachment), true, 'Now shown');

  await click('#target');

  assert.equal(isVisible(attachment), false, 'Hidden again');

  await triggerEvent('#target', 'focus');

  assert.equal(isVisible(attachment), true, 'Shown again');
});

test('sets showOn to an empty array when passed `null`', async function(assert) {
  assert.expect(3);

  this.set('showOn', null);

  this.render(hbs`
      <button id="target">
        {{#attach-popover id='attachment' hideOn='click' showOn=showOn}}
          showOn mouseenter
        {{/attach-popover}}
      </button>
    `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await triggerEvent('#target', 'mouseenter');

  assert.equal(isVisible(attachment), false, 'Still hidden after mouseenter');

  await triggerEvent('#target', 'focus');

  assert.equal(isVisible(attachment), false, 'Still hidden after focus');
});

test("sets showOn to an empty array when passed `''` (empty string)", async function(assert) {
  assert.expect(3);

  this.set('showOn', '');

  this.render(hbs`
      <button id="target">
        {{#attach-popover id='attachment' hideOn='click' showOn=showOn}}
          showOn mouseenter
        {{/attach-popover}}
      </button>
    `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await triggerEvent('#target', 'mouseenter');

  assert.equal(isVisible(attachment), false, 'Still hidden after mouseenter');

  await triggerEvent('#target', 'focus');

  assert.equal(isVisible(attachment), false, 'Still hidden after focus');
});