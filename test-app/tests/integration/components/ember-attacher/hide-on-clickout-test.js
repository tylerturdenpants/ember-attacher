import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, click, find, triggerEvent, waitUntil } from '@ember/test-helpers';

module('Integration | Component | hideOn "clickout"', function(hooks) {
  setupRenderingTest(hooks);

  test('hides when an element outside the target is clicked', async function(assert) {
    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me"/>

      <div id="parent">
        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    // Make sure the attachment is still shown when the target is clicked
    await click('#parent');

    assert.equal(isVisible(attachment), true, 'Still shown');

    await click('#focus-me');

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Now hidden');
  });

  test('with interactive=false: hides when attachment is clicked', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div id="parent">
        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await click(attachment);

    assert.equal(isVisible(attachment), false, 'Now hidden');
  });

  test("with interactive=true: doesn't hide when attachment is clicked", async function(assert) {
    assert.expect(4);

    await render(hbs`
      <input type="text" id="focus-me"/>

      <div id="parent">
        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          interactive=true
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    // Make sure attachment stays shown when attachment clicked
    await click(attachment);

    assert.equal(isVisible(attachment), true, 'Still shown');

    // Make sure attachment stays shown when target clicked
    await click('#parent');

    assert.equal(isVisible(attachment), true, 'Still shown');

    // Make sure attachment is hidden once an element outside target or attachment is clicked
    await click('#focus-me');

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Now hidden');
  });

  test('hides when an element outside the target is touched on touch devices', async function(assert) {
    // using `ontouchstart` internally to identify if the current device is touchable
    window.ontouchstart = () => {};

    assert.expect(3);

    await render(hbs`
      <input type="text" id="focus-me"/>

      <div id="parent">
        {{#attach-popover id='attachment'
                          hideOn='clickout'
                          isShown=true}}
          hideOn click
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    // Make sure the attachment is still shown when the target is tapped
    await triggerEvent('#parent', 'touchend');

    assert.equal(isVisible(attachment), true, 'Still shown');

    await triggerEvent('#focus-me', 'touchend');

    await waitUntil(() => isVisible(attachment) === false);

    assert.equal(isVisible(attachment), false, 'Now hidden');

    delete window.ontouchstart;
  });

  test("with interactive=true: doesn't hide when clicking an element inside the attachment that is removed on click", async function(assert) {
    this.set('showButton', true);
    this.set('onButtonClick', () => {
      this.set('showButton', false);
    });

    await render(hbs`
      <div id="parent">
        <AttachPopover
          @id="attachment"
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
      </div>
    `);

    const attachment = find('#attachment');
    assert.true(isVisible(attachment), 'Initially shown');

    // Click the button, which unmounts itself during the click action
    await click('#detaching-btn');

    assert.dom('#detaching-btn').doesNotExist('Button was removed from the DOM');
    assert.dom('#replacement-text').exists('Replacement content is now rendered');
    assert.true(isVisible(attachment), 'Attachment remains visible even though clicked child detached');
  });

  test("doesn't hide when clicking an element inside the target that is removed on click", async function(assert) {
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

        <AttachPopover
          @id="attachment"
          @hideOn="clickout"
          @interactive={{true}}
          @isShown={{true}}
          @animation="none"
        >
          Popover content
        </AttachPopover>
      </div>
    `);

    const attachment = find('#attachment');
    assert.true(isVisible(attachment), 'Initially shown');

    await click('#detaching-target-btn');

    assert.dom('#detaching-target-btn').doesNotExist('Target button was removed from the DOM');
    assert.true(isVisible(attachment), 'Attachment remains visible even though clicked target child detached');
  });

  test('falls back cleanly to contains() when composedPath is unavailable', async function(assert) {
    await render(hbs`
      <div id="parent">
        <AttachPopover
          @id="attachment"
          @hideOn="clickout"
          @interactive={{true}}
          @isShown={{true}}
          @animation="none"
        >
          <div id="attachment-content">Content</div>
        </AttachPopover>
      </div>
    `);

    const attachment = find('#attachment');
    assert.true(isVisible(attachment), 'Initially shown');

    // Dispatch a synthetic event without composedPath
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'composedPath', { value: undefined });
    find('#attachment-content').dispatchEvent(event);

    assert.true(isVisible(attachment), 'Attachment stays visible when click is inside attachment');
  });
});
