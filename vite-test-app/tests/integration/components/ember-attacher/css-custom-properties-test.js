import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, render } from '@ember/test-helpers';

function cssVar(element, name) {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

module('Integration | CSS custom properties', function (hooks) {
  setupRenderingTest(hooks);

  hooks.afterEach(function () {
    this.owner.resolveRegistration('config:environment').emberAttacher = {};
  });

  test('tooltip look defaults match the current hex', async function (assert) {
    await render(hbs`
      <button id="token-target" type="button">Target</button>
      <AttachTooltip @id="token-tooltip" @target="#token-target" @animation="none" @arrow={{true}} @isShown={{true}}>
        tooltip text
      </AttachTooltip>
    `);

    const inner = find('#token-tooltip > .ember-attacher-tooltip');
    const arrow = inner.querySelector('.ember-attacher-arrow');

    assert.strictEqual(cssVar(inner, '--ember-attacher-fill'), '#333');
    assert.strictEqual(cssVar(inner, '--ember-attacher-text'), '#fff');
    assert.strictEqual(cssVar(inner, '--ember-attacher-radius'), '4px');
    assert.strictEqual(
      cssVar(inner, '--ember-attacher-padding').replace('0.5rem', '.5rem'),
      '.5rem 1rem'
    );
    assert.strictEqual(cssVar(inner, '--ember-attacher-shadow'), 'none');
    assert.strictEqual(cssVar(inner, '--ember-attacher-max-width'), '400px');
    assert.strictEqual(getComputedStyle(inner).backgroundColor, 'rgb(51, 51, 51)');
    assert.strictEqual(getComputedStyle(inner).color, 'rgb(255, 255, 255)');
    assert.strictEqual(getComputedStyle(inner).borderRadius, '4px');
    assert.strictEqual(getComputedStyle(inner).borderTopWidth, '0px');
    assert.strictEqual(getComputedStyle(arrow).backgroundColor, 'rgb(51, 51, 51)');
  });

  test('one fill override restyles body, arrow, and fill disc', async function (assert) {
    await render(hbs`
      <style>
        .token-fill-override {
          --ember-attacher-fill: rgb(10, 20, 30);
        }
      </style>
      <button id="override-body-target" type="button">Body target</button>
      <AttachTooltip
        @id="override-body"
        @target="#override-body-target"
        @animation="none"
        @arrow={{true}}
        @isShown={{true}}
        @class="token-fill-override"
      >
        body and arrow
      </AttachTooltip>
      <button id="override-disc-target" type="button">Disc target</button>
      <AttachTooltip
        @id="override-disc"
        @target="#override-disc-target"
        @animation="fill"
        @arrow={{true}}
        @placement="bottom"
        @showDuration={{0}}
        @isShown={{true}}
        @class="token-fill-override"
      >
        fill disc
      </AttachTooltip>
    `);

    const bodyInner = find('#override-body > .ember-attacher-tooltip');
    const arrow = bodyInner.querySelector('.ember-attacher-arrow');
    const discInner = find('#override-disc > .ember-attacher-tooltip');
    const discBackdrop = discInner.querySelector('.ember-attacher-fill-backdrop');
    const discArrow = discInner.querySelector('.ember-attacher-arrow');
    const disc = discInner.querySelector('.ember-attacher-fill-circle');

    assert.strictEqual(getComputedStyle(bodyInner).backgroundColor, 'rgb(10, 20, 30)');
    assert.strictEqual(getComputedStyle(arrow).backgroundColor, 'rgb(10, 20, 30)');
    assert.strictEqual(getComputedStyle(discInner).backgroundColor, 'rgba(0, 0, 0, 0)', 'fill animation keeps the body transparent');
    assert.strictEqual(getComputedStyle(discInner).overflow, 'visible', 'fill animation keeps card overflow visible so arrows are not clipped');
    assert.strictEqual(getComputedStyle(discBackdrop).overflow, 'hidden', 'fill backdrop clips the circle to the card');
    assert.strictEqual(getComputedStyle(discArrow).backgroundColor, 'rgb(10, 20, 30)', 'fill + arrow renders matching arrow color');
    assert.ok(
      discArrow.getBoundingClientRect().top < discInner.getBoundingClientRect().top,
      'fill arrow protrudes unclipped past the top edge for bottom placement'
    );
    assert.strictEqual(getComputedStyle(disc).backgroundColor, 'rgb(10, 20, 30)');
  });

  test('dummy popover token overrides win over packaged defaults', async function (assert) {
    await render(hbs`
      <button id="dummy-popover-target" type="button">Dummy target</button>
      <AttachPopover
        @id="dummy-popover"
        @target="#dummy-popover-target"
        @animation="fill"
        @isShown={{true}}
        @class="ember-attacher-popover custom-popover-css"
      >
        dummy look
      </AttachPopover>
    `);

    const inner = find('#dummy-popover > .ember-attacher-popover');
    const disc = inner.querySelector('.ember-attacher-fill-circle');

    assert.strictEqual(cssVar(inner, '--ember-attacher-fill'), '#fff');
    assert.strictEqual(cssVar(inner, '--ember-attacher-text'), '#333');
    assert.strictEqual(getComputedStyle(inner).backgroundColor, 'rgba(0, 0, 0, 0)', 'fill animation keeps the body transparent');
    assert.strictEqual(getComputedStyle(disc).backgroundColor, 'rgb(255, 255, 255)');
    assert.strictEqual(getComputedStyle(inner).color, 'rgb(51, 51, 51)');
  });

  test('AttachPopover does not get tooltip look unless ember-attacher-popover is opted in', async function (assert) {
    await render(hbs`
      <button id="plain-popover-target" type="button">Plain</button>
      <AttachPopover @id="plain-popover" @target="#plain-popover-target" @animation="none" @isShown={{true}}>
        plain
      </AttachPopover>
      <button id="look-popover-target" type="button">Look</button>
      <AttachPopover
        @id="look-popover"
        @target="#look-popover-target"
        @animation="none"
        @isShown={{true}}
        @class="ember-attacher-popover"
      >
        look
      </AttachPopover>
    `);

    const plain = find('#plain-popover > .ember-attacher-none');
    const look = find('#look-popover > .ember-attacher-popover');

    assert.notStrictEqual(cssVar(plain, '--ember-attacher-fill'), '#333');
    assert.notStrictEqual(getComputedStyle(plain).backgroundColor, 'rgb(51, 51, 51)');
    assert.strictEqual(cssVar(look, '--ember-attacher-fill'), '#333');
    assert.strictEqual(getComputedStyle(look).backgroundColor, 'rgb(51, 51, 51)');
  });

  test('AttachPopover @arrow and fill-backdrop work with custom @class without .ember-attacher-popover', async function (assert) {
    await render(hbs`
      <style>
        .custom-arrow-popover {
          background-color: rgb(255, 255, 255);
          color: rgb(20, 20, 20);
          --ember-attacher-fill: rgb(255, 255, 255);
          --ember-attacher-border: rgb(0, 128, 0);
          --ember-attacher-border-width: 2px;
          --ember-attacher-arrow-size: 16px;
        }
        .white-no-token-popover {
          background-color: rgb(255, 255, 255);
          color: rgb(17, 17, 17);
        }
      </style>
      <button id="custom-arrow-target" type="button" style="margin: 100px;">Custom</button>
      <AttachPopover
        @id="custom-arrow-popover"
        @target="#custom-arrow-target"
        @arrow={{true}}
        @animation="none"
        @isShown={{true}}
        @class="custom-arrow-popover"
      >
        custom arrow
      </AttachPopover>

      <button id="white-fill-target" type="button" style="margin: 100px;">White</button>
      <AttachPopover
        @id="white-fill-popover"
        @target="#white-fill-target"
        @animation="fill"
        @isShown={{true}}
        @class="white-no-token-popover"
      >
        white fill
      </AttachPopover>
    `);

    const host = find('#custom-arrow-popover');
    const inner = host.querySelector('.custom-arrow-popover');
    const arrow = host.querySelector(':scope > div > .ember-attacher-arrow');
    const arrowRect = arrow.getBoundingClientRect();

    assert.dom(inner).doesNotHaveClass('ember-attacher-popover');
    assert.strictEqual(getComputedStyle(arrow).position, 'absolute');
    assert.strictEqual(getComputedStyle(arrow).backgroundColor, 'rgb(255, 255, 255)');
    assert.strictEqual(getComputedStyle(arrow, '::before').backgroundColor, 'rgb(0, 128, 0)');
    assert.ok(arrowRect.width > 20, 'arrow width scales from --ember-attacher-arrow-size without .ember-attacher-popover');
    assert.ok(arrowRect.height > 10, 'arrow height includes border collar without .ember-attacher-popover');

    const whiteCircle = find('#white-fill-popover .ember-attacher-fill-circle');
    assert.strictEqual(
      getComputedStyle(whiteCircle).backgroundColor,
      'rgba(0, 0, 0, 0)',
      'fill circle stays transparent instead of painting currentColor over custom popovers without --ember-attacher-fill'
    );
  });

  test('AttachPopover applies ENV.emberAttacher.popoverClass and popover.popoverClass', async function (assert) {
    this.owner.resolveRegistration('config:environment').emberAttacher = {
      popoverClass: 'env-popover-base',
      popover: {
        popoverClass: 'env-popover-specific',
      },
    };

    await render(hbs`
      <button id="env-popover-target" type="button">ENV target</button>
      <AttachPopover @id="env-popover" @target="#env-popover-target" @isShown={{true}} @class="caller-class">
        env popover
      </AttachPopover>
    `);

    const inner = find('#env-popover > div');
    assert.dom(inner).hasClass('env-popover-specific');
    assert.dom(inner).hasClass('caller-class');
  });

  test('light theme reassigns the same public tokens', async function (assert) {
    await render(hbs`
      <button id="light-tooltip-target" type="button">Light target</button>
      <AttachTooltip
        @id="light-tooltip"
        @target="#light-tooltip-target"
        @animation="none"
        @arrow={{true}}
        @isShown={{true}}
        @class="ember-attacher-light-theme"
      >
        light
      </AttachTooltip>
    `);

    const inner = find('#light-tooltip > .ember-attacher-tooltip');
    const arrow = inner.querySelector('.ember-attacher-arrow');

    assert.strictEqual(cssVar(inner, '--ember-attacher-fill'), '#f3f6f9');
    assert.strictEqual(cssVar(inner, '--ember-attacher-text'), '#203d5d');
    assert.strictEqual(cssVar(inner, '--ember-attacher-border'), '#ced2e2');
    assert.strictEqual(getComputedStyle(inner).backgroundColor, 'rgb(243, 246, 249)');
    assert.strictEqual(getComputedStyle(inner).color, 'rgb(32, 61, 93)');
    assert.strictEqual(getComputedStyle(inner).borderTopWidth, '1px');
    assert.strictEqual(getComputedStyle(arrow).backgroundColor, 'rgb(243, 246, 249)');
  });

  test('distance token defaults to 10px on .ember-attacher', async function (assert) {
    await render(hbs`
      <button id="distance-target" type="button">Distance target</button>
      <AttachTooltip @id="distance-tooltip" @target="#distance-target" @animation="none" @isShown={{true}}>
        tooltip text
      </AttachTooltip>
    `);

    const floating = find('#distance-tooltip');

    assert.strictEqual(cssVar(floating, '--ember-attacher-distance'), '10px');
  });

  test('border-width token synchronizes body and arrow borders', async function (assert) {
    await render(hbs`
      <style>
        .custom-border-tooltip {
          --ember-attacher-border: rgb(255, 0, 0);
          --ember-attacher-border-width: 2px;
        }
      </style>
      <button id="bordered-target" type="button">Bordered target</button>
      <AttachTooltip
        @id="bordered-tooltip"
        @target="#bordered-target"
        @animation="none"
        @arrow={{true}}
        @isShown={{true}}
        @class="custom-border-tooltip"
      >
        bordered
      </AttachTooltip>
    `);

    const inner = find('#bordered-tooltip > .ember-attacher-tooltip');
    const arrow = inner.querySelector('.ember-attacher-arrow');

    assert.strictEqual(getComputedStyle(inner).borderTopWidth, '2px');
    assert.strictEqual(getComputedStyle(inner).borderTopColor, 'rgb(255, 0, 0)');
    assert.strictEqual(getComputedStyle(arrow, '::before').backgroundColor, 'rgb(255, 0, 0)');
    assert.ok(parseFloat(getComputedStyle(arrow).height) > 8, 'bordered arrow height includes 2px collar');
  });

  test('arrow-size token scales the arrow dimensions', async function (assert) {
    await render(hbs`
      <style>
        .custom-arrow-tooltip {
          --ember-attacher-arrow-size: 16px;
        }
      </style>
      <button id="big-arrow-target" type="button">Big arrow target</button>
      <AttachTooltip
        @id="big-arrow-tooltip"
        @target="#big-arrow-target"
        @animation="none"
        @arrow={{true}}
        @isShown={{true}}
        @class="custom-arrow-tooltip"
      >
        big arrow
      </AttachTooltip>
    `);

    const inner = find('#big-arrow-tooltip > .ember-attacher-tooltip');
    const arrow = inner.querySelector('.ember-attacher-arrow');
    const rect = arrow.getBoundingClientRect();

    assert.ok(Math.abs(rect.width - 16 * Math.SQRT2) < 0.25, 'width scales with arrow-size diagonal (~22.6px)');
    assert.ok(Math.abs(rect.height - ((16 * Math.SQRT2) / 2 + 1)) < 0.25, 'height scales with half-diagonal + 1px seam overlap (~12.3px)');
  });

  test('arrow-width, arrow-height, and line-height tokens customize arrow dimensions and text', async function (assert) {
    await render(hbs`
      <style>
        .custom-rect-arrow-tooltip {
          --ember-attacher-arrow-width: 12px;
          --ember-attacher-arrow-height: 5px;
          --ember-attacher-line-height: 22px;
        }
      </style>
      <button id="rect-arrow-target" type="button" style="margin: 100px;">Rect arrow target</button>
      <AttachTooltip
        @id="rect-arrow-tooltip"
        @target="#rect-arrow-target"
        @placement="bottom"
        @animation="none"
        @arrow={{true}}
        @isShown={{true}}
        @class="custom-rect-arrow-tooltip"
      >
        rect arrow
      </AttachTooltip>
    `);

    const inner = find('#rect-arrow-tooltip > .ember-attacher-tooltip');
    const arrow = inner.querySelector('.ember-attacher-arrow');
    const rect = arrow.getBoundingClientRect();

    assert.strictEqual(getComputedStyle(arrow).transform, 'none', 'renders unrotated clip-path triangle without skew');
    assert.strictEqual(Math.round(rect.width), 12);
    assert.strictEqual(Math.round(rect.height), 6, 'includes 1px inner edge overlap');
    assert.strictEqual(getComputedStyle(arrow).top, '-5px', 'bottom placement protrudes by exact arrow-height');
    assert.strictEqual(getComputedStyle(inner).lineHeight, '22px');
  });

  test('z-index token applies to .ember-attacher', async function (assert) {
    await render(hbs`
      <style>
        .custom-z-index {
          --ember-attacher-z-index: 12000;
        }
      </style>
      <div class="custom-z-index">
        <button id="z-index-target" type="button">Z-index target</button>
        <AttachTooltip
          @id="z-index-tooltip"
          @target="#z-index-target"
          @animation="none"
          @isShown={{true}}
          @renderInPlace={{true}}
        >
          high z-index
        </AttachTooltip>
      </div>
    `);

    const floating = find('#z-index-tooltip');
    assert.strictEqual(getComputedStyle(floating).zIndex, '12000');
  });
});
