import { hbs } from 'ember-cli-htmlbars';
import { isVisible, offset } from 'ember-attacher';
import sinon from 'sinon';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import {
  clearRender,
  click,
  find,
  findAll,
  render,
  settled,
  triggerEvent,
  waitUntil,
} from '@ember/test-helpers';

module('Integration | Component | non-wrapper API & shared tooltips', function (hooks) {
  setupRenderingTest(hooks);

  hooks.afterEach(function () {
    sinon.restore();
  });

  test('singleton {{tooltip}} modifier shares a single Attachment node and updates text/class/ARIA cleanly', async function (assert) {
    this.set('items', [
      { id: 'row-1', label: 'Edit first', tipClass: 'tip-alpha' },
      { id: 'row-2', label: 'Delete second', tipClass: 'tip-beta' },
      { id: 'row-3', label: 'Archive third', tipClass: 'tip-gamma' },
    ]);
    this.set('dynamicLabel', 'Edit first');

    await render(hbs`
      <div class="list">
        <button id="tip-btn-0" type="button" {{tooltip this.dynamicLabel class="tip-alpha" placement="bottom" arrow=true showDuration=0 hideDuration=0}}>
          First
        </button>
        {{#each this.items as |item|}}
          <button id={{item.id}} type="button" {{tooltip item.label class=item.tipClass showDuration=0 hideDuration=0}}>
            Item {{item.id}}
          </button>
        {{/each}}
      </div>
    `);

    assert.ok(
      document.querySelectorAll('.ember-attacher').length <= 1,
      'allocates <= 1 Attachment DOM node across multiple {{tooltip}} callers'
    );

    const btn0 = find('#tip-btn-0');
    const row2 = find('#row-2');

    await triggerEvent(btn0, 'mouseenter');
    await waitUntil(() => isVisible(find('.ember-attacher')));

    const singletonEl = find('.ember-attacher');
    assert.strictEqual(
      document.querySelectorAll('.ember-attacher').length,
      1,
      'reuses a single DOM Attachment node while active'
    );
    assert.dom(singletonEl).hasText('Edit first');
    assert.dom('.tip-alpha', singletonEl).exists('applies caller custom tooltip class');
    assert.dom('.ember-attacher-arrow', singletonEl).exists('renders arrow when arrow=true');
    assert.dom(btn0).hasAttribute('aria-describedby', singletonEl.id);

    // Reactive text update while open
    this.set('dynamicLabel', 'Renamed first');
    await settled();
    assert.dom(singletonEl).hasText('Renamed first', 'updates open singleton text reactively');

    // Moving to another {{tooltip}} target reuses the exact same DOM node & swaps ARIA cleanly
    await triggerEvent(btn0, 'mouseleave');
    await triggerEvent(row2, 'mouseenter');
    await waitUntil(() => isVisible(singletonEl) && singletonEl.textContent.trim() === 'Delete second');

    assert.strictEqual(
      document.querySelectorAll('.ember-attacher').length,
      1,
      'still only 1 Attachment node in document after switching targets'
    );
    assert.dom(btn0).doesNotHaveAttribute('aria-describedby', 'cleans aria-describedby from prior target');
    assert.dom(row2).hasAttribute('aria-describedby', singletonEl.id, 'binds aria-describedby to new target');
    assert.dom('.tip-beta', singletonEl).exists('applies new caller custom class');
    assert.dom('.ember-attacher-arrow', singletonEl).doesNotExist('removes arrow when next target disables arrow');

    await clearRender();
    assert.strictEqual(
      document.querySelectorAll('.ember-attacher').length,
      0,
      'removes singleton DOM node when all {{tooltip}} modifiers unmount'
    );
  });

  test('delay group warm handoff skips showDelay within 300ms and resets once cold', async function (assert) {
    await render(hbs`
      <button id="warm-a" type="button" {{tooltip "First hint" interactive=false showDelay=160 showDuration=0 hideDuration=0}}>A</button>
      <button id="warm-b" type="button" {{tooltip "Second hint" interactive=false showDelay=160 showDuration=0 hideDuration=0}}>B</button>
      <button id="warm-c" type="button" {{tooltip "Third hint" interactive=false showDelay=160 showDuration=0 hideDuration=0}}>C</button>
    `);

    const btnA = find('#warm-a');
    const btnB = find('#warm-b');
    const btnC = find('#warm-c');

    // 1. Cold hover on A: Ember debounce has not flushed until settled()
    btnA.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    assert.false(
      Boolean(find('.ember-attacher') && isVisible(find('.ember-attacher'))),
      'cold tooltip does not show before showDelay elapses'
    );

    await settled();
    assert.true(isVisible(find('.ember-attacher')), 'cold tooltip shows after showDelay');
    assert.dom('.ember-attacher').hasText('First hint');

    // 2. Leave A -> hover B inside warm window: showDelay is skipped (0ms debounce)
    await triggerEvent(btnA, 'mouseleave');
    assert.false(isVisible(find('.ember-attacher')), 'A hides before warm handoff');

    btnB.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await settled();
    assert.true(isVisible(find('.ember-attacher')), 'warm handoff shows B without waiting showDelay');
    assert.dom('.ember-attacher').hasText('Second hint');

    // 3. Advance clock past the 300ms warm window; C respects showDelay again
    const clock = sinon.useFakeTimers({
      now: Date.now(),
      shouldAdvanceTime: true,
      toFake: ['Date'],
    });
    await triggerEvent(btnB, 'mouseleave');
    clock.tick(350);

    btnC.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    assert.false(
      isVisible(find('.ember-attacher')),
      'after warm cooldown expires, tooltip respects showDelay again'
    );
    await settled();
    assert.true(isVisible(find('.ember-attacher')), 'C shows after showDelay once cold');
    assert.dom('.ember-attacher').hasText('Third hint');
  });

  test('singleton {{tooltip}} keeps warm handoff when hideDelay > 0 is cancelled before closing', async function (assert) {
    await render(hbs`
      <button id="hide-delay-a" type="button" {{tooltip "First delayed" showDelay=160 hideDelay=200 showDuration=0 hideDuration=0}}>A</button>
      <button id="hide-delay-b" type="button" {{tooltip "Second delayed" showDelay=160 hideDelay=200 showDuration=0 hideDuration=0}}>B</button>
    `);

    const btnA = find('#hide-delay-a');
    const btnB = find('#hide-delay-b');

    await triggerEvent(btnA, 'mouseenter');
    assert.true(isVisible(find('.ember-attacher')), 'A opens after showDelay');
    assert.dom('.ember-attacher').hasText('First delayed');

    // Leave A (schedules hideDelay=200), then immediately enter B before hide flushes
    btnA.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    const setTimeoutSpy = sinon.spy(globalThis, 'setTimeout');

    btnB.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    const scheduledShowDelays = setTimeoutSpy
      .getCalls()
      .map((call) => call.args[1])
      .filter((delay) => typeof delay === 'number' && delay >= 100);

    assert.deepEqual(
      scheduledShowDelays,
      [],
      'warm handoff skips 160ms showDelay debounce even when hideDelay > 0 never closed prior target'
    );

    await settled();
    assert.true(isVisible(find('.ember-attacher')), 'B remains visible after warm handoff');
    assert.dom('.ember-attacher').hasText('Second delayed');
  });

  test('named <:target>/ <:content> blocks and {{a.target data}} retarget across list items on one AttachTooltip', async function (assert) {
    this.set('rows', [
      { id: 'item-1', name: 'Alpha' },
      { id: 'item-2', name: 'Beta' },
      { id: 'item-3', name: 'Gamma' },
    ]);
    this.set('middleware', [offset(12)]);

    await render(hbs`
      <AttachTooltip
        @id="shared-list-tooltip"
        @placement="bottom"
        @middleware={{this.middleware}}
        @showDuration={{0}}
        @hideDuration={{0}}
      >
        <:target as |target|>
          <div class="rows">
            {{#each this.rows as |row|}}
              <button id={{row.id}} type="button" {{target row}}>{{row.name}}</button>
            {{/each}}
          </div>
        </:target>
        <:content as |a|>
          <span data-test-payload>{{a.data.name}}</span>
          <span data-test-placement>{{a.placement}}</span>
          <span data-test-offset>{{a.middlewareData.offset.y}}</span>
          <span data-test-shown>{{if a.isShown "open" "closed"}}</span>
          <button type="button" data-test-hide {{on "click" a.hide}}>Close</button>
        </:content>
      </AttachTooltip>
    `);

    assert.strictEqual(findAll('#shared-list-tooltip').length, 1, 'single shared Attachment instance rendered');

    const item1 = find('#item-1');
    const item2 = find('#item-2');

    // Target elements rendered in place outside the attachment element
    assert.strictEqual(find('.rows').contains(item1), true, '<:target> stays in local DOM');
    assert.strictEqual(find('#shared-list-tooltip').contains(item1), false, '<:target> is not inside portal');

    await triggerEvent(item1, 'mouseenter');
    await waitUntil(() => isVisible(find('#shared-list-tooltip')));

    assert.dom('[data-test-payload]').hasText('Alpha');
    assert.dom('[data-test-placement]').hasText('bottom');
    assert.dom('[data-test-offset]').hasText('12');
    assert.dom('[data-test-shown]').hasText('open');
    assert.dom(item1).hasAttribute('aria-describedby', 'shared-list-tooltip');

    await triggerEvent(item1, 'mouseleave');
    await triggerEvent(item2, 'mouseenter');
    await waitUntil(() => isVisible(find('#shared-list-tooltip')) && find('[data-test-payload]')?.textContent?.trim() === 'Beta');

    assert.dom(item1).doesNotHaveAttribute('aria-describedby', 'old trigger loses aria-describedby on retarget');
    assert.dom(item2).hasAttribute('aria-describedby', 'shared-list-tooltip', 'new trigger gains aria-describedby on retarget');
    assert.strictEqual(findAll('#shared-list-tooltip').length, 1, 'still only 1 Attachment node');
  });

  test('headless <Attacher as |a|> yields full API, lazyRender gating, arrow, and reactive @isShown', async function (assert) {
    this.set('open', false);
    this.set('middleware', [offset(8)]);
    this.set('row', { title: 'Headless Details' });

    await render(hbs`
      <Attacher
        @id="headless-menu"
        @ariaRole="dialog"
        @placement="right"
        @middleware={{this.middleware}}
        @showOn="click"
        @hideOn="click clickout escapekey"
        @lazyRender={{true}}
        @isShown={{this.open}}
        @showDuration={{0}}
        @hideDuration={{0}}
        as |a|
      >
        <button
          id="headless-trigger"
          type="button"
          data-open={{if a.isShown "yes" "no"}}
          {{a.target this.row}}
        >
          Toggle Menu
        </button>

        {{#if a.shouldRender}}
          <div id="headless-panel" {{a.attachment}}>
            <span data-test-title>{{a.data.title}}</span>
            <span data-test-placement>{{a.placement}}</span>
            <span data-test-offset>{{a.middlewareData.offset.x}}</span>
            <div id="headless-arrow" {{a.arrow}}></div>
            <button id="headless-update" type="button" {{on "click" a.update}}>Update</button>
            <button id="headless-hide" type="button" {{on "click" a.hide}}>Hide</button>
          </div>
        {{/if}}
      </Attacher>
    `);

    const trigger = find('#headless-trigger');
    assert.dom(trigger).hasAttribute('data-open', 'no');
    assert.dom(trigger).hasAttribute('aria-controls', 'headless-menu');
    assert.dom(trigger).hasAttribute('aria-expanded', 'false');
    assert.dom(trigger).hasAttribute('aria-haspopup', 'dialog');
    assert.dom('#headless-panel').doesNotExist('lazyRender defers panel mount until opened');

    await click(trigger);
    await waitUntil(() => isVisible(find('#headless-panel')));

    const panel = find('#headless-panel');
    assert.dom(panel).hasAttribute('x-placement', 'right');
    assert.dom(trigger).hasAttribute('data-open', 'yes');
    assert.dom(trigger).hasAttribute('aria-expanded', 'true');
    assert.dom('[data-test-title]').hasText('Headless Details');
    assert.dom('[data-test-placement]').hasText('right');
    assert.dom('[data-test-offset]').hasText('8');
    assert.dom('#headless-arrow').exists();

    await click('#headless-hide');
    await waitUntil(() => !isVisible(panel));
    assert.dom(trigger).hasAttribute('data-open', 'no');
    assert.dom(trigger).hasAttribute('aria-expanded', 'false');

    // Controlled @isShown reactivity
    this.set('open', true);
    await waitUntil(() => isVisible(find('#headless-panel')));
    assert.dom(trigger).hasAttribute('data-open', 'yes');
  });

  test('@target alias and native [popovertarget="<id>"] pairing work seamlessly', async function (assert) {
    await render(hbs`
      <button id="explicit-by-target" type="button">Target Attr</button>
      <AttachPopover @id="pop-via-target" @target="#explicit-by-target" @showOn="click" @hideOn="click" @showDuration={{0}} @hideDuration={{0}}>
        Opened via @target
      </AttachPopover>

      <button id="native-invoker" popovertarget="pop-via-invoker" type="button">Native Invoker</button>
      <button id="native-hide-invoker" popovertarget="pop-via-invoker" popovertargetaction="hide" type="button">Force Hide</button>
      <AttachPopover @id="pop-via-invoker" @showDuration={{0}} @hideDuration={{0}}>
        Opened via popovertarget
      </AttachPopover>
    `);

    await click('#explicit-by-target');
    assert.true(isVisible(find('#pop-via-target')), '@target selector binds and opens AttachPopover');

    const invoker = find('#native-invoker');
    const popByInvoker = find('#pop-via-invoker');
    assert.dom(invoker).hasAttribute('aria-controls', 'pop-via-invoker');
    assert.dom(invoker).hasAttribute('aria-expanded', 'false');
    assert.false(isVisible(popByInvoker), 'popovertarget starts closed');

    await click(invoker);
    await waitUntil(() => isVisible(popByInvoker));
    assert.true(isVisible(popByInvoker), 'clicking [popovertarget] opens paired AttachPopover');
    assert.dom(invoker).hasAttribute('aria-expanded', 'true');

    await click('#native-hide-invoker');
    await waitUntil(() => !isVisible(popByInvoker));
    assert.false(isVisible(popByInvoker), 'clicking popovertargetaction="hide" closes paired AttachPopover');
  });

  test('{{tooltip}} isolates per-entry showOn and supports reactive isShown re-open', async function (assert) {
    this.set('hoverLabel', 'Hover hint v1');
    this.set('controlledOpen', true);

    await render(hbs`
      <button id="click-only-tip" type="button" {{tooltip "Click hint" showOn="click" hideOn="click" showDuration=0 hideDuration=0}}>
        Click tip
      </button>
      <button id="hover-only-tip" type="button" {{tooltip this.hoverLabel showDuration=0 hideDuration=0}}>
        Hover tip
      </button>
      <button id="controlled-tip" type="button" {{tooltip "Controlled" isShown=this.controlledOpen showDuration=0 hideDuration=0}}>
        Controlled tip
      </button>
    `);

    const tipEl = find('.ember-attacher');
    await waitUntil(() => isVisible(tipEl) && tipEl.textContent.trim() === 'Controlled');

    // Toggle controlled isShown false -> true on the same element
    this.set('controlledOpen', false);
    await waitUntil(() => !isVisible(tipEl));

    this.set('controlledOpen', true);
    await waitUntil(() => isVisible(tipEl) && tipEl.textContent.trim() === 'Controlled');

    this.set('controlledOpen', false);
    await waitUntil(() => !isVisible(tipEl));

    // Activate click-only entry, then update sibling hover-only entry text
    await click('#click-only-tip');
    await waitUntil(() => isVisible(tipEl) && tipEl.textContent.trim() === 'Click hint');
    await click('#click-only-tip');
    await waitUntil(() => !isVisible(tipEl));

    this.set('hoverLabel', 'Hover hint v2');
    await settled();

    await triggerEvent('#hover-only-tip', 'mouseenter');
    await waitUntil(() => isVisible(tipEl) && tipEl.textContent.trim() === 'Hover hint v2');
    assert.dom(tipEl).hasText('Hover hint v2', 'sibling {{tooltip}} keeps default mouseenter trigger');
  });

  test('{{a.target data}} updates data in place and unmounting active target hides instead of jumping to sibling', async function (assert) {
    this.set('rows', [
      { id: 'row-a', label: 'Row A' },
      { id: 'row-b', label: 'Row B v1' },
    ]);

    await render(hbs`
      <AttachTooltip @id="list-tip" @showDuration={{0}} @hideDuration={{0}}>
        <:target as |target|>
          {{#each this.rows key="id" as |row|}}
            <button id={{row.id}} type="button" {{target row}}>{{row.label}}</button>
          {{/each}}
        </:target>
        <:content as |a|>
          <span data-test-row-label>{{a.data.label}}</span>
        </:content>
      </AttachTooltip>
    `);

    const tip = find('#list-tip');
    await triggerEvent('#row-b', 'mouseenter');
    await waitUntil(() => isVisible(tip));
    assert.dom('[data-test-row-label]').hasText('Row B v1');
    assert.dom('#row-b').hasAttribute('aria-describedby', 'list-tip');

    // Update row-b payload while open: stays open on row-b without jumping to row-a
    this.set('rows', [
      { id: 'row-a', label: 'Row A' },
      { id: 'row-b', label: 'Row B v2' },
    ]);
    await settled();

    assert.true(isVisible(tip), 'tooltip remains visible when active target data updates');
    assert.dom('[data-test-row-label]').hasText('Row B v2', 'updates yielded a.data on active target');
    assert.dom('#row-b').hasAttribute('aria-describedby', 'list-tip', 'remains bound to row-b');
    assert.dom('#row-a').doesNotHaveAttribute('aria-describedby', 'does not hijack onto sibling row-a');

    // Remove active target row-b while open: hides instead of anchoring onto row-a
    this.set('rows', [{ id: 'row-a', label: 'Row A' }]);
    await waitUntil(() => !isVisible(tip));
    assert.false(isVisible(tip), 'hides open attachment when active target unmounts');
    assert.dom('#row-a').doesNotHaveAttribute('aria-describedby', 'sibling row-a stays closed and unbound');
  });

  test('aborted showDelay does not arm warm handoff, a.show ignores DOM Event, hideOn="click" works with mouseenter, and a.arrow enables arrow middleware', async function (assert) {
    await render(hbs`
      <button id="aborted-tip-btn" type="button" {{tooltip "Aborted" showDelay=160 showDuration=0 hideDuration=0}}>
        Aborted
      </button>
      <button id="cold-tip-btn" type="button" {{tooltip "Cold after abort" showDelay=160 showDuration=0 hideDuration=0}}>
        Cold
      </button>

      <Attacher @id="event-show-attacher" @showOn={{null}} @hideOn="escapekey" @showDuration={{0}} @hideDuration={{0}} as |a|>
        <button id="event-show-target" type="button" {{a.target}}>
          Target
        </button>
        <button id="event-show-trigger" type="button" {{on "click" a.show}}>
          Show via Event
        </button>
        <div id="event-show-panel" {{a.attachment}}>
          Arrow x: <span data-test-arrow-x>{{a.middlewareData.arrow.x}}</span>
          <div id="event-show-arrow" {{a.arrow}}></div>
        </div>
      </Attacher>

      <Attacher @id="hover-click-hide-attacher" @showOn="mouseenter" @hideOn="click" @showDuration={{0}} @hideDuration={{0}} as |a|>
        <button id="hover-click-hide-target" type="button" {{a.target}}>
          Hover then click
        </button>
        <div id="hover-click-hide-panel" {{a.attachment}}>Hover/Click Panel</div>
      </Attacher>
    `);

    // Hover and leave before showDelay debounce flushes — does not arm warm handoff
    find('#aborted-tip-btn').dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await triggerEvent('#aborted-tip-btn', 'mouseleave');
    assert.false(isVisible(find('.ember-attacher')), 'aborted show never opens');

    // Next tooltip must still wait for its showDelay (not warm/0ms)
    find('#cold-tip-btn').dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    assert.false(isVisible(find('.ember-attacher')), 'aborted showDelay does not trigger warm 0ms handoff');
    await settled();
    assert.true(isVisible(find('.ember-attacher')), 'cold tip shows after showDelay');

    // Clicking a.show directly via {{on "click" a.show}} opens cleanly on the registered target
    const panel = find('#event-show-panel');
    await click('#event-show-trigger');
    await waitUntil(() => isVisible(panel));
    assert.dom('#event-show-target').hasAttribute('aria-expanded', 'true');
    assert.ok(
      Number.isFinite(Number.parseFloat(find('[data-test-arrow-x]').textContent.trim())),
      'a.arrow automatically enables Floating UI arrow middleware'
    );

    // Trigger via mouseenter then dismiss via hideOn="click" on a registered target
    const hoverClickPanel = find('#hover-click-hide-panel');
    await triggerEvent('#hover-click-hide-target', 'mouseenter');
    await waitUntil(() => isVisible(hoverClickPanel));
    await click('#hover-click-hide-target');
    await waitUntil(() => !isVisible(hoverClickPanel));
    assert.false(isVisible(hoverClickPanel), 'hideOn="click" closes registered target opened by mouseenter');
  });

  test('a.show, a.hide, and a.toggle act immediately regardless of showDelay/hideDelay and persist registered entry.data', async function (assert) {
    let api = null;
    this.set('captureApi', (a) => {
      api = a;
      return '';
    });

    await render(hbs`
      <AttachTooltip @id="imperative-delay-tip" @showDelay={{500}} @hideDelay={{500}} @showDuration={{0}} @hideDuration={{0}}>
        <:target as |target a|>
          {{this.captureApi a}}
          <button id="imp-target-a" type="button" {{target "Initial A"}}>A</button>
          <button id="imp-target-b" type="button" {{target "Initial B"}}>B</button>
        </:target>
        <:content as |a|>
          {{a.data}}
        </:content>
      </AttachTooltip>
    `);

    const tip = find('#imperative-delay-tip');
    const targetA = find('#imp-target-a');
    const targetB = find('#imp-target-b');

    const t0 = Date.now();
    api.show(targetA, 'Updated A');
    assert.true(
      tip.hasAttribute('data-open') && tip.matches(':popover-open'),
      'a.show() opens immediately without waiting 500ms showDelay'
    );
    await settled();
    assert.ok(Date.now() - t0 < 250, 'settled without waiting 500ms showDelay');
    assert.true(isVisible(tip), 'tooltip is visible after positioning microtask');
    assert.dom(tip).hasText('Updated A', 'a.show(registeredEl, data) updates active data');

    // Switch away then back so _activateRegisteredEntry runs against entry.data
    api.show(targetB);
    await settled();
    assert.dom(tip).hasText('Initial B', 'switches to target B immediately');
    api.show(targetA);
    await settled();
    assert.dom(tip).hasText('Updated A', 'persists updated entry.data across entry switches');

    api.hide();
    assert.false(isVisible(tip), 'a.hide() closes immediately without waiting 500ms hideDelay');

    api.toggle();
    await settled();
    assert.true(isVisible(tip), 'a.toggle() opens immediately when closed');
    api.toggle();
    assert.false(isVisible(tip), 'a.toggle() closes immediately when open');
  });
});
