import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, clearRender, focus, render, find } from '@ember/test-helpers';

module('Integration | Component | ember attacher', function(hooks) {
  setupRenderingTest(hooks);

  test('it leaves no content', async function(assert) {
    await render(hbs`<div id='wrapper'><AttachPopover /></div>`);

    const wrapper = find('#wrapper');

    assert.equal(wrapper.textContent, '');
  });

  test('it renders', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div>
        {{#attach-popover id='attachment'}}
          floating text
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.dom('div[x-circle]', attachment).exists('div[x-circle] exists');

    assert.ok(attachment.innerHTML.includes('floating text'));
  });

  test('uses the user-supplied popover class over global config class', async function(assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      class: 'different-default'
    };

    await render(hbs`
      <div id="target">
        {{#attach-popover id='attachment' class='some-class some-other-class'}}
          tooltip text
        {{/attach-popover}}
      </div>
    `);

    const popover = find('#attachment > .some-class');

    assert.contains(
      popover.className.split(' '),
      [
        'ember-attacher-fill',
        'some-class',
        'some-other-class',
        'ember-attacher-hide',
        'ember-attacher-without-arrow'
      ],
      'it adds the user-supplied default classes'
    );
  });

  test('uses the user-supplied default popover class - separate config', async function(assert) {
    assert.expect(1);

    this.owner.resolveRegistration('config:environment').emberAttacher = {
      popover: {
        class: 'user-defined',
      }
    };

    await render(hbs`
      <div>
        {{#attach-popover id='attachment'}}
          floating text
        {{/attach-popover}}
      </div>
    `);

    const popover = find('#attachment > .user-defined');

    assert.contains(
      popover.className.split(' '),
      ['user-defined'],
      'it adds the user-supplied default classes'
    );
  });

  test('teleports the floating element to the default container', async function(assert) {
    await render(hbs`
      <div id="target">
        {{#attach-popover id='attachment'}}
          floating text
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');

    assert.ok(attachment, 'floating element exists');
    assert.strictEqual(
      attachment.parentElement,
      document.querySelector('.ember-application'),
      'appended to .ember-application rather than replacing it'
    );
    assert.dom('#target #attachment').doesNotExist('not left in the target when renderInPlace is false');
  });

  test('renderInPlace keeps the floating element inside the target', async function(assert) {
    await render(hbs`
      <div id="target">
        {{#attach-popover id='attachment' renderInPlace=true}}
          floating text
        {{/attach-popover}}
      </div>
    `);

    assert.dom('#target #attachment').exists('rendered in place as a descendant of the target');
    assert.notStrictEqual(
      find('#attachment').parentElement,
      document.querySelector('.ember-application'),
      'does not teleport to .ember-application'
    );
    assert.dom('#attachment').doesNotHaveAttribute('popover', 'renderInPlace omits popover="manual"');
  });

  test('promotes to Top-Layer popover="manual" host and updates isVisible() across initial positioning frame and exit animation completion', async function(assert) {
    this.set('isShown', false);

    await render(hbs`
      <div id="custom-container"></div>

      <button id="top-layer-trigger" type="button">
        Trigger
        <AttachPopover
          @id="top-layer-attachment"
          @isShown={{this.isShown}}
          @showOn="click"
          @hideOn="click"
          @hideDuration={{50}}
        >
          Top layer content
        </AttachPopover>
      </button>

      <button id="custom-container-trigger" type="button">
        Custom Container Trigger
        <AttachPopover
          @id="custom-container-attachment"
          @floatingElementContainer="#custom-container"
          @isShown={{true}}
        >
          Custom container content
        </AttachPopover>
      </button>
    `);

    const topLayerEl = find('#top-layer-attachment');
    const customContainerEl = find('#custom-container-attachment');

    assert.dom(topLayerEl).hasAttribute('popover', 'manual', 'default host gets popover="manual"');
    assert.false(topLayerEl.matches(':popover-open'), 'not :popover-open while hidden');
    assert.false(isVisible(topLayerEl), 'isVisible is false while hidden');

    assert.dom(customContainerEl).doesNotHaveAttribute(
      'popover',
      'custom @floatingElementContainer falls back to {{#in-element}} without popover="manual"'
    );
    assert.strictEqual(customContainerEl.parentElement, find('#custom-container'));
    assert.true(isVisible(customContainerEl), 'custom container attachment is visible when shown');

    // Open top-layer attachment
    await click('#top-layer-trigger');
    assert.true(topLayerEl.matches(':popover-open'), 'promoted to Top Layer (:popover-open) when shown');
    assert.strictEqual(topLayerEl.style.position, 'absolute', 'Floating UI strategy overrides [popover] UA position: fixed');
    assert.true(isVisible(topLayerEl), 'isVisible is true after positioning completes');

    const topLayerStyle = getComputedStyle(topLayerEl);
    assert.strictEqual(topLayerStyle.borderTopWidth, '0px', 'resets [popover] UA border');
    assert.strictEqual(topLayerStyle.paddingTop, '0px', 'resets [popover] UA padding');
    assert.strictEqual(topLayerStyle.marginTop, '0px', 'resets [popover] UA margin');
    assert.strictEqual(topLayerStyle.backgroundColor, 'rgba(0, 0, 0, 0)', 'resets [popover] UA background');
    assert.strictEqual(topLayerStyle.overflow, 'visible', 'resets [popover] UA overflow');

    // During initial positioning frame (visibility: hidden), isVisible() is false
    topLayerEl.style.visibility = 'hidden';
    assert.false(isVisible(topLayerEl), 'isVisible is false during initial positioning frame (visibility: hidden)');
    topLayerEl.style.visibility = '';
    assert.true(isVisible(topLayerEl), 'isVisible returns to true when visibility is restored');

    // If :popover-open is false on a [popover] element, isVisible() is false
    topLayerEl.hidePopover();
    assert.false(isVisible(topLayerEl), 'isVisible is false when [popover] is not :popover-open');
    topLayerEl.showPopover();
    assert.true(isVisible(topLayerEl), 'isVisible is true again when :popover-open');

    // Close and verify exit animation completion calls hidePopover() and sets display: none
    await click('#top-layer-trigger');

    assert.false(isVisible(topLayerEl), 'isVisible is false after exit animation');
    assert.false(topLayerEl.matches(':popover-open'), 'hidePopover() called on exit animation completion');
    assert.strictEqual(topLayerEl.style.display, 'none', 'display is none after exit animation completion');
  });

  test('falls back cleanly when showPopover throws or .ember-application is absent', async function(assert) {
    const appContainers = Array.from(document.querySelectorAll('.ember-application'));
    appContainers.forEach((el) => el.classList.remove('ember-application'));

    const originalShowPopover = HTMLElement.prototype.showPopover;
    HTMLElement.prototype.showPopover = function () {
      throw new DOMException('Top layer blocked', 'NotSupportedError');
    };

    try {
      await render(hbs`
        <button id="fallback-trigger" type="button">
          Fallback Trigger
          <AttachPopover @id="fallback-attachment" @showOn="click" @hideOn="click">
            Fallback body
          </AttachPopover>
        </button>
      `);

      const attachment = document.getElementById('fallback-attachment');
      assert.ok(attachment, 'floating element rendered into document.body');
      assert.strictEqual(
        attachment.parentElement,
        document.body,
        'falls back to document.body when .ember-application selector matches 0 nodes'
      );

      await click('#fallback-trigger');

      assert.false(
        attachment.hasAttribute('popover'),
        'drops [popover] attribute if showPopover() throws so portal fallback remains visible'
      );
      assert.true(isVisible(attachment), 'attachment remains visible after showPopover() error fallback');
    } finally {
      await clearRender();
      HTMLElement.prototype.showPopover = originalShowPopover;
      appContainers.forEach((el) => el.classList.add('ember-application'));
    }
  });

  test('interactive AttachPopover inside native dialog.showModal() is clickable, focusable, non-inert, and stacked above the modal', async function(assert) {
    let actionCount = 0;
    this.set('onInsideAction', () => {
      actionCount += 1;
    });

    await render(hbs`
      <dialog id="native-modal-dialog">
        <button id="modal-popover-trigger" type="button">
          Open Modal Popover
          <AttachPopover
            @id="modal-popover"
            @class="ember-attacher-popover"
            @showOn="click"
            @hideOn="clickout"
            @interactive={{true}}
            @animation="none"
          >
            <button id="modal-popover-action" type="button" {{on "click" this.onInsideAction}}>
              Inside Modal Action
            </button>
          </AttachPopover>
        </button>
      </dialog>
    `);

    const dialog = find('#native-modal-dialog');
    dialog.showModal();

    try {
      assert.true(dialog.matches(':modal'), 'dialog is open via showModal()');

      await click('#modal-popover-trigger');

      const attachment = find('#modal-popover');
      const actionBtn = find('#modal-popover-action');

      assert.strictEqual(
        attachment.parentElement,
        dialog,
        'attacher portals inside dialog:modal so native modal inertness does not block interaction'
      );
      assert.dom(attachment).hasAttribute('popover', 'manual');
      assert.true(attachment.matches(':popover-open'), 'popover is promoted to Top Layer above modal dialog');
      assert.true(isVisible(attachment), 'popover is visible inside modal dialog');

      // Real browser hit-test: center of the action button inside the popover receives pointer hits (not covered/inert)
      const rect = actionBtn.getBoundingClientRect();
      const hitEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      assert.strictEqual(hitEl, actionBtn, 'Top-Layer popover action button is the topmost hit-tested element above dialog');

      await focus('#modal-popover-action');
      assert.strictEqual(document.activeElement, actionBtn, 'interactive popover content can receive focus inside showModal()');

      await click('#modal-popover-action');
      assert.strictEqual(actionCount, 1, 'click handler inside Top-Layer popover fires inside showModal()');
      assert.true(isVisible(attachment), 'interactive popover stays open after internal click');
    } finally {
      if (dialog.open) {
        dialog.close();
      }
      await clearRender();
    }
  });
});
