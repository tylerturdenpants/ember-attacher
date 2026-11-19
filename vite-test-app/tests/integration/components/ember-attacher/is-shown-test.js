import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, find, settled, waitFor } from '@ember/test-helpers';

module('Integration | Component | isShown', function (hooks) {
  setupRenderingTest(hooks);

  test('isShown works with showOn/hideOn set to "click"', async function (assert) {
    assert.expect(3);

    await render(hbs`
      <button id="toggle-show" type="button">
        Click me, captain!
      </button>
      <AttachPopover
        @id="attachment"
        @target="#toggle-show"
        @hideOn="click"
        @isShown={{true}}
        @showOn="click"
      >
        isShown w/ hideOn/ShowOn of 'click'
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    await click('#toggle-show');

    assert.false(isVisible(attachment), 'Now hidden');

    await click('#toggle-show');

    assert.true(isVisible(attachment), 'Shown again after click');
  });

  test('isShown works with showOn/hideOn set to `null`', async function (assert) {
    assert.expect(3);

    this.closePopover = () => {
      this.set('isShown', false);
    };

    this.openPopover = () => {
      this.set('isShown', true);
    };

    this.set('isShown', false);
    this.set('hideOn', null);
    this.set('showOn', null);

    await render(hbs`
      <button id="open" type="button" {{on "click" this.openPopover}}>
        Click me, captain!
      </button>
      <AttachPopover
        @id="attachment"
        @target="#open"
        @hideOn={{this.hideOn}}
        @isShown={{this.isShown}}
        @showOn={{this.showOn}}
      >
        isShown w/ hideOn/ShowOn of 'none'

        <button id="close" type="button" {{on "click" this.closePopover}}>
          Close
        </button>
      </AttachPopover>
    `);

    const attachment = await waitFor('#attachment');

    assert.false(isVisible(attachment), 'Initially hidden');

    await click('#open');

    assert.true(isVisible(attachment), 'Now shown');

    await click('#close');

    assert.false(isVisible(attachment), 'Hidden again');
  });

  test('isShown works with showOn/hideOn set to `null` with lazyRender', async function (assert) {
    assert.expect(3);

    this.closePopover = () => {
      this.set('isShown', false);
    };

    this.openPopover = () => {
      this.set('isShown', true);
    };

    this.set('isShown', false);
    this.set('hideOn', null);
    this.set('showOn', null);

    await render(hbs`
      <button id="open" type="button" {{on "click" this.openPopover}}>
        Click me, captain!
      </button>
      <AttachPopover
        @id="attachment"
        @target="#open"
        @hideOn={{this.hideOn}}
        @isShown={{this.isShown}}
        @lazyRender={{true}}
        @showOn={{this.showOn}}
      >
        isShown w/ hideOn/ShowOn of 'none'

        <button id="close" type="button" {{on "click" this.closePopover}}>
          Close
        </button>
      </AttachPopover>
    `);

    assert.strictEqual(find('#close'), null, 'Inner content not present in DOM before first show');

    await click('#open');

    const attachment = await waitFor('#attachment');

    await settled();

    assert.true(isVisible(attachment), 'Now shown');

    await click('#close');

    assert.false(isVisible(attachment), 'Hidden again');
  });

  test('nested attachers open and close as expected', async function (assert) {
    assert.expect(7);

    this.openParentPopover = () => {
      this.set('parentIsShown', true);
    };

    this.closeChildPopover = () => {
      this.set('childIsShown', false);
    };

    this.openChildPopover = () => {
      this.set('childIsShown', true);
    };

    this.set('hideOn', null);
    this.set('showOn', null);

    this.setProperties({
      childIsShown: false,
      parentIsShown: false,
    });

    await render(hbs`
      <button id="openParent" type="button" {{on "click" this.openParentPopover}}>
        Open parent
      </button>
      <AttachPopover
        @hideOn={{this.hideOn}}
        @id="parent"
        @target="#openParent"
        @isShown={{this.parentIsShown}}
        @showOn={{this.showOn}}
        @interactive={{true}}
      >
        <button id="openChild" type="button" {{on "click" this.openChildPopover}}>
          Open child
        </button>
        <AttachPopover
          @hideDuration={{0}}
          @hideOn="none"
          @id="child"
          @target="#openChild"
          @isShown={{this.childIsShown}}
          @showOn="none"
        >
          <button id="closeChild" type="button" {{on "click" this.closeChildPopover}}>
            Close child
          </button>
        </AttachPopover>
      </AttachPopover>
    `);

    const childAttacher = find('#child');
    const parentAttacher = find('#parent');

    assert.strictEqual(getComputedStyle(parentAttacher).display, 'none', 'parent initially hidden');
    assert.strictEqual(getComputedStyle(childAttacher).display, 'none', 'child initially hidden');

    await click('#openParent');

    assert.strictEqual(getComputedStyle(parentAttacher).display, 'block', 'parent shown');

    assert.strictEqual(getComputedStyle(childAttacher).display, 'none', 'child still hidden');

    await click(parentAttacher.querySelector('#openChild'));

    assert.strictEqual(getComputedStyle(childAttacher).display, 'block', 'child shown');

    await click('#closeChild');

    assert.strictEqual(getComputedStyle(parentAttacher).display, 'block', 'parent still shown');
    assert.strictEqual(getComputedStyle(childAttacher).display, 'none', 'child hidden');
  });
});
