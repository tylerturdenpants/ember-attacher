import QUnit, { module, test } from 'qunit';
import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';
import { render, find, settled, waitUntil } from '@ember/test-helpers';
import { htmlSafe } from '@ember/template';
import { isVisible } from 'ember-attacher';

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

  test('T7: token-safe open-only aria-describedby on the target', async function(assert) {
    this.set('showTooltip', true);
    this.set('isShown', false);

    await render(hbs`
      <div id="target" aria-describedby="preexisting">
        {{#if this.showTooltip}}
          <AttachTooltip
            @id="attachment"
            @isShown={{this.isShown}}
            @showOn={{null}}
            @hideOn={{null}}
            @hideDuration={{0}}
            @showDuration={{0}}
            @animation="none"
          >
            tooltip text
          </AttachTooltip>
        {{/if}}
      </div>

      <button id="other-target" type="button">
        <AttachTooltip
          @class="tooltip-with-no-initial-id"
          @isShown={{true}}
          @showOn={{null}}
          @hideOn={{null}}
          @hideDuration={{0}}
          @showDuration={{0}}
          @animation="none"
        >
          tooltip text
        </AttachTooltip>
      </button>
    `);

    const target = find('#target');
    const tooltip = find('#attachment');

    assert.strictEqual(
      target.getAttribute('aria-describedby'),
      'preexisting',
      'closed tooltip does not add aria-describedby yet'
    );

    this.set('isShown', true);
    await waitUntil(() => isVisible(tooltip));

    assert.strictEqual(
      target.getAttribute('aria-describedby'),
      `preexisting ${tooltip.id}`,
      'open tooltip appends its id while preserving preexisting tokens'
    );

    this.set('isShown', false);
    await waitUntil(() => !isVisible(tooltip));

    assert.strictEqual(
      target.getAttribute('aria-describedby'),
      'preexisting',
      'closing removes only the tooltip id token'
    );

    this.set('isShown', true);
    await waitUntil(() => isVisible(tooltip));
    this.set('showTooltip', false);
    await settled();

    assert.strictEqual(
      target.getAttribute('aria-describedby'),
      'preexisting',
      'destruction removes the tooltip id token'
    );

    const tooltipWithNoInitialId = find('.tooltip-with-no-initial-id').parentNode;

    assert.ok(tooltipWithNoInitialId.id, 'tooltip gets generated ID when no ID is supplied');
    assert.dom('#other-target').hasAttribute(
      'aria-describedby',
      tooltipWithNoInitialId.id,
      "open tooltip target receives aria-describedby with tooltip's generated ID"
    );
  });

  test('T7: forwards @onInitializeAttacher / @onWillDestroy after moving ARIA into BasicAttacher', async function(assert) {
    assert.expect(2);

    this.set('initialized', false);
    this.set('destroyed', false);
    this.set('showTooltip', true);
    this.onInitializeAttacher = () => {
      this.set('initialized', true);
    };
    this.onWillDestroy = () => {
      this.set('destroyed', true);
    };

    await render(hbs`
      <div id="hook-target">
        {{#if this.showTooltip}}
          <AttachTooltip
            @id="hook-tooltip"
            @onInitializeAttacher={{this.onInitializeAttacher}}
            @onWillDestroy={{this.onWillDestroy}}
            @isShown={{true}}
            @showOn={{null}}
            @hideOn={{null}}
            @animation="none"
          >
            tooltip text
          </AttachTooltip>
        {{/if}}
      </div>
    `);

    assert.true(this.initialized, '@onInitializeAttacher is forwarded');

    this.set('showTooltip', false);
    await settled();

    assert.true(this.destroyed, '@onWillDestroy is forwarded');
  });

  test('T7: VirtualElement without contextElement skips aria-describedby', async function(assert) {
    this.virtualTarget = {
      getBoundingClientRect() {
        return {
          x: 10,
          y: 10,
          top: 10,
          left: 10,
          bottom: 30,
          right: 40,
          width: 30,
          height: 20,
        };
      },
    };

    await render(hbs`
      <div id="unrelated"></div>
      <AttachTooltip
        @id="virtual-tooltip"
        @explicitTarget={{this.virtualTarget}}
        @isShown={{true}}
        @showOn={{null}}
        @hideOn={{null}}
        @hideDuration={{0}}
        @showDuration={{0}}
        @animation="none"
      >
        virtual tooltip
      </AttachTooltip>
    `);

    await waitUntil(() => isVisible(find('#virtual-tooltip')));

    assert.dom('#unrelated').doesNotHaveAttribute(
      'aria-describedby',
      'no listener target means no aria-describedby mutation'
    );
  });
});
