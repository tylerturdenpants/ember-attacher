import hbs from 'htmlbars-inline-precompile';
import { click, focus } from 'ember-native-dom-helpers';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "blur"', {
  integration: true
});

test('hides when the target loses focus', async function(assert) {
  assert.expect(3);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher id='attachment'
                        hideOn='blur'
                        showOn='click'}}
        hideOn click
      {{/ember-attacher}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await click('#click-toggle');

  assert.equal(isVisible(attachment), true, 'Now shown');

  await focus('#focus-me');

  assert.equal(isVisible(attachment), false, 'Hidden again');
});

test('with interactive=false: hides when the attachment gains focus', async function(assert) {
  assert.expect(3);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher id='attachment'
                        hideOn='blur'
                        showOn='click'}}
        <input type="text" id="attachment-focus-me"/>
      {{/ember-attacher}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await click('#click-toggle');

  assert.equal(isVisible(attachment), true, 'Now shown');

  await focus('#attachment-focus-me');

  assert.equal(isVisible(attachment), false, 'Hidden again');
});

test("with interactive=true: doesn't hide when attachment gains focus", async function(assert) {
  assert.expect(4);

  this.render(hbs`
    <input type="text" id="outer-focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher id='attachment'
                        hideOn='blur'
                        interactive=true
                        showOn='click'}}
        <input type="text" id="attachment-focus-me"/>
      {{/ember-attacher}}
    </button>
  `);

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), false, 'Initially hidden');

  await click('#click-toggle');

  assert.equal(isVisible(attachment), true, 'Now shown');

  await focus('#attachment-focus-me');

  assert.equal(isVisible(attachment), true, 'Still shown');

  await focus('#click-toggle');

  await focus('#outer-focus-me');

  assert.equal(isVisible(attachment), false, 'Hidden again');
});
