import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, find, focus, render, settled } from '@ember/test-helpers';
import { isVisible } from 'ember-attacher';

module('Integration | Component | explicit target', function (hooks) {
  setupRenderingTest(hooks);

  test('it processes the explicit target change', async function (assert) {
    this.set('explicitTarget', null);

    await render(hbs`
      <div>
        <button id="new-target" />
        <button id="old-target">
          <AttachTooltip @id="attachment" @explicitTarget={{this.explicitTarget}} @showOn="focus">
            Floating element
          </AttachTooltip>
        </button>
      </div>
    `);

    assert.dom('#old-target').hasAria('describedby', 'attachment');
    await focus('#old-target');
    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), true, 'Is shown on focus');
    await focus('#new-target');
    assert.equal(isVisible(attachment), false, 'Hides after focusing on another target');
    this.set('explicitTarget', find('#new-target'));
    await settled();
    await focus('#old-target');
    assert.equal(isVisible(attachment), false, 'Not showing on old target focus');
    await focus('#new-target');
    assert.equal(isVisible(attachment), true, 'Is shown on new target focus');
    assert.dom('#old-target').doesNotHaveAria('describedby');
    assert.dom('#new-target').hasAria('describedby', 'attachment');
  });

  test('positions against a Floating UI virtual reference', async function (assert) {
    this.set('virtualTarget', {
      getBoundingClientRect() {
        return {
          x: 40,
          y: 80,
          top: 80,
          left: 40,
          bottom: 100,
          right: 120,
          width: 80,
          height: 20,
        };
      },
    });

    await render(hbs`
      <div id="mount">
        <AttachPopover
          @id="attachment"
          @explicitTarget={{this.virtualTarget}}
          @isShown={{true}}
          @showOn={{null}}
          @hideOn={{null}}
          @placement="bottom"
        >
          Virtual target attachment
        </AttachPopover>
      </div>
    `);

    const attachment = find('#attachment');
    assert.ok(attachment, 'Floating element rendered for virtual target');
    assert.equal(isVisible(attachment), true, 'Shown via @isShown with virtual target');
    assert.dom('#attachment').hasAttribute('x-placement', 'bottom');
  });

  test('virtual reference with contextElement receives show events', async function (assert) {
    this.set('virtualTarget', {
      contextElement: null,
      getBoundingClientRect() {
        const el = this.contextElement;
        return el
          ? el.getBoundingClientRect()
          : { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
      },
    });

    await render(hbs`
      <div>
        <button id="context-target" type="button">Context</button>
        <div id="mount">
          <AttachPopover
            @id="attachment"
            @explicitTarget={{this.virtualTarget}}
            @showOn="click"
            @hideOn="click"
          >
            Context virtual attachment
          </AttachPopover>
        </div>
      </div>
    `);

    this.virtualTarget.contextElement = find('#context-target');
    this.set('virtualTarget', { ...this.virtualTarget });
    await settled();

    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#context-target');
    assert.equal(isVisible(attachment), true, 'Shown via virtual contextElement click');
  });

  test('AttachTooltip handles virtual reference without throwing', async function (assert) {
    this.set('virtualTarget', {
      getBoundingClientRect() {
        return {
          x: 10,
          y: 20,
          top: 20,
          left: 10,
          bottom: 40,
          right: 60,
          width: 50,
          height: 20,
        };
      },
    });

    await render(hbs`
      <div id="mount">
        <AttachTooltip
          @id="attachment"
          @explicitTarget={{this.virtualTarget}}
          @isShown={{true}}
          @showOn={{null}}
          @hideOn={{null}}
        >
          Virtual tooltip
        </AttachTooltip>
      </div>
    `);

    const attachment = find('#attachment');
    assert.ok(attachment, 'Tooltip rendered for virtual target');
    assert.equal(isVisible(attachment), true, 'Tooltip visible for virtual target');
  });
});
