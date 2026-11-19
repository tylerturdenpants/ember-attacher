import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, find, triggerEvent, waitUntil } from '@ember/test-helpers';

module('Integration | Component | hideOn "clickout"', function (hooks) {
  setupRenderingTest(hooks);

  test('hides when an element outside the target is clicked', async function (assert) {
    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me" />

      <div id="parent">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#parent"
        @hideOn="clickout"
        @isShown={{true}}
      >
        hideOn click
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    // Make sure the attachment is still shown when the target is clicked
    await click('#parent');

    assert.true(isVisible(attachment), 'Still shown');

    await click('#focus-me');

    await waitUntil(() => isVisible(attachment) === false);

    assert.false(isVisible(attachment), 'Now hidden');
  });

  test('with interactive=false: hides when attachment is clicked', async function (assert) {
    assert.expect(2);

    await render(hbs`
      <div id="parent">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#parent"
        @hideOn="clickout"
        @interactive={{false}}
        @isShown={{true}}
      >
        hideOn click
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    await click(attachment);

    assert.false(isVisible(attachment), 'Now hidden');
  });

  test("with interactive=true: doesn't hide when attachment is clicked", async function (assert) {
    assert.expect(4);

    await render(hbs`
      <input type="text" id="focus-me" />

      <div id="parent">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#parent"
        @hideOn="clickout"
        @interactive={{true}}
        @isShown={{true}}
      >
        hideOn click
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    // Make sure attachment stays shown when attachment clicked
    await click(attachment);

    assert.true(isVisible(attachment), 'Still shown');

    // Make sure attachment stays shown when target clicked
    await click('#parent');

    assert.true(isVisible(attachment), 'Still shown');

    // Make sure attachment is hidden once an element outside target or attachment is clicked
    await click('#focus-me');

    await waitUntil(() => isVisible(attachment) === false);

    assert.false(isVisible(attachment), 'Now hidden');
  });

  test('hides when an element outside the target is touched on touch devices', async function (assert) {
    // using `ontouchstart` internally to identify if the current device is touchable
    window.ontouchstart = () => {};

    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me" />

      <div id="parent">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#parent"
        @hideOn="clickout"
        @isShown={{true}}
      >
        hideOn click
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    // Make sure the attachment is still shown when the target is tapped
    await triggerEvent('#parent', 'touchend');

    assert.true(isVisible(attachment), 'Still shown');

    await triggerEvent('#focus-me', 'touchend');

    await waitUntil(() => isVisible(attachment) === false);

    assert.false(isVisible(attachment), 'Now hidden');

    delete window.ontouchstart;
  });

  test("with interactive=true: doesn't hide when clicking an element inside the attachment that is removed on click", async function (assert) {
    this.set('showButton', true);
    this.set('onButtonClick', () => {
      this.set('showButton', false);
    });

    await render(hbs`
      <div id="parent">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#parent"
        @hideOn="clickout"
        @interactive={{true}}
        @isShown={{true}}
        @animation="none"
      >
        {{#if this.showButton}}
          <button id="detaching-btn" type="button" {{on "click" this.onButtonClick}}>
            Click to disappear
          </button>
        {{else}}
          <span id="replacement-text">Replacement content</span>
        {{/if}}
      </AttachPopover>
    `);

    const attachment = find('#attachment');
    assert.true(isVisible(attachment), 'Initially shown');

    // Click the button, which unmounts itself during the click action
    await click('#detaching-btn');

    assert.dom('#detaching-btn').doesNotExist('Button was removed from the DOM');
    assert.dom('#replacement-text').exists('Replacement content is now rendered');
    assert.true(isVisible(attachment), 'Attachment remains visible even though clicked child detached');
  });

  test("doesn't hide when clicking an element inside the target that is removed on click", async function (assert) {
    this.set('showTargetButton', true);
    this.set('onTargetButtonClick', () => {
      this.set('showTargetButton', false);
    });

    await render(hbs`
      <div id="parent">
        {{#if this.showTargetButton}}
          <button id="detaching-target-btn" type="button" {{on "click" this.onTargetButtonClick}}>
            Target button
          </button>
        {{else}}
          <span id="target-replacement">Target replacement</span>
        {{/if}}
      </div>
      <AttachPopover
        @id="attachment"
        @target="#parent"
        @hideOn="clickout"
        @interactive={{true}}
        @isShown={{true}}
        @animation="none"
      >
        Popover content
      </AttachPopover>
    `);

    const attachment = find('#attachment');
    assert.true(isVisible(attachment), 'Initially shown');

    await click('#detaching-target-btn');

    assert.dom('#detaching-target-btn').doesNotExist('Target button was removed from the DOM');
    assert.true(isVisible(attachment), 'Attachment remains visible even though clicked target child detached');
  });

  test('falls back cleanly to contains() when composedPath is unavailable', async function (assert) {
    await render(hbs`
      <div id="parent">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#parent"
        @hideOn="clickout"
        @interactive={{true}}
        @isShown={{true}}
        @animation="none"
      >
        <div id="attachment-content">Content</div>
      </AttachPopover>
    `);

    const attachment = find('#attachment');
    assert.true(isVisible(attachment), 'Initially shown');

    // Dispatch a synthetic event without composedPath
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'composedPath', { value: undefined });
    find('#attachment-content').dispatchEvent(event);

    assert.true(isVisible(attachment), 'Attachment stays visible when click is inside attachment');
  });

  test('clicking inside a portaled child Attachment (including a detaching child node) does not trigger parent clickout', async function (assert) {
    this.set('showChildAction', true);
    this.set('removeChildAction', () => {
      this.set('showChildAction', false);
    });

    await render(hbs`
      <button id="outside" type="button">Outside</button>

      <button id="parent-trigger" type="button">
        Open Parent
      </button>
      <AttachPopover
        @id="parent-attachment"
        @target="#parent-trigger"
        @showOn="click"
        @hideOn="clickout"
        @hideDuration={{0}}
        @interactive={{true}}
        @isShown={{true}}
        @animation="none"
      >
        <button id="child-trigger" type="button">
          Open Child
        </button>
        <AttachPopover
          @id="child-attachment"
          @target="#child-trigger"
          @showOn="click"
          @hideOn="clickout"
          @hideDuration={{0}}
          @interactive={{true}}
          @animation="none"
        >
          <button id="child-inner-btn" type="button">Child inner button</button>
          {{#if this.showChildAction}}
            <button id="child-detaching-btn" type="button" {{on "click" this.removeChildAction}}>
              Detaching child action
            </button>
          {{/if}}
        </AttachPopover>
      </AttachPopover>
    `);

    const parentAttachment = find('#parent-attachment');
    const childAttachment = find('#child-attachment');

    assert.dom(parentAttachment).hasAttribute('popover', 'manual', 'Parent uses Top-Layer host');
    assert.dom(childAttachment).hasAttribute('popover', 'manual', 'Child uses Top-Layer host');
    assert.true(parentAttachment.matches(':popover-open'), 'Parent is :popover-open in Top Layer');
    assert.true(isVisible(parentAttachment), 'Parent attachment starts open');
    assert.false(isVisible(childAttachment), 'Child attachment starts closed');

    // Clicking the child trigger inside the parent opens the child and keeps the parent open
    await click('#child-trigger');
    assert.true(parentAttachment.matches(':popover-open'), 'Parent stays :popover-open when child opens');
    assert.true(childAttachment.matches(':popover-open'), 'Child promotes to :popover-open in Top Layer');
    assert.true(isVisible(parentAttachment), 'Parent stays open when child trigger is clicked');
    assert.true(isVisible(childAttachment), 'Child attachment opens');

    // Clicking inside the portaled child attachment keeps both child and parent open
    await click('#child-inner-btn');
    assert.true(isVisible(childAttachment), 'Child stays open when clicked inside');
    assert.true(isVisible(parentAttachment), 'Parent stays open when Top-Layer child is clicked (#90)');

    // Clicking a detaching button inside the Top-Layer child keeps both open
    await click('#child-detaching-btn');
    assert.dom('#child-detaching-btn').doesNotExist('Detaching button removed from child');
    assert.true(isVisible(childAttachment), 'Child stays open after detaching button click');
    assert.true(isVisible(parentAttachment), 'Parent stays open after detaching button click inside child');

    // Clicking inside parent (outside child) closes child but keeps parent open
    await click(parentAttachment);
    await waitUntil(() => isVisible(childAttachment) === false);
    assert.false(childAttachment.matches(':popover-open'), 'Child closes out of Top Layer');
    assert.false(isVisible(childAttachment), 'Child closes when clicking parent outside child');
    assert.true(isVisible(parentAttachment), 'Parent stays open when clicking inside parent');

    // Clicking outside both closes parent
    await click('#outside');
    await waitUntil(() => isVisible(parentAttachment) === false);
    assert.false(parentAttachment.matches(':popover-open'), 'Parent closes out of Top Layer');
    assert.false(isVisible(parentAttachment), 'Parent closes when clicking outside');
  });

  test('clicking inside an in-place child nested inside a Top-Layer parent does not trigger parent clickout', async function (assert) {
    await render(hbs`
      <button id="outside" type="button">Outside</button>

      <button id="tl-parent-trigger" type="button">
        Open Parent
      </button>
      <AttachPopover
        @id="tl-parent"
        @target="#tl-parent-trigger"
        @showOn="click"
        @hideOn="clickout"
        @hideDuration={{0}}
        @interactive={{true}}
        @isShown={{true}}
        @animation="none"
      >
        <button id="portal-child-trigger" type="button">
          Open In-Place Child
        </button>
        <AttachPopover
          @id="portal-child"
          @target="#portal-child-trigger"
          @renderInPlace={{true}}
          @showOn="click"
          @hideOn="clickout"
          @hideDuration={{0}}
          @interactive={{true}}
          @animation="none"
        >
          <button id="portal-child-btn" type="button">In-place child button</button>
        </AttachPopover>
      </AttachPopover>
    `);

    const parentEl = find('#tl-parent');
    const childEl = find('#portal-child');

    assert.dom(parentEl).hasAttribute('popover', 'manual', 'Parent uses Top Layer');
    assert.dom(childEl).doesNotHaveAttribute('popover', 'Child renders in place without popover="manual"');
    assert.true(parentEl.matches(':popover-open'), 'Parent is :popover-open');

    await click('#portal-child-trigger');
    assert.true(isVisible(parentEl), 'Top-Layer parent stays open when in-place child opens');
    assert.true(isVisible(childEl), 'In-place child opens');

    await click('#portal-child-btn');
    assert.true(isVisible(childEl), 'In-place child stays open when clicked');
    assert.true(isVisible(parentEl), 'Top-Layer parent stays open when in-place child is clicked');

    await click('#outside');
    await waitUntil(() => !isVisible(parentEl) && !isVisible(childEl));
    assert.false(isVisible(childEl), 'Child closes on outside click');
    assert.false(isVisible(parentEl), 'Parent closes on outside click');
  });
});
