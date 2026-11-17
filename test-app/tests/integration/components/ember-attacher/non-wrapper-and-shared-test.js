import { hbs } from 'ember-cli-htmlbars';
import { isVisible, offset } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import {
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

  test('a.show ignores DOM Event, hideOn="click" works with mouseenter, and a.arrow enables arrow middleware', async function (assert) {
    await render(hbs`
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

  test('delay group warm handoff skips showDelay within 300ms and resets once cooldown expires', async function (assert) {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    await render(hbs`
      <button id="dg-btn-a" type="button">
        A
        <AttachTooltip @id="dg-tip-a" @showDelay={{160}} @showDuration={{0}} @hideDuration={{0}}>
          First
        </AttachTooltip>
      </button>
      <button id="dg-btn-b" type="button">
        B
        <AttachTooltip @id="dg-tip-b" @showDelay={{160}} @showDuration={{0}} @hideDuration={{0}}>
          Second
        </AttachTooltip>
      </button>
      <button id="dg-btn-c" type="button">
        C
        <AttachTooltip @id="dg-tip-c" @showDelay={{160}} @showDuration={{0}} @hideDuration={{0}}>
          Third
        </AttachTooltip>
      </button>
    `);

    const btnA = find('#dg-btn-a');
    const btnB = find('#dg-btn-b');
    const btnC = find('#dg-btn-c');

    // Cold tooltip waits for showDelay (notice no upfront sleep needed: owner starts cold)
    btnA.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await sleep(40);
    assert.false(isVisible('#dg-tip-a'), 'cold tooltip stays hidden before showDelay elapses');
    await settled();
    await waitUntil(() => isVisible('#dg-tip-a'));

    // Handoff within 300ms skips showDelay on B
    await triggerEvent(btnA, 'mouseleave');
    await waitUntil(() => !isVisible('#dg-tip-a'));

    btnB.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await sleep(30);
    await waitUntil(() => isVisible('#dg-tip-b'), { timeout: 120 });
    await settled();

    // After cooldown expires (>300ms), C respects showDelay again
    await triggerEvent(btnB, 'mouseleave');
    await waitUntil(() => !isVisible('#dg-tip-b'));
    await sleep(330);

    btnC.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    await sleep(40);
    assert.false(isVisible('#dg-tip-c'), 'cold tooltip after >300ms cooldown waits for showDelay');
    await settled();
    await waitUntil(() => isVisible('#dg-tip-c'));
  });
});
