import { hbs } from 'ember-cli-htmlbars';
import { isVisible, offset } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, find, focus, render, settled, triggerEvent, triggerKeyEvent, waitUntil } from '@ember/test-helpers';

module('Integration | Component | a11y defaults', function (hooks) {
  setupRenderingTest(hooks);

  test('popover sets aria-expanded, aria-controls, and aria-haspopup without clobbering caller attributes', async function (assert) {
    this.set('showSecond', true);

    await render(hbs`
      <button id="auto-trigger" type="button">
        Auto trigger
      </button>
      <AttachPopover @id="auto-popover" @target="#auto-trigger" @showOn="click" @hideOn="click" @animation="none">
        Auto body
      </AttachPopover>

      <button
        id="custom-trigger"
        type="button"
        aria-haspopup="menu"
        aria-controls="caller-menu"
        aria-expanded="false"
      >
        Custom trigger
      </button>
      {{#if this.showSecond}}
        <AttachPopover @id="custom-popover" @target="#custom-trigger" @showOn="click" @hideOn="click" @animation="none">
          Custom body
        </AttachPopover>
      {{/if}}
    `);

    const autoTrigger = find('#auto-trigger');
    assert.dom(autoTrigger).hasAttribute('aria-haspopup', 'dialog');
    assert.dom(autoTrigger).hasAttribute('aria-controls', 'auto-popover');
    assert.dom(autoTrigger).hasAttribute('aria-expanded', 'false');

    await click(autoTrigger);
    assert.true(isVisible(find('#auto-popover')), 'auto popover opens on click');
    assert.dom(autoTrigger).hasAttribute('aria-expanded', 'true');

    await click(autoTrigger);
    await waitUntil(() => isVisible(find('#auto-popover')) === false);
    assert.dom(autoTrigger).hasAttribute('aria-expanded', 'false');

    const customTrigger = find('#custom-trigger');
    assert.dom(customTrigger).hasAttribute('aria-haspopup', 'menu', 'preserves caller aria-haspopup');
    assert.dom(customTrigger).hasAttribute('aria-controls', 'caller-menu', 'preserves caller aria-controls');
    assert.dom(customTrigger).hasAttribute('aria-expanded', 'false', 'preserves caller aria-expanded');

    await click(customTrigger);
    assert.true(isVisible(find('#custom-popover')), 'custom popover opens on click');
    assert.dom(customTrigger).hasAttribute('aria-expanded', 'false', 'does not override caller-managed aria-expanded');

    this.set('showSecond', false);
    await settled();
    assert.dom(customTrigger).hasAttribute('aria-haspopup', 'menu', 'retains caller aria-haspopup on destroy');
    assert.dom(customTrigger).hasAttribute('aria-controls', 'caller-menu', 'retains caller aria-controls on destroy');
    assert.dom(customTrigger).hasAttribute('aria-expanded', 'false', 'retains caller aria-expanded on destroy');
  });

  test('popover respects custom @ariaRole when deriving aria-haspopup without restricting runtime values', async function (assert) {
    await render(hbs`
      <button id="menu-trigger" type="button">
        Menu
      </button>
      <AttachPopover @id="menu-popover" @target="#menu-trigger" @ariaRole="menu" @showOn="click">
        Menu items
      </AttachPopover>

      <button id="future-role-trigger" type="button">
        Custom
      </button>
      <AttachPopover @id="future-role-popover" @target="#future-role-trigger" @ariaRole="custom-popup" @showOn="click">
        Custom items
      </AttachPopover>
    `);

    assert.dom('#menu-trigger').hasAttribute('aria-haspopup', 'menu');
    assert.dom('#menu-popover').hasAttribute('role', 'menu');

    assert.dom('#future-role-trigger').hasAttribute('aria-haspopup', 'custom-popup');
    assert.dom('#future-role-popover').hasAttribute('role', 'custom-popup');
  });

  test('Escape restores focus to target when focus was inside interactive popover, without stealing external focus', async function (assert) {
    this.set('showPreWired', true);

    await render(hbs`
      <input id="external-input" type="text" aria-label="External input" />

      <button id="escape-focus-trigger" type="button">
        Open menu
      </button>
      <AttachPopover
        @id="escape-focus-popover"
        @target="#escape-focus-trigger"
        @showOn="click"
        @hideOn="escapekey"
        @interactive={{true}}
        @animation="none"
        @hideDuration={{0}}
      >
        <button id="inside-popover-btn" type="button">Action</button>
      </AttachPopover>

      <button id="pre-wired-target" type="button" aria-describedby="pre-wired-tip">
        Pre-wired
      </button>
      {{#if this.showPreWired}}
        <AttachTooltip @id="pre-wired-tip" @target="#pre-wired-target" @showOn="focus" @hideOn="blur" @animation="none">
          Pre-wired tooltip
        </AttachTooltip>
      {{/if}}
    `);

    await click('#escape-focus-trigger');
    const popover = find('#escape-focus-popover');
    assert.true(isVisible(popover), 'popover opens');

    await focus('#inside-popover-btn');
    assert.strictEqual(document.activeElement.id, 'inside-popover-btn', 'focus moves inside popover');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(popover) === false);

    assert.strictEqual(
      document.activeElement.id,
      'escape-focus-trigger',
      'Escape returns focus to target element before hiding'
    );
    assert.dom(popover).hasAttribute('aria-hidden', 'true');

    // Re-open popover, move focus to an unrelated external input, and press Escape
    await click('#escape-focus-trigger');
    assert.true(isVisible(popover), 'popover re-opens');
    await focus('#external-input');
    assert.strictEqual(document.activeElement.id, 'external-input', 'focus is on external input');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(popover) === false);
    assert.strictEqual(
      document.activeElement.id,
      'external-input',
      'Escape does not steal focus from an unrelated external element'
    );

    // Caller-owned aria-describedby token matching tooltip @id is preserved on close and destroy
    await focus('#pre-wired-target');
    assert.dom('#pre-wired-target').hasAttribute('aria-describedby', 'pre-wired-tip');
    await triggerEvent('#pre-wired-target', 'blur');
    assert.dom('#pre-wired-target').hasAttribute(
      'aria-describedby',
      'pre-wired-tip',
      'closing tooltip does not strip caller-supplied aria-describedby token matching tooltip @id'
    );
    this.set('showPreWired', false);
    await settled();
    assert.dom('#pre-wired-target').hasAttribute(
      'aria-describedby',
      'pre-wired-tip',
      'destroying tooltip does not strip caller-supplied aria-describedby token matching tooltip @id'
    );
  });

  test('Escape focus restoration does not re-open a popover whose showOn includes focus', async function (assert) {
    await render(hbs`
      <button id="other-btn" type="button">Other</button>
      <button id="focus-show-trigger" type="button">
        Hover or focus me
      </button>
      <AttachPopover
        @id="focus-show-popover"
        @target="#focus-show-trigger"
        @showOn="mouseenter focus"
        @hideOn="blur escapekey"
        @interactive={{true}}
        @animation="none"
        @showDuration={{0}}
        @hideDuration={{0}}
      >
        <button id="focus-show-inside" type="button">Inside</button>
      </AttachPopover>
    `);

    const popover = find('#focus-show-popover');
    await focus('#focus-show-trigger');
    await waitUntil(() => isVisible(popover));
    assert.true(isVisible(popover), 'opens on initial focus');

    await focus('#focus-show-inside');
    assert.strictEqual(document.activeElement.id, 'focus-show-inside', 'focus moves inside popover');

    await triggerKeyEvent(document, 'keydown', 'Escape');
    await waitUntil(() => isVisible(popover) === false);
    await settled();

    assert.strictEqual(
      document.activeElement.id,
      'focus-show-trigger',
      'Escape returns focus to the trigger'
    );
    assert.false(
      isVisible(popover),
      'returning focus on Escape does not immediately re-trigger showOn="focus"'
    );

    // Moving focus away and back re-opens normally
    await focus('#other-btn');
    await focus('#focus-show-trigger');
    await waitUntil(() => isVisible(popover));
    assert.true(isVisible(popover), 'subsequent user focus still opens the popover');
  });

  test('VirtualElement without contextElement safely skips ARIA binding', async function (assert) {
    this.set('virtualTarget', {
      getBoundingClientRect() {
        return {
          width: 40,
          height: 20,
          top: 50,
          bottom: 70,
          left: 80,
          right: 120,
          x: 80,
          y: 50,
        };
      },
    });

    await render(hbs`
      <AttachTooltip @id="virtual-tooltip" @target={{this.virtualTarget}} @isShown={{true}}>
        Virtual tooltip
      </AttachTooltip>
    `);

    assert.true(isVisible(find('#virtual-tooltip')), 'virtual tooltip opens without error');
  });

  test('VirtualElement with contextElement supports interactive safePolygon hover corridor', async function (assert) {
    this.set('middleware', [offset(20)]);

    await render(hbs`
      <style>
        #virtual-corridor-popover {
          width: 220px;
          height: 80px;
        }
      </style>
      <div id="virtual-host" style="position: fixed; top: 20px; left: 100px; width: 60px; height: 40px;">
        Host
      </div>
      <AttachPopover
        @id="virtual-corridor-popover"
        @target={{this.virtualTarget}}
        @middleware={{this.middleware}}
        @placement="bottom"
        @hideOn="mouseleave"
        @interactive={{true}}
        @animation="none"
        @isShown={{true}}
      >
        Virtual corridor content
      </AttachPopover>
    `);

    const host = find('#virtual-host');
    this.set('virtualTarget', {
      contextElement: host,
      getBoundingClientRect() {
        return host.getBoundingClientRect();
      },
    });
    await settled();

    const hostRect = host.getBoundingClientRect();
    const popover = find('#virtual-corridor-popover');
    assert.true(isVisible(popover), 'virtual popover starts visible');

    const exitX = (hostRect.left + hostRect.right) / 2;
    const exitY = hostRect.bottom;
    await triggerEvent(host, 'mouseleave', { clientX: exitX, clientY: exitY });

    // Point in diagonal gap between virtual target and bottom popover
    const popoverRect = popover.getBoundingClientRect();
    await triggerEvent(document, 'mousemove', {
      clientX: (exitX + popoverRect.right) / 2,
      clientY: (hostRect.bottom + popoverRect.top) / 2,
    });

    assert.true(isVisible(popover), 'virtual reference stays open in diagonal safePolygon corridor');

    await triggerEvent(document, 'mousemove', {
      clientX: popoverRect.right + 40,
      clientY: hostRect.bottom + 2,
    });

    assert.false(isVisible(popover), 'virtual reference closes when moving away from corridor');
  });

  test('smart tooltip ARIA binds aria-labelledby on nameless icon triggers and suppresses duplicate descriptions', async function (assert) {
    await render(hbs`
      <button id="icon-only-btn" type="button">
        <svg aria-hidden="true" viewBox="0 0 16 16"></svg>
      </button>
      <AttachTooltip @id="icon-only-tip" @target="#icon-only-btn" @showDuration={{0}} @hideDuration={{0}}>
        Close dialog
      </AttachTooltip>

      <button id="dup-label-btn" type="button" aria-label="Bold">
        <svg aria-hidden="true" viewBox="0 0 16 16"></svg>
      </button>
      <AttachTooltip @id="dup-label-tip" @target="#dup-label-btn" @showDuration={{0}} @hideDuration={{0}}>
        Bold
      </AttachTooltip>

      <button id="dup-text-btn" type="button">Save</button>
      <AttachTooltip @id="dup-text-tip" @target="#dup-text-btn" @showDuration={{0}} @hideDuration={{0}}>
        Save
      </AttachTooltip>
    `);

    const iconBtn = find('#icon-only-btn');
    const dupLabelBtn = find('#dup-label-btn');
    const dupTextBtn = find('#dup-text-btn');

    assert.dom(iconBtn).hasAttribute(
      'aria-labelledby',
      'icon-only-tip',
      'binds aria-labelledby upfront when trigger has no accessible name'
    );
    assert.dom(iconBtn).doesNotHaveAttribute('aria-describedby', 'does not also bind aria-describedby when labelledby is used');

    await focus(dupLabelBtn);
    assert.true(isVisible(find('#dup-label-tip')));
    assert.dom(dupLabelBtn).doesNotHaveAttribute('aria-describedby', 'skips aria-describedby when tooltip matches aria-label');
    assert.dom(dupLabelBtn).doesNotHaveAttribute('aria-labelledby', 'does not add aria-labelledby when aria-label exists');

    await focus(dupTextBtn);
    assert.true(isVisible(find('#dup-text-tip')));
    assert.dom(dupTextBtn).doesNotHaveAttribute('aria-describedby', 'skips aria-describedby when tooltip matches visible text');
  });

  test('WCAG 1.4.13 makes AttachTooltip and {{tooltip}} hoverable by default with @interactive={{false}} opt-out', async function (assert) {
    await render(hbs`
      <style>
        #hover-tip-btn, #optout-tip-btn {
          position: fixed;
          left: 100px;
          width: 80px;
          height: 30px;
        }
        #hover-tip-btn { top: 40px; }
        #optout-tip-btn { top: 140px; }
        #hover-tip, #optout-tip {
          width: 140px;
          height: 40px;
        }
      </style>
      <button id="hover-tip-btn" type="button">Default hoverable</button>
      <AttachTooltip @id="hover-tip" @target="#hover-tip-btn" @placement="bottom" @showDuration={{0}} @hideDuration={{0}}>
        Tooltip body
      </AttachTooltip>

      <button id="optout-tip-btn" type="button">Opt-out</button>
      <AttachTooltip @id="optout-tip" @target="#optout-tip-btn" @interactive={{false}} @showDuration={{0}} @hideDuration={{0}}>
        Non-interactive tooltip
      </AttachTooltip>

      <button id="pool-hover-btn" type="button" {{tooltip "Pooled hoverable" placement="bottom" showDuration=0 hideDuration=0}}>
        Pool trigger
      </button>
    `);

    const hoverBtn = find('#hover-tip-btn');
    const hoverTip = find('#hover-tip');

    await triggerEvent(hoverBtn, 'mouseenter');
    assert.true(isVisible(hoverTip), 'tooltip opens on mouseenter');

    const btnRect = hoverBtn.getBoundingClientRect();
    await triggerEvent(hoverBtn, 'mouseleave', {
      clientX: (btnRect.left + btnRect.right) / 2,
      clientY: btnRect.bottom,
    });
    assert.true(isVisible(hoverTip), 'hoverable tooltip stays open when pointer leaves trigger toward tooltip');

    await triggerEvent(hoverTip, 'mousemove');
    assert.true(isVisible(hoverTip), 'hoverable tooltip stays open while pointer is over tooltip body');

    await triggerEvent(document, 'mousemove', { clientX: 5, clientY: 5 });
    assert.false(isVisible(hoverTip), 'hoverable tooltip closes when pointer moves outside');

    const optOutBtn = find('#optout-tip-btn');
    const optOutTip = find('#optout-tip');
    await triggerEvent(optOutBtn, 'mouseenter');
    assert.true(isVisible(optOutTip));
    await triggerEvent(optOutBtn, 'mouseleave');
    assert.false(isVisible(optOutTip), '@interactive={{false}} opts out of hoverable persistence');

    const poolBtn = find('#pool-hover-btn');
    await triggerEvent(poolBtn, 'mouseenter');
    const poolTip = find('.ember-attacher:not(#hover-tip):not(#optout-tip)');
    assert.true(isVisible(poolTip), 'singleton {{tooltip}} opens on mouseenter');
    await triggerEvent(poolBtn, 'mouseleave');
    assert.true(isVisible(poolTip), 'singleton {{tooltip}} is hoverable by default');
    await triggerEvent(document, 'mousemove', { clientX: 5, clientY: 5 });
    assert.false(isVisible(poolTip), 'singleton {{tooltip}} closes once pointer leaves corridor');
  });
});
