import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, find, render, triggerKeyEvent, waitUntil, waitFor } from '@ember/test-helpers';

module('Integration | Component | hideOn "escapekey"', function (hooks) {
  setupRenderingTest(hooks);

  test('hides when the escape key is pressed', async function (assert) {
    assert.expect(2);

    await render(hbs`
      <div id="target">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#target"
        @hideOn="escapekey"
        @isShown={{true}}
      >
        hideOn escapekey
      </AttachPopover>
    `);

    const attachment = await waitFor('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    // Press escape key (keyCode === 27)
    await triggerKeyEvent(document, 'keydown', 27);

    await waitUntil(() => isVisible(attachment) === false);

    assert.false(isVisible(attachment), 'Now hidden');
  });

  test('Escape dismisses nested Attachments LIFO (deepest child first, then parent)', async function (assert) {
    await render(hbs`
      <button id="parent-trigger" type="button">
        Parent
      </button>
      <AttachPopover
        @id="parent-escape-popover"
        @target="#parent-trigger"
        @isShown={{true}}
        @showOn="click"
        @hideOn="escapekey"
        @hideDuration={{0}}
        @interactive={{true}}
        @animation="none"
      >
        <button id="child-trigger" type="button">
          Child
        </button>
        <AttachPopover
          @id="child-escape-popover"
          @target="#child-trigger"
          @showOn="click"
          @hideOn="escapekey"
          @hideDuration={{0}}
          @interactive={{true}}
          @animation="none"
        >
          Nested child body
        </AttachPopover>
      </AttachPopover>
    `);

    const parentPopover = find('#parent-escape-popover');
    const childPopover = find('#child-escape-popover');

    assert.dom(parentPopover).hasAttribute('popover', 'manual', 'Parent uses Top-Layer host');
    assert.dom(childPopover).hasAttribute('popover', 'manual', 'Child uses Top-Layer host');
    assert.true(parentPopover.matches(':popover-open'), 'Parent starts :popover-open');
    assert.true(isVisible(parentPopover), 'Parent starts open');
    assert.false(isVisible(childPopover), 'Child starts closed');

    await click('#child-trigger');
    assert.true(childPopover.matches(':popover-open'), 'Child promotes to :popover-open');
    assert.true(isVisible(childPopover), 'Child opens on click');

    // First Escape closes only the deepest child
    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(childPopover) === false);

    assert.false(childPopover.matches(':popover-open'), 'First Escape removed child from Top Layer');
    assert.false(isVisible(childPopover), 'First Escape dismissed child');
    assert.true(parentPopover.matches(':popover-open'), 'Parent remains :popover-open after first Escape');
    assert.true(isVisible(parentPopover), 'Parent remains open after first Escape');

    // Second Escape closes the parent
    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(parentPopover) === false);

    assert.false(parentPopover.matches(':popover-open'), 'Second Escape removed parent from Top Layer');
    assert.false(isVisible(parentPopover), 'Second Escape dismissed parent');
  });

  test('Escape dismisses LIFO across mixed Top-Layer parent and in-place child', async function (assert) {
    await render(hbs`
      <button id="mixed-parent-trigger" type="button">
        Parent
      </button>
      <AttachPopover
        @id="mixed-parent-escape"
        @target="#mixed-parent-trigger"
        @isShown={{true}}
        @showOn="click"
        @hideOn="escapekey"
        @hideDuration={{0}}
        @interactive={{true}}
        @animation="none"
      >
        <button id="mixed-child-trigger" type="button">
          Child
        </button>
        <AttachPopover
          @id="mixed-child-escape"
          @target="#mixed-child-trigger"
          @renderInPlace={{true}}
          @showOn="click"
          @hideOn="escapekey"
          @hideDuration={{0}}
          @interactive={{true}}
          @animation="none"
        >
          In-place child body
        </AttachPopover>
      </AttachPopover>
    `);

    const parentPopover = find('#mixed-parent-escape');
    const childPopover = find('#mixed-child-escape');

    assert.dom(parentPopover).hasAttribute('popover', 'manual');
    assert.dom(childPopover).doesNotHaveAttribute('popover');

    await click('#mixed-child-trigger');
    assert.true(isVisible(parentPopover), 'Top-Layer parent open');
    assert.true(isVisible(childPopover), 'In-place child open');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(childPopover) === false);

    assert.false(isVisible(childPopover), 'First Escape closed in-place child');
    assert.true(isVisible(parentPopover), 'Top-Layer parent remains open after first Escape');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(parentPopover) === false);

    assert.false(isVisible(parentPopover), 'Second Escape closed Top-Layer parent');
  });
});
