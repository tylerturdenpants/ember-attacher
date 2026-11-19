import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, find, focus, waitUntil } from '@ember/test-helpers';

module('Integration | Component | hideOn "blur"', function (hooks) {
  setupRenderingTest(hooks);

  test('hides when the target loses focus', async function (assert) {
    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me" />

      <button id="click-toggle" type="button">
        Click me, captain!
      </button>
      <AttachPopover
        @id="attachment"
        @target="#click-toggle"
        @hideOn="blur"
        @showOn="click"
      >
        hideOn click
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#click-toggle');

    assert.true(isVisible(attachment), 'Now shown');

    await focus('#focus-me');

    await waitUntil(() => isVisible(attachment) === false);

    assert.false(isVisible(attachment), 'Hidden again');
  });

  test('with interactive=false: hides when the attachment gains focus', async function (assert) {
    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me" />

      <button id="click-toggle" type="button">
        Click me, captain!
      </button>
      <AttachPopover
        @id="attachment"
        @target="#click-toggle"
        @hideOn="blur"
        @interactive={{false}}
        @showOn="click"
      >
        <input type="text" id="attachment-focus-me" />
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#click-toggle');

    assert.true(isVisible(attachment), 'Now shown');

    await focus('#attachment-focus-me');

    await waitUntil(() => {
      if (!isVisible(attachment)) return true;

      focus('#attachment-focus-me');
    }, { timeout: 1000 });

    assert.false(isVisible(attachment), 'Hidden again');
  });

  test("with interactive=true: doesn't hide when attachment gains focus", async function (assert) {
    assert.expect(4);

    await render(hbs`
      <input type="text" id="outer-focus-me" />

      <button id="click-toggle" type="button">
        Click me, captain!
      </button>
      <AttachPopover
        @id="attachment"
        @target="#click-toggle"
        @hideOn="blur"
        @interactive={{true}}
        @showOn="click"
      >
        <input type="text" id="attachment-focus-me" />
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#click-toggle');

    assert.true(isVisible(attachment), 'Now shown');

    await focus('#attachment-focus-me');

    assert.true(isVisible(attachment), 'Still shown');

    await focus('#click-toggle');

    await waitUntil(() => isVisible(attachment));

    await focus('#outer-focus-me');

    await waitUntil(() => isVisible(attachment) === false);

    assert.false(isVisible(attachment), 'Hidden again');
  });
});
