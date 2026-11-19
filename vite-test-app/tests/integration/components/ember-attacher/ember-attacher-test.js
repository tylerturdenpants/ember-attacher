import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, clearRender, focus, render, find, settled } from '@ember/test-helpers';

module('Integration | Component | ember attacher', function (hooks) {
  setupRenderingTest(hooks);

  test('it leaves no content', async function (assert) {
    await render(hbs`
      <div id="wrapper"><button id="empty-target" type="button"></button><AttachPopover @target="#empty-target" /></div>
    `);

    const wrapper = find('#wrapper');

    assert.strictEqual(wrapper.textContent, '');
  });

  test('it renders', async function (assert) {
    assert.expect(2);

    await render(hbs`
      <div id="render-target">Target</div>
      <AttachPopover @id="attachment" @target="#render-target" @lazyRender={{false}}>
        floating text
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.dom('.ember-attacher-fill-circle', attachment).exists('.ember-attacher-fill-circle exists');

    assert.ok(attachment.innerHTML.includes('floating text'));
  });

  test('uses the user-supplied popover class over global config class', async function (assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      class: 'different-default',
    };

    await render(hbs`
      <div id="target">Target</div>
      <AttachPopover @id="attachment" @target="#target" @lazyRender={{false}} @class="some-class some-other-class">
        tooltip text
      </AttachPopover>
    `);

    const popover = find('#attachment > .some-class');

    assert.contains(
      popover.className.split(' '),
      [
        'ember-attacher-fill',
        'some-class',
        'some-other-class',
        'ember-attacher-without-arrow',
      ],
      'it adds the user-supplied default classes'
    );
  });

  test('uses the user-supplied default popover class - separate config', async function (assert) {
    assert.expect(1);

    this.owner.resolveRegistration('config:environment').emberAttacher = {
      popover: {
        class: 'user-defined',
      },
    };

    await render(hbs`
      <div id="separate-target">Target</div>
      <AttachPopover @id="attachment" @target="#separate-target" @lazyRender={{false}}>
        floating text
      </AttachPopover>
    `);

    const popover = find('#attachment > .user-defined');

    assert.contains(
      popover.className.split(' '),
      ['user-defined'],
      'it adds the user-supplied default classes'
    );
  });

  test('renders the floating element in place with popover="manual" in a single pass', async function (assert) {
    await render(hbs`
      <div id="target">
        Target
        <AttachPopover @id="attachment" @target="#target">
          floating text
        </AttachPopover>
      </div>
    `);

    const attachment = find('#attachment');

    assert.ok(attachment, 'floating element exists');
    assert.dom('#target #attachment').exists('rendered in place without {{#in-element}} portaling');
    assert.dom('#attachment').hasAttribute('popover', 'manual', 'uses Top-Layer popover="manual"');
  });

  test('renderInPlace keeps the floating element inside the target', async function (assert) {
    await render(hbs`
      <div id="target">
        <AttachPopover @id="attachment" @target="#target" @renderInPlace={{true}}>
          floating text
        </AttachPopover>
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

  test('promotes to Top-Layer popover="manual" host and updates isVisible() across initial positioning frame and exit animation completion', async function (assert) {
    this.set('isShown', false);

    await render(hbs`
      <button id="top-layer-trigger" type="button">
        Trigger
      </button>
      <AttachPopover
        @id="top-layer-attachment"
        @target="#top-layer-trigger"
        @isShown={{this.isShown}}
        @showOn="click"
        @hideOn="click"
        @hideDuration={{50}}
      >
        Top layer content
      </AttachPopover>
    `);

    const topLayerEl = find('#top-layer-attachment');

    assert.dom(topLayerEl).hasAttribute('popover', 'manual', 'default host gets popover="manual"');
    assert.false(topLayerEl.matches(':popover-open'), 'not :popover-open while hidden');
    assert.false(isVisible(topLayerEl), 'isVisible is false while hidden');

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

    // Close and verify exit transition does not intercept pointer events and waits before hidePopover()
    find('#top-layer-trigger').click();

    assert.true(topLayerEl.hasAttribute('data-closing'), 'sets data-closing immediately on exit');
    assert.true(topLayerEl.matches(':popover-open'), 'stays in Top Layer while exit animation runs');
    assert.strictEqual(
      getComputedStyle(topLayerEl).pointerEvents,
      'none',
      'closing overlay disables pointer-events so clicks pass through'
    );
    const closingRect = topLayerEl.getBoundingClientRect();
    const hitDuringClose = document.elementFromPoint(
      closingRect.left + closingRect.width / 2,
      closingRect.top + closingRect.height / 2
    );
    assert.false(
      topLayerEl.contains(hitDuringClose),
      'hit-test passes through closing overlay'
    );

    await settled();

    assert.false(isVisible(topLayerEl), 'isVisible is false after exit animation');
    assert.false(topLayerEl.matches(':popover-open'), 'hidePopover() called on exit animation completion');
    assert.false(topLayerEl.hasAttribute('data-closing'), 'data-closing removed after exit completes');
    assert.strictEqual(getComputedStyle(topLayerEl).display, 'none', 'display is none after exit animation completion');

    // Empty getAnimations() falls back to hideDuration timer instead of instant-hiding
    await click('#top-layer-trigger');
    assert.true(isVisible(topLayerEl), 're-opened for empty-WAAPI fallback check');

    const originalGetAnimations = topLayerEl.getAnimations;
    topLayerEl.getAnimations = () => [];
    try {
      find('#top-layer-trigger').click();
      assert.true(
        topLayerEl.hasAttribute('data-closing') && topLayerEl.matches(':popover-open'),
        'empty getAnimations() falls back to hideDuration timer instead of instant hide'
      );
      await settled();
      assert.false(isVisible(topLayerEl), 'fallback timer finishes hide cleanly');
      assert.false(topLayerEl.matches(':popover-open'), 'hidePopover() called after fallback timer');
    } finally {
      topLayerEl.getAnimations = originalGetAnimations;
    }
  });

  test('degrades cleanly without native Popover API support (e.g. Safari < 17): in-place [data-open] host with timer-based exit', async function (assert) {
    const proto = HTMLElement.prototype;
    const original = Object.getOwnPropertyDescriptor(proto, 'showPopover');
    const originalHide = Object.getOwnPropertyDescriptor(proto, 'hidePopover');
    delete proto.showPopover;
    delete proto.hidePopover;

    try {
      await render(hbs`
        <div id="clip" style="overflow: hidden;">
          <button id="legacy-trigger" type="button">Trigger</button>
          <AttachPopover
            @id="legacy-attachment"
            @target="#legacy-trigger"
            @showOn="click"
            @hideOn="click"
            @showDuration={{0}}
            @hideDuration={{60}}
          >
            Legacy body
          </AttachPopover>
        </div>
      `);

      const el = find('#legacy-attachment');
      assert.false(el.hasAttribute('popover'), 'no [popover] attribute without native support');
      assert.strictEqual(el.parentElement.id, 'clip', 'host renders in place (no Top Layer)');
      assert.strictEqual(getComputedStyle(el).display, 'none', 'hidden by default');

      await click('#legacy-trigger');
      assert.true(el.hasAttribute('data-open'), '[data-open] drives visibility');
      assert.strictEqual(getComputedStyle(el).display, 'block', 'displayed via [data-open]');
      assert.strictEqual(getComputedStyle(el).opacity, '1', 'fully opaque when open');
      assert.true(isVisible(el), 'isVisible works without :popover-open');

      find('#legacy-trigger').click();
      assert.true(el.hasAttribute('data-closing'), 'data-closing set on exit');
      assert.strictEqual(getComputedStyle(el).display, 'block', 'stays displayed during exit window');
      assert.strictEqual(getComputedStyle(el).pointerEvents, 'none', 'closing host does not steal clicks');
      await settled();
      assert.false(el.hasAttribute('data-closing'), 'data-closing removed after exit');
      assert.false(el.hasAttribute('data-open'), 'data-open removed after exit');
      assert.strictEqual(getComputedStyle(el).display, 'none', 'hidden again after exit');
      assert.false(isVisible(el), 'isVisible false after exit');
    } finally {
      if (original) Object.defineProperty(proto, 'showPopover', original);
      if (originalHide) Object.defineProperty(proto, 'hidePopover', originalHide);
    }
  });

  test('falls back cleanly when showPopover throws', async function (assert) {
    const originalShowPopover = HTMLElement.prototype.showPopover;
    HTMLElement.prototype.showPopover = function () {
      throw new DOMException('Top layer blocked', 'NotSupportedError');
    };

    try {
      await render(hbs`
        <button id="fallback-trigger" type="button">
          Fallback Trigger
        </button>
        <AttachPopover @id="fallback-attachment" @target="#fallback-trigger" @showOn="click" @hideOn="click">
          Fallback body
        </AttachPopover>
      `);

      const attachment = document.getElementById('fallback-attachment');
      assert.ok(attachment, 'floating element rendered in place');

      await click('#fallback-trigger');

      assert.false(
        attachment.hasAttribute('popover'),
        'drops [popover] attribute if showPopover() throws so in-place fallback remains visible'
      );
      assert.true(isVisible(attachment), 'attachment remains visible after showPopover() error fallback');
    } finally {
      await clearRender();
      HTMLElement.prototype.showPopover = originalShowPopover;
    }
  });

  test('interactive AttachPopover inside native dialog.showModal() is clickable, focusable, non-inert, and stacked above the modal', async function (assert) {
    let actionCount = 0;
    this.set('onInsideAction', () => {
      actionCount += 1;
    });

    await render(hbs`
      <dialog id="native-modal-dialog">
        <button id="modal-popover-trigger" type="button">
          Open Modal Popover
        </button>
        <AttachPopover
          @id="modal-popover"
          @target="#modal-popover-trigger"
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
