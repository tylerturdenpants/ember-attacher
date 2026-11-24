import { hbs } from 'ember-cli-htmlbars';
import QUnit, { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { clearRender, click, find, focus, render, settled, triggerEvent, triggerKeyEvent, waitUntil } from '@ember/test-helpers';
import {
  arrow,
  hide,
  inline,
  isVisible,
  offset,
} from 'ember-attacher';
import { modifier } from 'ember-modifier';

module('Integration | Component | explicit target', function (hooks) {
  setupRenderingTest(hooks);

  test('it processes the explicit target change', async function (assert) {
    this.set('target', '#old-target');

    await render(hbs`
      <div>
        <button id="new-target" type="button">New</button>
        <button id="old-target" type="button">Old</button>
        <AttachTooltip @id="attachment" @target={{this.target}} @showOn="focus">
          Floating element
        </AttachTooltip>
      </div>
    `);

    assert.dom('#old-target').doesNotHaveAria('describedby', 'tooltip aria-describedby is open-only');
    await focus('#old-target');
    const attachment = find('#attachment');
    assert.true(isVisible(attachment), 'Is shown on focus');
    assert.dom('#old-target').hasAria('describedby', 'attachment');
    await focus('#new-target');
    assert.false(isVisible(attachment), 'Hides after focusing on another target');
    assert.dom('#old-target').doesNotHaveAria('describedby', 'removes aria-describedby on hide');
    this.set('target', find('#new-target'));
    await settled();
    await focus('#old-target');
    assert.false(isVisible(attachment), 'Not showing on old target focus');
    await focus('#new-target');
    assert.true(isVisible(attachment), 'Is shown on new target focus');
    assert.dom('#old-target').doesNotHaveAria('describedby');
    assert.dom('#new-target').hasAria('describedby', 'attachment');
  });

  test('resolves @target CSS selector strings', async function (assert) {
    await render(hbs`
      <div>
        <button id="selector-target" type="button">Selector target</button>
        <div id="mount">
          <AttachPopover
            @id="attachment"
            @target="#selector-target"
            @showOn="click"
            @hideOn="click"
          >
            Floating element
          </AttachPopover>
        </div>
      </div>
    `);

    const attachment = find('#attachment');
    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#selector-target');
    assert.true(isVisible(attachment), 'Shown when selector target is clicked');

    await click('#selector-target');
    assert.false(isVisible(attachment), 'Hidden when selector target is clicked again');
  });

  test('positions against a Floating UI virtual reference', async function (assert) {
    this.set('virtualTarget', {
      getBoundingClientRect() {
        return {
          x: 40,
          y: 80,
          top: 80,
          left: 40,
          bottom: 100,
          right: 120,
          width: 80,
          height: 20,
        };
      },
    });

    await render(hbs`
      <div id="mount">
        <AttachPopover
          @id="attachment"
          @target={{this.virtualTarget}}
          @isShown={{true}}
          @showOn={{null}}
          @hideOn={{null}}
          @placement="bottom"
        >
          Virtual target attachment
        </AttachPopover>
      </div>
    `);

    const attachment = find('#attachment');
    assert.ok(attachment, 'Floating element rendered for virtual target');
    assert.true(isVisible(attachment), 'Shown via @isShown with virtual target');
    assert.dom('#attachment').hasAttribute('x-placement', 'bottom');
  });

  test('yielded setTarget registers an external Element target', async function (assert) {
    this.set(
      'registerExternalTarget',
      modifier((_element, [setTarget]) => {
        setTarget(document.getElementById('external-target'));
      })
    );

    await render(hbs`
      <div>
        <button id="external-target" type="button">External</button>
        <div id="mount">
          <AttachPopover
            @id="attachment"
            @showOn="click"
            @hideOn="click"
            @lazyRender={{false}}
            as |attacher|
          >
            <span {{this.registerExternalTarget attacher.setTarget}}></span>
            Floating element
          </AttachPopover>
        </div>
      </div>
    `);

    const attachment = find('#attachment');
    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#mount');
    assert.false(isVisible(attachment), 'Parent mount click does not show');

    await click('#external-target');
    assert.true(isVisible(attachment), 'Shown when setTarget element is clicked');
  });

  test('yielded target modifier exists on first render and retargets', async function (assert) {
    let sawTargetOnFirstYield = false;

    this.set(
      'captureTarget',
      modifier((_element, [target]) => {
        sawTargetOnFirstYield = typeof target === 'function' || typeof target === 'object';
      })
    );

    await render(hbs`
      <div id="wrapper">
        <AttachPopover
          @id="attachment"
          @showOn="click"
          @hideOn="click"
          @lazyRender={{false}}
          as |attacher|
        >
          <span {{this.captureTarget attacher.target}}></span>
          <button id="yielded-ref" {{attacher.target}} type="button">Inner target</button>
          Floating element
        </AttachPopover>
      </div>
    `);

    assert.ok(sawTargetOnFirstYield, 'target modifier is defined on first yield');

    const attachment = find('#attachment');
    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#wrapper');
    assert.false(isVisible(attachment), 'Wrapper (parent) click does not show after retarget');

    await click('#yielded-ref');
    assert.true(isVisible(attachment), 'Shown when yielded target element is clicked');
  });

  test('virtual reference with contextElement receives show events', async function (assert) {
    this.set('virtualTarget', {
      contextElement: null,
      getBoundingClientRect() {
        const el = this.contextElement;
        return el
          ? el.getBoundingClientRect()
          : { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
      },
    });

    await render(hbs`
      <div>
        <button id="context-target" type="button">Context</button>
        <div id="mount">
          <AttachPopover
            @id="attachment"
            @target={{this.virtualTarget}}
            @showOn="click"
            @hideOn="click"
          >
            Context virtual attachment
          </AttachPopover>
        </div>
      </div>
    `);

    this.virtualTarget.contextElement = find('#context-target');
    this.set('virtualTarget', { ...this.virtualTarget });
    await settled();

    const attachment = find('#attachment');
    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#context-target');
    assert.true(isVisible(attachment), 'Shown via virtual contextElement click');
  });

  test('AttachTooltip handles virtual reference without throwing', async function (assert) {
    this.set('virtualTarget', {
      getBoundingClientRect() {
        return {
          x: 10,
          y: 20,
          top: 20,
          left: 10,
          bottom: 40,
          right: 60,
          width: 50,
          height: 20,
        };
      },
    });

    await render(hbs`
      <div id="mount">
        <AttachTooltip
          @id="attachment"
          @target={{this.virtualTarget}}
          @isShown={{true}}
          @showOn={{null}}
          @hideOn={{null}}
        >
          Virtual tooltip
        </AttachTooltip>
      </div>
    `);

    const attachment = find('#attachment');
    assert.ok(attachment, 'Tooltip rendered for virtual target');
    assert.true(isVisible(attachment), 'Tooltip visible for virtual target');
  });

  test('coordinate-only VirtualElement without contextElement dismisses on document clickout and escapekey, and supports inline() getClientRects', async function (assert) {
    let clientRectsCalled = 0;
    const rect = {
      x: 50,
      y: 60,
      top: 60,
      left: 50,
      bottom: 80,
      right: 110,
      width: 60,
      height: 20,
    };

    this.set('virtualTarget', {
      getBoundingClientRect() {
        return rect;
      },
      getClientRects() {
        clientRectsCalled += 1;
        return [rect];
      },
    });
    this.set('middleware', [inline({ x: 55, y: 65 }), offset(4)]);

    await render(hbs`
      <button id="outside-btn" type="button">Outside</button>
      <div id="mount">
        <AttachPopover
          @id="virtual-popover"
          @target={{this.virtualTarget}}
          @isShown={{true}}
          @showOn={{null}}
          @hideOn="clickout escapekey"
          @hideDuration={{0}}
          @interactive={{true}}
          @middleware={{this.middleware}}
        >
          <button id="inside-virtual-btn" type="button">Inside virtual</button>
        </AttachPopover>
      </div>
    `);

    const attachment = find('#virtual-popover');
    assert.true(isVisible(attachment), 'Virtual popover initially shown');
    assert.true(clientRectsCalled > 0, 'inline() middleware invoked VirtualElement.getClientRects()');

    // Clicking inside interactive virtual popover keeps it open
    await click('#inside-virtual-btn');
    assert.true(isVisible(attachment), 'Stays visible when clicking inside interactive virtual attachment');

    // Clicking outside dismisses coordinate-only virtual attachment
    await click('#outside-btn');
    await waitUntil(() => isVisible(attachment) === false);
    assert.false(isVisible(attachment), 'Dismissed on document clickout without contextElement');

    // Re-open by re-initializing virtualTarget and test Escape dismissal
    this.set('virtualTarget', { ...this.virtualTarget });
    await settled();
    assert.true(isVisible(attachment), 'Shown again after virtual target update');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(attachment) === false);
    assert.false(isVisible(attachment), 'Dismissed on document Escape keydown without contextElement');
  });

  test('deduplicates @middleware by m.name without mutating consumer objects, merges arrow element, syncs @strategy, and applies middlewareData.hide', async function (assert) {
    const seenMiddlewareNames = [];
    const customFlip = Object.freeze({
      name: 'flip',
      options: Object.freeze({ fallbackPlacements: ['bottom'] }),
      fn() {
        return {};
      },
    });
    const customShift = Object.freeze({
      name: 'shift',
      fn() {
        return {};
      },
    });
    const customArrow = arrow({ padding: 8 });
    const inspector = {
      name: 'inspector',
      fn(state) {
        seenMiddlewareNames.push(state.middlewareData);
        return {};
      },
    };
    const simulateHidden = {
      name: 'hide',
      fn() {
        return {
          data: {
            referenceHidden: true,
            escaped: true,
          },
        };
      },
    };

    this.set('middleware', [customFlip, customShift, customArrow, inspector]);

    await render(hbs`
      <button id="strategy-target" type="button">Target</button>
      <AttachPopover
        @id="middleware-popover"
        @target="#strategy-target"
        @isShown={{true}}
        @arrow={{true}}
        @strategy="fixed"
        @middleware={{this.middleware}}
      >
        Popover content
      </AttachPopover>
    `);

    const attachment = find('#middleware-popover');
    assert.true(isVisible(attachment), 'Popover is visible');
    assert.strictEqual(attachment.style.position, 'fixed', '@strategy="fixed" synced to floatingElement.style.position');
    assert.strictEqual(
      customArrow.options.element,
      undefined,
      'consumer arrow({ padding }) options object was not mutated in place'
    );
    const arrowEl = attachment.querySelector('.ember-attacher-arrow');
    assert.ok(
      arrowEl.style.left !== '' || arrowEl.style.top !== '',
      'arrow({ padding }) without element automatically merged this._arrowElement and positioned arrow'
    );
    assert.ok(seenMiddlewareNames.length > 0, 'custom middleware executed');

    // Now apply middlewareData.hide with referenceHidden / escaped = true
    this.set('middleware', [customFlip, customShift, simulateHidden]);
    await settled();

    assert.dom('#middleware-popover').hasAttribute('data-reference-hidden', '');
    assert.dom('#middleware-popover').hasAttribute('data-escaped', '');
    assert.strictEqual(
      attachment.style.visibility,
      'hidden',
      'middlewareData.hide hides attachment visibility when referenceHidden/escaped'
    );
    assert.false(isVisible(attachment), 'isVisible returns false when middlewareData.hide hides attachment');
  });

  test('supports declarative [interestfor="<id>"] pairing and sets data-placement alongside x-placement', async function (assert) {
    await render(hbs`
      <button id="interest-btn" type="button" interestfor="interest-tip">
        Info button
      </button>
      <AttachTooltip @id="interest-tip" @placement="bottom" @showDuration={{0}} @hideDuration={{0}}>
        Declarative interest tooltip
      </AttachTooltip>
    `);

    const tip = find('#interest-tip');
    const btn = find('#interest-btn');

    await triggerEvent(btn, 'mouseenter');
    await waitUntil(() => isVisible(tip));
    assert.true(isVisible(tip), '[interestfor] pairs tooltip on mouseenter');
    assert.strictEqual(tip.getAttribute('data-placement'), tip.getAttribute('x-placement'), 'sets data-placement alongside x-placement');
    assert.dom(btn).hasAttribute('aria-describedby', 'interest-tip');

    await click(btn);
    assert.true(isVisible(tip), 'clicking [interestfor]-only trigger does not hijack click behavior');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => !isVisible(tip));
    assert.false(isVisible(tip), 'Escape dismisses [interestfor] tooltip');

    // Native invoker beforetoggle with event.source carrying [interestfor]
    const openEvt = new Event('beforetoggle');
    Object.defineProperty(openEvt, 'newState', { value: 'open' });
    Object.defineProperty(openEvt, 'source', { value: btn });
    tip.dispatchEvent(openEvt);
    tip.showPopover?.();
    await settled();
    assert.true(isVisible(tip), 'native beforetoggle with [interestfor] source opens tooltip');

    const closeEvt = new Event('beforetoggle');
    Object.defineProperty(closeEvt, 'newState', { value: 'closed' });
    Object.defineProperty(closeEvt, 'source', { value: btn });
    tip.dispatchEvent(closeEvt);
    tip.hidePopover?.();
    await settled();
    assert.false(isVisible(tip), 'native beforetoggle with [interestfor] source closes tooltip');
  });

  test('asserts in debug when no target binding is supplied while allowing nullable @target={{this.dynamicTarget}}', async function (assert) {
    let capturedError = null;
    const prevIgnore = QUnit.config.current.ignoreGlobalErrors;
    const prevWindowOnError = window.onerror;
    QUnit.config.current.ignoreGlobalErrors = true;
    window.onerror = (message, _source, _lineno, _colno, error) => {
      capturedError = error || message;
      return true;
    };

    try {
      await render(hbs`
        <AttachTooltip @id="missing-target-tip">
          Orphan tooltip
        </AttachTooltip>
      `);
    } finally {
      window.onerror = prevWindowOnError;
      QUnit.config.current.ignoreGlobalErrors = prevIgnore;
      await clearRender();
    }

    assert.ok(
      String(capturedError).includes('require a Target in 5.0.0'),
      'debug assert fires when no target binding mechanism is supplied'
    );

    this.set('dynamicTarget', null);
    await render(hbs`
      <button id="later-target" type="button">Later target</button>
      <AttachTooltip @id="nullable-target-tip" @target={{this.dynamicTarget}} @showDuration={{0}} @hideDuration={{0}}>
        Dynamic tooltip
      </AttachTooltip>
    `);

    assert.dom('#nullable-target-tip').exists('nullable @target renders without asserting');
    this.set('dynamicTarget', '#later-target');
    await settled();

    await triggerEvent('#later-target', 'mouseenter');
    assert.true(isVisible(find('#nullable-target-tip')), 'activates once reactive @target resolves');
  });

  test('@offset and offset() middleware measure exact gap without doubling CSS distance', async function (assert) {
    this.set('offsetMw', [offset(6)]);

    await render(hbs`
      <div style="padding: 120px;">
        <button id="offset-btn" type="button">Offset 12</button>
        <AttachTooltip
          @id="offset-tip"
          @target="#offset-btn"
          @offset={{12}}
          @placement="bottom"
          @animation="shift"
          @isShown={{true}}
          @showOn={{null}}
          @hideOn={{null}}
          @showDuration={{0}}
          @hideDuration={{0}}
        >
          Offset 12 tip
        </AttachTooltip>

        <button id="mw-offset-btn" type="button">Middleware Offset 6</button>
        <AttachTooltip
          @id="mw-offset-tip"
          @target="#mw-offset-btn"
          @middleware={{this.offsetMw}}
          @placement="bottom"
          @animation="fade"
          @isShown={{true}}
          @showOn={{null}}
          @hideOn={{null}}
          @showDuration={{0}}
          @hideDuration={{0}}
        >
          Middleware 6 tip
        </AttachTooltip>
      </div>
    `);

    const tip = find('#offset-tip');
    const tipInner = tip.querySelector(':scope > div');
    const btnRect = find('#offset-btn').getBoundingClientRect();
    const tipRect = tipInner.getBoundingClientRect();
    assert.dom(tip).hasAttribute('data-offset');
    assert.ok(
      Math.abs(tipRect.top - btnRect.bottom - 12) <= 1,
      `expected 12px gap via @offset={{12}}, got ${tipRect.top - btnRect.bottom}px`
    );

    const mwTip = find('#mw-offset-tip');
    const mwInner = mwTip.querySelector(':scope > div');
    const mwBtnRect = find('#mw-offset-btn').getBoundingClientRect();
    const mwTipRect = mwInner.getBoundingClientRect();
    assert.dom(mwTip).hasAttribute('data-offset');
    assert.ok(
      Math.abs(mwTipRect.top - mwBtnRect.bottom - 6) <= 1,
      `expected 6px gap via offset(6), got ${mwTipRect.top - mwBtnRect.bottom}px`
    );
  });

  test('top-layer clipping ignores background overflow:hidden while preserving intra-dialog scroll clipping', async function (assert) {
    this.set('hideMiddleware', [hide()]);
    this.set('showModalDialog', modifier((el) => {
      if (typeof el.showModal === 'function' && !el.open) {
        el.showModal();
      }
    }));

    await render(hbs`
      <div style="width: 40px; height: 40px; overflow: hidden;">
        <dialog id="test-modal" {{this.showModalDialog}} style="overflow: visible; padding: 16px;">
          <div id="modal-scroll" style="height: 60px; overflow: auto; width: 240px;">
            <button id="modal-visible-btn" type="button">Visible in modal</button>
            <div style="height: 200px;">Spacer</div>
            <button id="modal-scrolled-out-btn" type="button">Scrolled out</button>
          </div>
          <AttachTooltip
            @id="modal-visible-tip"
            @target="#modal-visible-btn"
            @middleware={{this.hideMiddleware}}
            @isShown={{true}}
            @showDuration={{0}}
            @hideDuration={{0}}
          >
            Visible modal tip
          </AttachTooltip>
          <AttachTooltip
            @id="modal-hidden-tip"
            @target="#modal-scrolled-out-btn"
            @middleware={{this.hideMiddleware}}
            @isShown={{true}}
            @showDuration={{0}}
            @hideDuration={{0}}
          >
            Scrolled out modal tip
          </AttachTooltip>
        </dialog>
      </div>
    `);

    const visibleTip = find('#modal-visible-tip');
    const hiddenTip = find('#modal-hidden-tip');
    assert.dom(visibleTip).doesNotHaveAttribute('data-reference-hidden', 'background overflow:hidden does not clip modal target');
    assert.true(isVisible(visibleTip));
    assert.dom(hiddenTip).hasAttribute('data-reference-hidden', '', 'intra-modal scroll container still hides scrolled-out target');
    assert.false(isVisible(hiddenTip));

    // Cleanly close modal so test container resets
    find('#test-modal')?.close?.();
  });

  test('top-layer child popover inside overflow:visible parent popover is not clipped by parent popover rect', async function (assert) {
    await render(hbs`
      <button id="outer-small-btn" type="button">Outer</button>
      <AttachPopover
        @id="outer-small-pop"
        @target="#outer-small-btn"
        @isShown={{true}}
        @showDuration={{0}}
        @hideDuration={{0}}
      >
        <div style="width: 60px;">
          <button id="inner-child-btn" type="button">Go</button>
          <AttachPopover
            @id="inner-wide-pop"
            @target="#inner-child-btn"
            @placement="right"
            @isShown={{true}}
            @showDuration={{0}}
            @hideDuration={{0}}
          >
            <div style="width: 240px;">Wide child popover content</div>
          </AttachPopover>
        </div>
      </AttachPopover>
    `);

    const outer = find('#outer-small-pop');
    const inner = find('#inner-wide-pop');
    assert.strictEqual(outer.getAttribute('data-placement'), outer.getAttribute('x-placement'));
    assert.strictEqual(
      inner.getAttribute('data-placement'),
      'right',
      'wide child popover is not forced to flip by narrow overflow:visible parent popover'
    );
  });

  test('relative @target tokens (:previous stacking, :parent, :closest) and descendant click guard', async function (assert) {
    this.set('showConditionalBtn', false);

    await render(hbs`
      <div id="relative-root" style="padding: 80px;">
        <button id="stack-btn" type="button">Stacked Trigger</button>
        <AttachTooltip @id="stack-tip" @target=":previous" @showDuration={{0}} @hideDuration={{0}}>
          Stacked tooltip
        </AttachTooltip>
        <AttachPopover @id="stack-pop" @target=":previous(button)" @showOn="click" @hideOn="click" @showDuration={{0}} @hideDuration={{0}}>
          Stacked popover
        </AttachPopover>

        <div id="indicator-wrap" role="button" tabindex="0">
          Indicator
          <AttachPopover
            @id="parent-pop"
            @target=":parent"
            @showOn="click"
            @hideOn="click"
            @showDuration={{0}}
            @hideDuration={{0}}
          >
            <button id="inside-parent-pop-btn" type="button">Inside action</button>
          </AttachPopover>
        </div>

        <section id="closest-card" class="card">
          <div>
            <AttachPopover
              @id="closest-pop"
              @target=":closest(.card)"
              @class="card"
              @showOn="click"
              @hideOn="click"
              @showDuration={{0}}
              @hideDuration={{0}}
            >
              Closest card
            </AttachPopover>
          </div>
        </section>

        <div id="conditional-sibling-wrap">
          {{#if this.showConditionalBtn}}
            <button id="cond-btn-a" type="button">Cond A</button>
          {{else}}
            <button id="cond-btn-b" type="button">Cond B</button>
          {{/if}}
          <AttachPopover @id="cond-pop" @target=":previous" @showOn="click" @hideOn="click" @showDuration={{0}} @hideDuration={{0}}>
            Conditional target
          </AttachPopover>
        </div>
      </div>
    `);

    await triggerEvent('#stack-btn', 'mouseenter');
    assert.true(isVisible(find('#stack-tip')), ':previous resolves past no other siblings');
    await click('#stack-btn');
    assert.true(isVisible(find('#stack-pop')), ':previous(button) skips sibling .ember-attacher tooltip');

    // Trap 1: clicking inside an Attachment nested in its own Target must not close it via hideOn="click"
    await click('#indicator-wrap');
    assert.true(isVisible(find('#parent-pop')), ':parent opens on parent click');
    await click('#inside-parent-pop-btn');
    assert.true(isVisible(find('#parent-pop')), 'clicking inside nested Attachment does not bubble to close parent Target');
    await click('#indicator-wrap');
    assert.false(isVisible(find('#parent-pop')), 'clicking target directly still closes');

    // :closest(.card) skips host even when host has class="card"
    await click('#closest-card');
    assert.true(isVisible(find('#closest-pop')), ':closest(.card) binds ancestor section rather than host itself');

    // Conditional sibling swap updates static @target=":previous"
    await click('#cond-btn-b');
    assert.true(isVisible(find('#cond-pop')), 'binds initial sibling Cond B');
    await click('#cond-btn-b');
    this.set('showConditionalBtn', true);
    await settled();
    await click('#cond-btn-a');
    assert.true(isVisible(find('#cond-pop')), 're-resolves static @target=":previous" when sibling swaps to Cond A');

    // :previous(<selector>) asserts in debug when immediate non-attacher sibling does not match
    let capturedError = null;
    const prevIgnore = QUnit.config.current.ignoreGlobalErrors;
    const prevWindowOnError = window.onerror;
    QUnit.config.current.ignoreGlobalErrors = true;
    window.onerror = (message, _source, _lineno, _colno, error) => {
      capturedError = error || message;
      return true;
    };

    try {
      await render(hbs`
        <span>Not a button</span>
        <AttachPopover @id="mismatch-prev" @target=":previous(button)">Mismatch</AttachPopover>
      `);
    } finally {
      window.onerror = prevWindowOnError;
      QUnit.config.current.ignoreGlobalErrors = prevIgnore;
      await clearRender();
    }

    assert.ok(
      String(capturedError).includes('expected the preceding sibling <span> to match "button"'),
      'debug assert fires when :previous(button) does not match immediate non-attacher sibling'
    );
  });

  test('containing relative target (:closest) dismisses via clickout and focusout on other controls inside target', async function (assert) {
    await render(hbs`
      <section id="card-dismiss" class="card">
        <button id="card-other-btn" type="button">Other control</button>
        <AttachPopover
          @id="card-pop"
          @target=":closest(.card)"
          @showOn="click"
          @hideOn="clickout"
          @showDuration={{0}}
          @hideDuration={{0}}
        >
          <button id="card-pop-btn" type="button">Inside pop</button>
        </AttachPopover>
      </section>
      <section id="card-focus-dismiss" class="card" tabindex="0">
        <button id="card-focus-other-btn" type="button">Other focus control</button>
        <AttachPopover
          @id="card-focus-pop"
          @target=":closest(.card)"
          @showOn="click"
          @hideOn="focusout"
          @showDuration={{0}}
          @hideDuration={{0}}
        >
          <button id="card-focus-pop-btn" type="button">Inside focus pop</button>
        </AttachPopover>
      </section>
    `);

    await click('#card-dismiss');
    assert.true(isVisible(find('#card-pop')), ':closest(.card) opens on click and stays open past opening click');

    await click('#card-pop-btn');
    assert.true(isVisible(find('#card-pop')), 'clicking inside interactive :closest(.card) popover keeps it open');

    await click('#card-other-btn');
    assert.false(isVisible(find('#card-pop')), 'clicking another control inside :closest(.card) dismisses via clickout');

    await click('#card-focus-dismiss');
    assert.true(isVisible(find('#card-focus-pop')), ':closest(.card) opens for focusout check');

    await click('#card-focus-pop-btn');
    assert.true(isVisible(find('#card-focus-pop')), 'focusing inside interactive :closest(.card) popover keeps it open');

    await focus('#card-focus-other-btn');
    assert.false(isVisible(find('#card-focus-pop')), 'moving focus to another control inside :closest(.card) dismisses via focusout');
  });

  test('does not assign permanent will-change on closed tooltips and removes x-arrow', async function (assert) {
    await render(hbs`
      <button id="perf-btn" type="button">Perf target</button>
      <AttachTooltip @id="perf-tip" @target="#perf-btn" @arrow={{true}} @animation="fill" @hideDuration={{0}}>
        Perf tooltip
      </AttachTooltip>
    `);

    const host = find('#perf-tip');
    const inner = host.querySelector('.ember-attacher-tooltip');
    const arrowEl = host.querySelector('.ember-attacher-arrow');
    const circleEl = host.querySelector('.ember-attacher-fill-circle');

    assert.strictEqual(getComputedStyle(inner).willChange, 'auto', 'idle/closed attachment avoids permanent will-change: transform');
    assert.strictEqual(getComputedStyle(host).perspective, 'none', 'non-perspective host avoids permanent 3D perspective context');
    assert.false(arrowEl.hasAttribute('x-arrow'), 'no legacy x-arrow attribute rendered');
    assert.ok(circleEl, 'uses .ember-attacher-fill-circle class hook');
  });
});
