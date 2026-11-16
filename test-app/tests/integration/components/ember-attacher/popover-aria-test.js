import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, focus, render, settled, triggerKeyEvent, waitUntil } from '@ember/test-helpers';
import { isVisible } from 'ember-attacher';

module('Integration | Component | popover ARIA (T7)', function(hooks) {
  setupRenderingTest(hooks);

  test('sets aria-expanded, aria-controls, and aria-haspopup on the target', async function(assert) {
    this.set('isShown', false);

    await render(hbs`
      <button id="popover-target" type="button">
        Target
        <AttachPopover
          @id="popover-attachment"
          @isShown={{this.isShown}}
          @showOn={{null}}
          @hideOn="escapekey"
          @hideDuration={{0}}
          @showDuration={{0}}
          @animation="none"
        >
          popover body
        </AttachPopover>
      </button>
    `);

    const target = find('#popover-target');

    assert.dom(target).hasAttribute('aria-haspopup', 'dialog');
    assert.dom(target).hasAttribute('aria-controls', 'popover-attachment');
    assert.dom(target).hasAttribute('aria-expanded', 'false');

    this.set('isShown', true);
    await waitUntil(() => isVisible(find('#popover-attachment')));

    assert.dom(target).hasAttribute('aria-expanded', 'true');

    this.set('isShown', false);
    await waitUntil(() => !isVisible(find('#popover-attachment')));

    assert.dom(target).hasAttribute('aria-expanded', 'false');
  });

  test('does not overwrite caller-provided ARIA attributes', async function(assert) {
    await render(hbs`
      <button
        id="custom-aria-target"
        type="button"
        aria-haspopup="menu"
        aria-controls="external-menu"
        aria-expanded="true"
      >
        Target
        <AttachPopover
          @id="custom-aria-popover"
          @isShown={{true}}
          @showOn={{null}}
          @hideOn={{null}}
          @hideDuration={{0}}
          @showDuration={{0}}
          @animation="none"
        >
          popover body
        </AttachPopover>
      </button>
    `);

    const target = find('#custom-aria-target');

    assert.dom(target).hasAttribute('aria-haspopup', 'menu');
    assert.dom(target).hasAttribute('aria-controls', 'external-menu');
    assert.dom(target).hasAttribute('aria-expanded', 'true');
  });

  test('Escape dismissal restores focus to the Target', async function(assert) {
    await render(hbs`
      <button id="focus-target" type="button">
        Target
        <AttachPopover
          @id="focus-popover"
          @isShown={{true}}
          @showOn={{null}}
          @hideOn="escapekey"
          @hideDuration={{0}}
          @showDuration={{0}}
          @animation="none"
          @interactive={{true}}
        >
          <button id="inside-focus" type="button">Inside</button>
        </AttachPopover>
      </button>
    `);

    const attachment = find('#focus-popover');
    const target = find('#focus-target');

    await waitUntil(() => isVisible(attachment));
    await focus('#inside-focus');
    assert.strictEqual(document.activeElement, find('#inside-focus'), 'focus starts inside popover');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => !isVisible(attachment));
    await settled();

    assert.strictEqual(
      document.activeElement,
      target,
      'Escape restores focus to the Target'
    );
  });
});
