import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { modifier } from 'ember-modifier';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

import { render, click, find, triggerEvent, waitFor, clearRender } from '@ember/test-helpers';

module('Integration | Component | lazyRender', function(hooks) {
  setupRenderingTest(hooks);

  test('will lazily render the yield block when lazyRender is passed as true', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <button id="toggle-show">
        Click me, captain!

        {{#attach-popover id='attachment' lazyRender=true}}
          <div id='should-not-be-present-until-clicked'></div>
        {{/attach-popover}}
      </button>
    `);

    assert.dom('#should-not-be-present-until-clicked').doesNotExist('Has not initially rendered the yield block.');

    await click('#toggle-show');

    assert.dom('#should-not-be-present-until-clicked').exists('Has rendered the yield block.');
  });

  test('lazyRender hides on first mouseleave after first show', async function(assert) {
    assert.expect(4);

    await render(hbs`
      <div id="target">
        {{#attach-popover id='attachment' lazyRender=true}}
          lazy tooltip
        {{/attach-popover}}
      </div>
    `);

    assert.dom('#attachment').exists('Outer host element is mounted before first show.');
    assert.strictEqual(find('#attachment').children.length, 0, 'Inner content block is not rendered before first show.');

    await triggerEvent('#target', 'mouseenter');

    const attachment = await waitFor('#attachment');

    assert.equal(isVisible(attachment), true, 'Shown after first mouseenter.');

    await triggerEvent('#target', 'mouseleave');

    assert.equal(isVisible(attachment), false, 'Hidden after first mouseleave.');
  });

  test('clearRender after first paint of a lazy popover does not throw', async function(assert) {
    await render(hbs`
      <div id="target">
        {{#attach-popover id='attachment' lazyRender=true}}
          lazy tooltip
        {{/attach-popover}}
      </div>
    `);

    assert.dom('#attachment').exists('Outer host element is mounted before first show.');
    assert.strictEqual(find('#attachment').children.length, 0, 'Inner content block is not rendered before first show.');

    await clearRender();

    assert.ok(true, 'destroyed without throwing after lazy first paint');
  });

  test('lazily render will default to false which will eager render the yeild block', async function(assert) {
    assert.expect(1);

    await render(hbs`
      <button id="toggle-show">
        Click me, captain!

        {{#attach-popover id='attachment'}}
          <div id='should-not-be-present-until-clicked'></div>
        {{/attach-popover}}
      </button>
    `);

    assert.dom('#should-not-be-present-until-clicked').exists('Has initially rendered the yield block.');
  });

  test('T2: runs ...attributes modifiers on mount with @lazyRender={{true}} and drives transition duration via CSSOM without inline style attributes', async function(assert) {
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
        <AttachPopover
          @id="lazy-csp-attachment"
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
      </button>
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
    const circle = host.querySelector('div[x-circle]');
    assert.strictEqual(innerBox.getAttribute('style'), null, 'inner animated container has no inline style attribute (strict CSP)');
    assert.strictEqual(circle.getAttribute('style'), null, 'x-circle has no inline style attribute (strict CSP)');
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
      'x-circle consumes 0.8x --ember-attacher-transition-duration in CSS'
    );
  });
});
