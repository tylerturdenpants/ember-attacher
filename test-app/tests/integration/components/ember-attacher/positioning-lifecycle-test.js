import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, find, render, settled } from '@ember/test-helpers';
import { isVisible } from 'ember-attacher';

module('Integration | Component | positioning lifecycle resilience', function (hooks) {
  setupRenderingTest(hooks);

  test('does not throw or crash when unmounted while shown with autoUpdate', async function (assert) {
    this.set('shouldRender', true);

    await render(hbs`
      {{#if this.shouldRender}}
        <div id="target-container">
          <button id="trigger" type="button">Trigger</button>
          <AttachPopover
            @id="lifecycle-attachment"
            @isShown={{true}}
            @autoUpdate={{true}}
            @animation="none"
          >
            Floating content
          </AttachPopover>
        </div>
      {{/if}}
    `);

    const attachment = find('#lifecycle-attachment');
    assert.ok(attachment, 'Attachment rendered initially');
    assert.true(isVisible(attachment), 'Attachment is visible');

    // Simulate abrupt unmount during active autoUpdate (e.g. route transition or leaving room)
    this.set('shouldRender', false);
    await settled();

    assert.dom('#lifecycle-attachment').doesNotExist('Attachment cleanly unmounted without error');
  });

  test('stops autoUpdate when attachment hides', async function (assert) {
    this.set('isShown', true);

    await render(hbs`
      <div id="target-container">
        <button id="trigger" type="button">Trigger</button>
        <AttachPopover
          @id="lifecycle-attachment"
          @isShown={{this.isShown}}
          @autoUpdate={{true}}
          @animation="none"
        >
          Floating content
        </AttachPopover>
      </div>
    `);

    const attachment = find('#lifecycle-attachment');
    assert.true(isVisible(attachment), 'Attachment is visible');

    // Hide the attachment
    this.set('isShown', false);
    await settled();

    assert.false(isVisible(attachment), 'Attachment is hidden');

    // Trigger window resize while hidden - should not throw or cause positioning error
    window.dispatchEvent(new Event('resize'));
    await settled();

    assert.false(isVisible(attachment), 'Attachment remains safely hidden after resize');
  });

  test('handles rapid show and hide cycles without unhandled rejection', async function (assert) {
    this.set('isShown', false);

    await render(hbs`
      <div id="target-container">
        <button id="trigger" type="button">Trigger</button>
        <AttachPopover
          @id="rapid-attachment"
          @isShown={{this.isShown}}
          @autoUpdate={{true}}
          @animation="none"
        >
          Rapid content
        </AttachPopover>
      </div>
    `);

    const attachment = find('#rapid-attachment');
    assert.false(isVisible(attachment), 'Initially hidden');

    // Rapidly toggle visibility to stress test the async computePosition and autoUpdate lifecycles
    this.set('isShown', true);
    this.set('isShown', false);
    this.set('isShown', true);
    await settled();

    assert.true(isVisible(attachment), 'Successfully settled as visible without errors');

    this.set('isShown', false);
    await settled();

    assert.false(isVisible(attachment), 'Successfully settled as hidden');
  });
});

