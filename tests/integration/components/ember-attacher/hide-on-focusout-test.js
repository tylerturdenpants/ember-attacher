import hbs from 'htmlbars-inline-precompile';
import { click, find, focus, waitUntil } from 'ember-native-dom-helpers';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "focusout"', {
  integration: true
});

test('hides when the target loses focus', async function(assert) {
  assert.expect(3);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#attach-popover id='attachment'
                        hideOn='focusout'
                        showOn='click'}}
        hideOn click
      {{/attach-popover}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await click('#click-toggle');

  assert.equal(isVisible(attachment), true, 'Now shown');

  await focus('#focus-me');

  await waitUntil(() => isVisible(attachment) === false);

  assert.equal(isVisible(attachment), false, 'hidden again');
});

test('with interactive=false: hides when the attachment gains focus', async function(assert) {
  assert.expect(3);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#attach-popover id='attachment'
                        hideOn='focusout'
                        showOn='click'}}
        <input type="text" id="attachment-focus-me"/>
      {{/attach-popover}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await click('#click-toggle');

  assert.equal(isVisible(attachment), true, 'Now shown');

  await focus('#attachment-focus-me');

  await waitUntil(() => isVisible(attachment) === false);

  assert.equal(isVisible(attachment), false, 'hidden again');
});

test("with interactive=true: doesn't hide when the attachment gains focus", async function(assert) {
  assert.expect(4);

  this.render(hbs`
    <input type="text" id="outer-focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#attach-popover id='attachment'
                        hideOn='focusout'
                        interactive=true
                        showOn='click'}}
        <input type="text" id="attachment-focus-me"/>
      {{/attach-popover}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await click('#click-toggle');

  assert.equal(isVisible(attachment), true, 'Now shown');

  await focus('#attachment-focus-me');

  assert.equal(isVisible(attachment), true, 'Still shown');

  await focus('#click-toggle');

  await waitUntil(() => isVisible(attachment));

  await focus('#outer-focus-me');

  await waitUntil(() => isVisible(attachment) === false);

  assert.equal(isVisible('#attachment'), false, 'Hidden again');
});
