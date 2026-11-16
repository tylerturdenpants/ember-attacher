import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, find, render, triggerKeyEvent, waitUntil, waitFor } from '@ember/test-helpers';

module('Integration | Component | hideOn "escapekey"', function(hooks) {
  setupRenderingTest(hooks);

  test('hides when the escape key is pressed', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div>
        {{#attach-popover id='attachment'
                          hideOn='escapekey'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = await waitFor('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    // Press escape key (keyCode === 27)
    await triggerKeyEvent(document, 'keydown', 27);

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Now hidden');
  });

  test('T5 (#90): Escape dismisses nested Attachments LIFO (deepest child first, then parent)', async function(assert) {
    await render(hbs`
      <button id="parent-trigger" type="button">
        Parent
        <AttachPopover
          @id="parent-escape-popover"
          @isShown={{true}}
          @showOn="click"
          @hideOn="escapekey"
          @hideDuration={{0}}
          @interactive={{true}}
          @animation="none"
        >
          <button id="child-trigger" type="button">
            Child
            <AttachPopover
              @id="child-escape-popover"
              @showOn="click"
              @hideOn="escapekey"
              @hideDuration={{0}}
              @interactive={{true}}
              @animation="none"
            >
              Nested child body
            </AttachPopover>
          </button>
        </AttachPopover>
      </button>
    `);

    const parentPopover = find('#parent-escape-popover');
    const childPopover = find('#child-escape-popover');

    assert.true(isVisible(parentPopover), 'Parent starts open');
    assert.false(isVisible(childPopover), 'Child starts closed');

    await click('#child-trigger');
    assert.true(isVisible(childPopover), 'Child opens on click');

    // First Escape closes only the deepest child
    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(childPopover) === false);

    assert.false(isVisible(childPopover), 'First Escape dismissed child');
    assert.true(isVisible(parentPopover), 'Parent remains open after first Escape');

    // Second Escape closes the parent
    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(parentPopover) === false);

    assert.false(isVisible(parentPopover), 'Second Escape dismissed parent');
  });
});
