import QUnit, { module, test } from 'qunit';
import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';
import { find, focus, render, settled, triggerEvent } from '@ember/test-helpers';
import { htmlSafe } from '@ember/template';

QUnit.assert.contains = function(actual, expected, message) {
  this.pushResult({
    result: expected.every((elem) => actual.includes(elem)),
    actual,
    expected,
    message
  });
};

module('Integration | Component | attach tooltip', function(hooks) {
  setupRenderingTest(hooks);

  hooks.afterEach(function() {
    this.owner.resolveRegistration('config:environment').emberAttacher = {};
  });

  test('uses the correct aria-role', async function(assert) {
    await render(hbs`
      <div>
        {{#attach-tooltip id='tooltip'}}
          tooltip text
        {{/attach-tooltip}}
      </div>

      <div>
        {{#attach-tooltip id='other-tooltip' ariaRole='testing'}}
          tooltip text
        {{/attach-tooltip}}
      </div>
    `);

    assert.dom('#tooltip').hasAttribute('role', 'tooltip', 'has default aria-role');

    assert.dom('#other-tooltip').hasAttribute('role', 'testing', 'has user-supplied aria-role');
  });

  test('has the default classes', async function(assert) {
    await render(hbs`
      <div>
        {{#attach-tooltip id='tooltip-with-class' class='some-class'}}
          tooltip text
        {{/attach-tooltip}}
      </div>

      <div id="other-target">
        {{#attach-tooltip id='tooltip-with-no-class'}}
          tooltip text
        {{/attach-tooltip}}
      </div>
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

  test('uses the user-supplied default tooltip class', async function(assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      tooltipClass: 'different-default'
    };

    await render(hbs`
      <div id="target">
        {{#attach-tooltip id='attachment' class='some-class'}}
          tooltip text
        {{/attach-tooltip}}
      </div>
    `);
    const tooltip = find('#attachment > .different-default');

    assert.contains(
      tooltip.className.split(' '),
      ['different-default', 'some-class'],
      'it adds the user-supplied default classes'
    );
  });

  test('uses the user-supplied default tooltip class - separate config', async function(assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      tooltip: {
        tooltipClass: 'separate-default'
      }
    };

    await render(hbs`
      <div id="target">
        <AttachTooltip @id='attachment' @class='some-class'>
          tooltip text
        </AttachTooltip>
      </div>
    `);

    const tooltip = find('#attachment > .separate-default');

    assert.contains(
      tooltip.className.split(' '),
      ['separate-default', 'some-class'],
      'it adds the user-supplied default classes'
    );
  });

  test('uses the user-supplied default tooltip class - separate config', async function(assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      tooltip: {
        tooltipClass: 'separate-default'
      }
    };

    await render(hbs`
      <div id="target">
        {{#attach-tooltip id='attachment' class='some-class'}}
          tooltip text
        {{/attach-tooltip}}
      </div>
    `);

    const tooltip = find('#attachment > .separate-default');

    assert.contains(
      tooltip.className.split(' '),
      ['separate-default', 'some-class'],
      'it adds the user-supplied default classes'
    );
  });

  test('uses style passed in by user', async function(assert) {
    this.set('style', htmlSafe('cursor: pointer;'));
    await render(hbs`
      <div>
        {{#attach-tooltip id='tooltip-with-style' style=this.style}}
          tooltip text
        {{/attach-tooltip}}
      </div>

      <div>
        {{#attach-tooltip id='tooltip-with-no-style'}}
          tooltip text
        {{/attach-tooltip}}
      </div>
    `);

    const tooltipWithStyle = find('#tooltip-with-style > .ember-attacher-tooltip');

    assert.equal(
      tooltipWithStyle.style.getPropertyValue('cursor'),
      'pointer',
      'it adds the user style to tooltips'
    );

    assert.strictEqual(
      getComputedStyle(tooltipWithStyle).transitionDuration,
      '0s',
      'it applies the default 0ms transition duration via CSS token'
    );

    const tooltipWithNoStyle = find('#tooltip-with-no-style > .ember-attacher-tooltip');

    assert.strictEqual(
      tooltipWithNoStyle.getAttribute('style'),
      null,
      'strict CSP: does not emit an HTML style attribute when @style is omitted'
    );

    assert.strictEqual(
      getComputedStyle(tooltipWithNoStyle).transitionDuration,
      '0s',
      'it applies the default 0ms transition duration to tooltips with no user style'
    );
  });

  test('adds open-only token-safe aria-describedby to the target and forwards lifecycle hooks', async function(assert) {
    const initialized = [];
    const destroyed = [];
    this.set('showTooltip', true);
    this.set('onInitializeAttacher', (target, id) => initialized.push({ target, id }));
    this.set('onWillDestroy', (target, id) => destroyed.push({ target, id }));

    await render(hbs`
      <span id="hint">Persistent hint</span>
      <button id="target" type="button" aria-describedby="hint">
        Target
        {{#if this.showTooltip}}
          <AttachTooltip
            @id="attachment"
            @showOn="focus"
            @hideOn="blur"
            @onInitializeAttacher={{this.onInitializeAttacher}}
            @onWillDestroy={{this.onWillDestroy}}
          >
            tooltip text
          </AttachTooltip>
        {{/if}}
      </button>

      <button id="other-target" type="button">
        Other
        <AttachTooltip @class="tooltip-with-no-initial-id" @showOn="focus" @hideOn="blur">
          tooltip text
        </AttachTooltip>
      </button>
    `);

    const target = find('#target');
    const tooltip = find('#attachment');

    assert.strictEqual(initialized.length, 1, 'forwards @onInitializeAttacher from AttachTooltip');
    assert.strictEqual(initialized[0].target, target, 'passes target element to @onInitializeAttacher');
    assert.strictEqual(initialized[0].id, 'attachment', 'passes tooltip id to @onInitializeAttacher');

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
    assert.strictEqual(destroyed.length, 1, 'forwards @onWillDestroy from AttachTooltip');
    assert.strictEqual(destroyed[0].id, 'attachment', 'passes destroyed tooltip id to @onWillDestroy');

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
