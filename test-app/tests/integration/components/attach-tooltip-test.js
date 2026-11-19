import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';
import { find, focus, render, settled, triggerEvent } from '@ember/test-helpers';
import { module, test } from 'qunit';

module('Integration | Component | attach tooltip', function (hooks) {
  setupRenderingTest(hooks);

  hooks.afterEach(function () {
    this.owner.resolveRegistration('config:environment').emberAttacher = {};
  });

  test('uses the correct aria-role', async function (assert) {
    await render(hbs`
      <div id="role-target-1">Target 1</div>
      <AttachTooltip @id="tooltip" @target="#role-target-1">
        tooltip text
      </AttachTooltip>

      <div id="role-target-2">Target 2</div>
      <AttachTooltip @id="other-tooltip" @target="#role-target-2" @ariaRole="testing">
        tooltip text
      </AttachTooltip>
    `);

    assert.dom('#tooltip').hasAttribute('role', 'tooltip', 'has default aria-role');
    assert.dom('#other-tooltip').hasAttribute('role', 'testing', 'has user-supplied aria-role');
  });

  test('has the default classes', async function (assert) {
    await render(hbs`
      <div id="class-target">Target 1</div>
      <AttachTooltip @id="tooltip-with-class" @target="#class-target" @class="some-class">
        tooltip text
      </AttachTooltip>

      <div id="other-target">Target 2</div>
      <AttachTooltip @id="tooltip-with-no-class" @target="#other-target">
        tooltip text
      </AttachTooltip>
    `);

    const tooltipWithClass = find('#tooltip-with-class > .ember-attacher-tooltip');
    assert.contains(
      tooltipWithClass.className.split(' '),
      'ember-attacher-floating ember-attacher-tooltip some-class'.split(' '),
      'it adds the default classes to tooltips with a class'
    );

    const tooltipWithNoClass = find('#tooltip-with-no-class > .ember-attacher-tooltip');
    assert.contains(
      tooltipWithNoClass.className.split(' '),
      'ember-attacher-floating ember-attacher-tooltip'.split(' '),
      'it adds the defaults classes to tooltips with no class'
    );
  });

  test('uses the user-supplied default tooltip class', async function (assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      tooltipClass: 'different-default',
    };

    await render(hbs`
      <div id="target">Target</div>
      <AttachTooltip @id="attachment" @target="#target" @class="some-class">
        tooltip text
      </AttachTooltip>
    `);
    const tooltip = find('#attachment > .different-default');

    assert.contains(
      tooltip.className.split(' '),
      ['different-default', 'some-class'],
      'it adds the user-supplied default classes'
    );
  });

  test('uses the user-supplied default tooltip class - separate config', async function (assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      tooltip: {
        tooltipClass: 'separate-default',
      },
    };

    await render(hbs`
      <div id="target">Target</div>
      <AttachTooltip @id="attachment" @target="#target" @class="some-class">
        tooltip text
      </AttachTooltip>
    `);

    const tooltip = find('#attachment > .separate-default');

    assert.contains(
      tooltip.className.split(' '),
      ['separate-default', 'some-class'],
      'it adds the user-supplied default classes'
    );
  });

  test('drives transition duration via CSSOM without inline style attributes (strict CSP)', async function (assert) {
    await render(hbs`
      <div id="csp-target-default">Default</div>
      <AttachTooltip @id="tooltip-with-no-style" @target="#csp-target-default">
        tooltip text
      </AttachTooltip>

      <div id="csp-target-duration">Custom duration</div>
      <AttachTooltip @id="tooltip-with-duration" @target="#csp-target-duration" @showDuration={{250}} @isShown={{true}}>
        timed tooltip text
      </AttachTooltip>
    `);

    const tooltipWithNoStyle = find('#tooltip-with-no-style > .ember-attacher-tooltip');

    assert.strictEqual(
      tooltipWithNoStyle.getAttribute('style'),
      null,
      'strict CSP: does not emit an HTML style attribute on inner tooltip container'
    );

    assert.strictEqual(
      getComputedStyle(tooltipWithNoStyle).transitionDuration,
      '0s',
      'it applies the default 0ms transition duration to tooltips'
    );

    const tooltipWithDuration = find('#tooltip-with-duration > .ember-attacher-tooltip');
    assert.strictEqual(
      tooltipWithDuration.getAttribute('style'),
      null,
      'strict CSP: inner container has no inline style attribute even with custom showDuration'
    );
    assert.strictEqual(
      getComputedStyle(tooltipWithDuration).transitionDuration,
      '0.25s',
      'applies custom showDuration via --ember-attacher-transition-duration CSS token'
    );
  });

  test('adds open-only token-safe aria-describedby to the target', async function (assert) {
    this.set('showTooltip', true);

    await render(hbs`
      <span id="hint">Persistent hint</span>
      <button id="target" type="button" aria-describedby="hint">
        Target
      </button>
      {{#if this.showTooltip}}
        <AttachTooltip
          @id="attachment"
          @target="#target"
          @showOn="focus"
          @hideOn="blur"
        >
          tooltip text
        </AttachTooltip>
      {{/if}}

      <button id="other-target" type="button">
        Other
      </button>
      <AttachTooltip @target="#other-target" @class="tooltip-with-no-initial-id" @showOn="focus" @hideOn="blur">
        tooltip text
      </AttachTooltip>
    `);

    const target = find('#target');
    const tooltip = find('#attachment');

    assert.strictEqual(
      target.getAttribute('aria-describedby'),
      'hint',
      'preserves existing aria-describedby and does not add tooltip id while closed'
    );

    await focus('#target');
    assert.strictEqual(
      target.getAttribute('aria-describedby'),
      `hint ${tooltip.id}`,
      'appends tooltip ID to aria-describedby while open without clobbering existing tokens'
    );

    this.set('showTooltip', false);
    await settled();

    assert.strictEqual(
      target.getAttribute('aria-describedby'),
      'hint',
      'removes only the tooltip token on destruction while preserving pre-existing tokens'
    );

    const tooltipWithNoInitialId = find('.tooltip-with-no-initial-id').parentNode;
    assert.ok(tooltipWithNoInitialId.id, 'tooltip gets generated ID when no ID is supplied');
    assert.dom('#other-target').doesNotHaveAttribute(
      'aria-describedby',
      'other target has no aria-describedby while closed'
    );

    await focus('#other-target');
    assert.dom('#other-target').hasAttribute(
      'aria-describedby',
      tooltipWithNoInitialId.id,
      "other target receives aria-describedby with tooltip's generated ID while open"
    );

    await triggerEvent('#other-target', 'blur');
    assert.dom('#other-target').doesNotHaveAttribute(
      'aria-describedby',
      'removes aria-describedby when tooltip hides'
    );
  });
});
