import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, find, settled, waitFor } from '@ember/test-helpers';

module('Integration | Component | isShown', function(hooks) {
  setupRenderingTest(hooks);

  test('isShown works with showOn/hideOn set to "click"', async function(assert) {
    assert.expect(3);

    await render(hbs`
      <button id="toggle-show">
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn='click'
                          isShown=true
                          showOn='click'}}
          isShown w/ hideOn/ShowOn of 'click'
        {{/attach-popover}}
      </button>
    `);

    const attachment = find('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await click('#toggle-show');

    assert.equal(isVisible(attachment), false, 'Now hidden');

    await click('#toggle-show');

    assert.equal(isVisible(attachment), true, 'Shown again after click');
  });

  test('isShown works with showOn/hideOn set to `null`', async function(assert) {
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
      <button id="open" {{on 'click' this.openPopover}}>
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn=this.hideOn
                          isShown=this.isShown
                          showOn=this.showOn}}
          isShown w/ hideOn/ShowOn of 'none'

          <button id="close" {{on 'click' this.closePopover}}>
            Close
          </button>

        {{/attach-popover}}
      </button>
    `);

    const attachment = await waitFor('#attachment');

    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#open');

    assert.equal(isVisible(attachment), true, 'Now shown');

    await click('#close');

    assert.equal(isVisible(attachment), false, 'Hidden again');
  });

  test('isShown works with showOn/hideOn set to `null` with lazyRender', async function(assert) {
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
      <button id="open" {{on 'click' this.openPopover}}>
        Click me, captain!

        {{#attach-popover id='attachment'
                          hideOn=this.hideOn
                          isShown=this.isShown
                          lazyRender=true
                          showOn=this.showOn}}
          isShown w/ hideOn/ShowOn of 'none'

          <button id="close" {{on 'click' this.closePopover}}>
            Close
          </button>

        {{/attach-popover}}
      </button>
    `);

    assert.equal(find('#attachment'), undefined, 'Not present in DOM');

    await click('#open');

    const attachment = await waitFor('#attachment');

    await settled();

    assert.equal(isVisible(attachment), true, 'Now shown');

    await click('#close');

    assert.equal(isVisible(attachment), false, 'Hidden again');
  });

  test('nested attachers open and close as expected', async function(assert) {
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
      parentIsShown: false
    });

    await render(hbs`
      <button id="openParent" {{on 'click' this.openParentPopover}}>
        Open parent

        {{#attach-popover hideOn=this.hideOn
                          id='parent'
                          isShown=this.parentIsShown
                          showOn=this.showOn
                          interactive=true}}
          <button id="openChild" {{on 'click' this.openChildPopover}}>
            Open child

            {{#attach-popover hideDuration=0
                              hideOn='none'
                              id='child'
                              isShown=this.childIsShown
                              showOn='none'}}
              <button id="closeChild" {{on 'click' this.closeChildPopover}}>
                Close child
              </button>
            {{/attach-popover}}
          </button>
        {{/attach-popover}}
      </button>
    `);

    const childAttacher = find('#child');
    const parentAttacher = find('#parent');

    assert.equal(getComputedStyle(parentAttacher).display, 'none', 'parent initially hidden');
    assert.equal(getComputedStyle(childAttacher).display, 'none', 'child initially hidden');

    await click('#openParent');

    assert.equal(getComputedStyle(parentAttacher).display, 'block', 'parent shown');

    assert.equal(getComputedStyle(childAttacher).display, 'none', 'child still hidden');

    await click(parentAttacher.querySelector('#openChild'));

    assert.equal(getComputedStyle(childAttacher).display, 'block', 'child shown');

    await click('#closeChild');

    assert.equal(getComputedStyle(parentAttacher).display, 'block', 'parent still shown');
    assert.equal(getComputedStyle(childAttacher).display, 'none', 'child hidden');
  });
});
