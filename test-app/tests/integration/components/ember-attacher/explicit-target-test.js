import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, find, focus, render, settled, triggerKeyEvent, waitUntil } from '@ember/test-helpers';
import {
  arrow,
  inline,
  isVisible,
  offset,
} from 'ember-attacher';
import { modifier } from 'ember-modifier';

module('Integration | Component | explicit target', function (hooks) {
  setupRenderingTest(hooks);

  test('it processes the explicit target change', async function (assert) {
    this.set('explicitTarget', null);

    await render(hbs`
      <div>
        <button id="new-target" />
        <button id="old-target">
          <AttachTooltip @id="attachment" @explicitTarget={{this.explicitTarget}} @showOn="focus">
            Floating element
          </AttachTooltip>
        </button>
      </div>
    `);

    assert.dom('#old-target').hasAria('describedby', 'attachment');
    await focus('#old-target');
    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), true, 'Is shown on focus');
    await focus('#new-target');
    assert.equal(isVisible(attachment), false, 'Hides after focusing on another target');
    this.set('explicitTarget', find('#new-target'));
    await settled();
    await focus('#old-target');
    assert.equal(isVisible(attachment), false, 'Not showing on old target focus');
    await focus('#new-target');
    assert.equal(isVisible(attachment), true, 'Is shown on new target focus');
    assert.dom('#old-target').doesNotHaveAria('describedby');
    assert.dom('#new-target').hasAria('describedby', 'attachment');
  });

  test('resolves @explicitTarget CSS selector strings', async function (assert) {
    await render(hbs`
      <div>
        <button id="selector-target">Selector target</button>
        <div id="mount">
          <AttachPopover
            @id="attachment"
            @explicitTarget="#selector-target"
            @showOn="click"
            @hideOn="click"
          >
            Floating element
          </AttachPopover>
        </div>
      </div>
    `);

    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#selector-target');
    assert.equal(isVisible(attachment), true, 'Shown when selector target is clicked');

    await click('#selector-target');
    assert.equal(isVisible(attachment), false, 'Hidden when selector target is clicked again');
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
          @explicitTarget={{this.virtualTarget}}
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
    assert.equal(isVisible(attachment), true, 'Shown via @isShown with virtual target');
    assert.dom('#attachment').hasAttribute('x-placement', 'bottom');
  });

  test('yielded setReference registers an external Element target', async function (assert) {
    this.set(
      'registerExternalTarget',
      modifier((_element, [setReference]) => {
        setReference(document.getElementById('external-target'));
      })
    );

    await render(hbs`
      <div>
        <button id="external-target">External</button>
        <div id="mount">
          <AttachPopover
            @id="attachment"
            @showOn="click"
            @hideOn="click"
            @lazyRender={{false}}
            as |attacher|
          >
            <span {{this.registerExternalTarget attacher.setReference}}></span>
            Floating element
          </AttachPopover>
        </div>
      </div>
    `);

    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#mount');
    assert.equal(isVisible(attachment), false, 'Parent mount click does not show');

    await click('#external-target');
    assert.equal(isVisible(attachment), true, 'Shown when setReference target is clicked');
  });

  test('yielded reference modifier exists on first render and retargets', async function (assert) {
    let sawReferenceOnFirstYield = false;

    this.set(
      'captureReference',
      modifier((_element, [reference]) => {
        sawReferenceOnFirstYield = typeof reference === 'function' || typeof reference === 'object';
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
          <span {{this.captureReference attacher.reference}}></span>
          <button id="yielded-ref" {{attacher.reference}} type="button">Inner ref</button>
          Floating element
        </AttachPopover>
      </div>
    `);

    assert.ok(sawReferenceOnFirstYield, 'reference modifier is defined on first yield');

    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#wrapper');
    assert.equal(isVisible(attachment), false, 'Wrapper (parent) click does not show after retarget');

    await click('#yielded-ref');
    assert.equal(isVisible(attachment), true, 'Shown when yielded reference element is clicked');
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
            @explicitTarget={{this.virtualTarget}}
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
    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#context-target');
    assert.equal(isVisible(attachment), true, 'Shown via virtual contextElement click');
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
          @explicitTarget={{this.virtualTarget}}
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
    assert.equal(isVisible(attachment), true, 'Tooltip visible for virtual target');
  });

  test('T4: coordinate-only VirtualElement without contextElement dismisses on document clickout and escapekey, and supports inline() getClientRects', async function (assert) {
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
          @explicitTarget={{this.virtualTarget}}
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

  test('T3: deduplicates @middleware by m.name without mutating consumer objects, merges arrow element, syncs @strategy, and applies middlewareData.hide', async function (assert) {
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
      <button id="strategy-target" type="button">
        Target
        <AttachPopover
          @id="middleware-popover"
          @isShown={{true}}
          @arrow={{true}}
          @flip="left right"
          @strategy="fixed"
          @middleware={{this.middleware}}
        >
          Popover content
        </AttachPopover>
      </button>
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
});
