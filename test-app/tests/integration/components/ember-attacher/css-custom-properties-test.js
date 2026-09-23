import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, render } from '@ember/test-helpers';

function cssVar(element, name) {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

module('Integration | CSS custom properties', function(hooks) {
  setupRenderingTest(hooks);

  test('tooltip look defaults match the current hex', async function(assert) {
    await render(hbs`
      <div>
        <AttachTooltip @id="token-tooltip" @animation="none" @arrow={{true}} @isShown={{true}}>
          tooltip text
        </AttachTooltip>
      </div>
    `);

    const inner = find('#token-tooltip > .ember-attacher-tooltip');
    const arrow = inner.querySelector('.ember-attacher-arrow');

    assert.strictEqual(cssVar(inner, '--ember-attacher-fill'), '#333');
    assert.strictEqual(cssVar(inner, '--ember-attacher-text'), '#fff');
    assert.strictEqual(cssVar(inner, '--ember-attacher-radius'), '4px');
    assert.strictEqual(cssVar(inner, '--ember-attacher-padding'), '0.5rem 1rem');
    assert.strictEqual(cssVar(inner, '--ember-attacher-shadow'), 'none');
    assert.strictEqual(cssVar(inner, '--ember-attacher-max-width'), '400px');
    assert.strictEqual(getComputedStyle(inner).backgroundColor, 'rgb(51, 51, 51)');
    assert.strictEqual(getComputedStyle(inner).color, 'rgb(255, 255, 255)');
    assert.strictEqual(getComputedStyle(inner).borderRadius, '4px');
    assert.strictEqual(getComputedStyle(inner).borderTopWidth, '0px');
    assert.strictEqual(getComputedStyle(arrow).backgroundColor, 'rgb(51, 51, 51)');
  });

  test('one fill override restyles body, arrow, and fill disc', async function(assert) {
    await render(hbs`
      <div>
        <AttachTooltip
          @id="override-tooltip"
          @animation="fill"
          @arrow={{true}}
          @isShown={{true}}
          @class="token-fill-override"
        >
          tooltip text
        </AttachTooltip>
      </div>
    `);

    const inner = find('#override-tooltip > .ember-attacher-tooltip');
    inner.style.setProperty('--ember-attacher-fill', 'rgb(10, 20, 30)');

    const arrow = inner.querySelector('.ember-attacher-arrow');
    const disc = inner.querySelector('div[x-circle]');

    assert.strictEqual(getComputedStyle(inner).backgroundColor, 'rgba(0, 0, 0, 0)', 'fill animation keeps the body transparent');
    assert.strictEqual(getComputedStyle(arrow).backgroundColor, 'rgb(10, 20, 30)');
    assert.strictEqual(getComputedStyle(disc).backgroundColor, 'rgb(10, 20, 30)');
  });

  test('AttachPopover does not get tooltip look unless ember-attacher-popover is opted in', async function(assert) {
    await render(hbs`
      <div>
        <AttachPopover @id="plain-popover" @animation="none" @isShown={{true}}>
          plain
        </AttachPopover>
        <AttachPopover
          @id="look-popover"
          @animation="none"
          @isShown={{true}}
          @class="ember-attacher-popover"
        >
          look
        </AttachPopover>
      </div>
    `);

    const plain = find('#plain-popover > .ember-attacher-none');
    const look = find('#look-popover > .ember-attacher-popover');

    assert.notStrictEqual(cssVar(plain, '--ember-attacher-fill'), '#333');
    assert.notStrictEqual(getComputedStyle(plain).backgroundColor, 'rgb(51, 51, 51)');
    assert.strictEqual(cssVar(look, '--ember-attacher-fill'), '#333');
    assert.strictEqual(getComputedStyle(look).backgroundColor, 'rgb(51, 51, 51)');
  });

  test('light theme reassigns the same public tokens', async function(assert) {
    await render(hbs`
      <div>
        <AttachTooltip
          @id="light-tooltip"
          @animation="none"
          @arrow={{true}}
          @isShown={{true}}
          @class="ember-attacher-light-theme"
        >
          light
        </AttachTooltip>
      </div>
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

  test('distance token defaults to 10px on .ember-attacher', async function(assert) {
    await render(hbs`
      <div>
        <AttachTooltip @id="distance-tooltip" @animation="none" @isShown={{true}}>
          tooltip text
        </AttachTooltip>
      </div>
    `);

    const floating = find('#distance-tooltip');

    assert.strictEqual(cssVar(floating, '--ember-attacher-distance'), '10px');
  });
});
