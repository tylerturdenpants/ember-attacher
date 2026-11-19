import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { modifier } from 'ember-modifier';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, find, triggerEvent, waitFor, clearRender } from '@ember/test-helpers';

module('Integration | Component | lazyRender', function (hooks) {
  setupRenderingTest(hooks);

  test('will lazily render the yield block when lazyRender is passed as true', async function (assert) {
    assert.expect(2);

    await render(hbs`
      <button id="toggle-show" type="button">
        Click me, captain!
      </button>
      <AttachPopover @id="attachment" @target="#toggle-show" @lazyRender={{true}}>
        <div id="should-not-be-present-until-clicked"></div>
      </AttachPopover>
    `);

    assert.dom('#should-not-be-present-until-clicked').doesNotExist('Has not initially rendered the yield block.');

    await click('#toggle-show');

    assert.dom('#should-not-be-present-until-clicked').exists('Has rendered the yield block.');
  });

  test('lazyRender hides on first mouseleave after first show', async function (assert) {
    assert.expect(4);

    await render(hbs`
      <div id="target">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#target"
        @showOn="mouseenter"
        @hideOn="mouseleave"
        @interactive={{false}}
        @lazyRender={{true}}
      >
        lazy tooltip
      </AttachPopover>
    `);

    assert.dom('#attachment').exists('Outer host element is mounted before first show.');
    assert.strictEqual(find('#attachment').children.length, 0, 'Inner content block is not rendered before first show.');

    await triggerEvent('#target', 'mouseenter');

    const attachment = await waitFor('#attachment');

    assert.true(isVisible(attachment), 'Shown after first mouseenter.');

    await triggerEvent('#target', 'mouseleave');

    assert.false(isVisible(attachment), 'Hidden after first mouseleave.');
  });

  test('clearRender after first paint of a lazy popover does not throw', async function (assert) {
    await render(hbs`
      <div id="target">Target</div>
      <AttachPopover @id="attachment" @target="#target" @lazyRender={{true}}>
        lazy tooltip
      </AttachPopover>
    `);

    assert.dom('#attachment').exists('Outer host element is mounted before first show.');
    assert.strictEqual(find('#attachment').children.length, 0, 'Inner content block is not rendered before first show.');

    await clearRender();

    assert.ok(true, 'destroyed without throwing after lazy first paint');
  });

  test('AttachTooltip defaults lazyRender to false while AttachPopover defaults lazyRender to true', async function (assert) {
    assert.expect(2);

    await render(hbs`
      <button id="toggle-tip" type="button">Tooltip target</button>
      <AttachTooltip @id="eager-tooltip" @target="#toggle-tip">
        <div id="eager-tooltip-body"></div>
      </AttachTooltip>

      <button id="toggle-show" type="button">
        Click me, captain!
      </button>
      <AttachPopover @id="attachment" @target="#toggle-show">
        <div id="should-not-be-present-until-clicked"></div>
      </AttachPopover>
    `);

    assert.dom('#eager-tooltip-body').exists('AttachTooltip eagerly renders yield block by default.');
    assert.dom('#should-not-be-present-until-clicked').doesNotExist('AttachPopover lazily renders yield block by default.');
  });

  test('runs ...attributes modifiers on mount with @lazyRender={{true}} and drives transition duration via CSSOM without inline style attributes', async function (assert) {
    let modifierInstalledElement = null;

    this.set(
      'trackMount',
      modifier((element) => {
        modifierInstalledElement = element;
      })
    );

    await render(hbs`
      <button id="target" type="button">
        Target
      </button>
      <AttachPopover
        @id="lazy-csp-attachment"
        @target="#target"
        @lazyRender={{true}}
        @showOn="click"
        @hideOn="click"
        @showDuration={{450}}
        @animation="fill"
        data-test-splatted="yes"
        {{this.trackMount}}
      >
        <span id="lazy-inner">Lazy inner body</span>
      </AttachPopover>
    `);

    const host = find('#lazy-csp-attachment');
    assert.ok(host, 'outer .ember-attacher host is mounted immediately');
    assert.strictEqual(modifierInstalledElement, host, '...attributes modifier ran on mount while @lazyRender={{true}}');
    assert.dom('#lazy-csp-attachment').hasAttribute('data-test-splatted', 'yes');
    assert.dom('#lazy-inner').doesNotExist('inner content is still lazy before first trigger');
    assert.strictEqual(host.getAttribute('style'), null, 'outer host has no inline style attribute on initial mount');

    await click('#target');

    assert.true(isVisible(host), 'attachment is shown after click');
    assert.dom('#lazy-inner').exists('inner content is rendered after trigger');

    const innerBox = host.querySelector('.ember-attacher-fill');
    const circle = host.querySelector('.ember-attacher-fill-circle');
    assert.strictEqual(innerBox.getAttribute('style'), null, 'inner animated container has no inline style attribute (strict CSP)');
    assert.strictEqual(circle.getAttribute('style'), null, '.ember-attacher-fill-circle has no inline style attribute (strict CSP)');
    assert.strictEqual(
      host.style.getPropertyValue('--ember-attacher-transition-duration'),
      '450ms',
      '--ember-attacher-transition-duration is set via CSSOM'
    );
    assert.strictEqual(
      getComputedStyle(innerBox).transitionDuration,
      '0.45s',
      'inner box consumes --ember-attacher-transition-duration in CSS'
    );
    assert.strictEqual(
      getComputedStyle(circle).transitionDuration,
      '0.36s',
      '.ember-attacher-fill-circle consumes 0.8x --ember-attacher-transition-duration in CSS'
    );
  });
});
