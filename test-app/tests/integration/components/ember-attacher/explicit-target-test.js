import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find, focus, click, settled } from '@ember/test-helpers';
import { isVisible } from 'ember-attacher';
import { modifier } from 'ember-modifier';

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

  test('resolves @explicitTarget CSS selector strings', async function (assert) {
    await render(hbs`
      <div>
        <button id="selector-target">Selector target</button>
        <div id="mount">
          <AttachPopover
            @id="attachment"
            @explicitTarget="#selector-target"
            @showOn="click"
            @hideOn="click"
          >
            Floating element
          </AttachPopover>
        </div>
      </div>
    `);

    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#selector-target');
    assert.equal(isVisible(attachment), true, 'Shown when selector target is clicked');

    await click('#selector-target');
    assert.equal(isVisible(attachment), false, 'Hidden when selector target is clicked again');
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

  test('yielded setReference registers an external Element target', async function (assert) {
    this.set(
      'registerExternalTarget',
      modifier((_element, [setReference]) => {
        setReference(document.getElementById('external-target'));
      })
    );

    await render(hbs`
      <div>
        <button id="external-target">External</button>
        <div id="mount">
          <AttachPopover
            @id="attachment"
            @showOn="click"
            @hideOn="click"
            @lazyRender={{false}}
            as |attacher|
          >
            <span {{this.registerExternalTarget attacher.setReference}}></span>
            Floating element
          </AttachPopover>
        </div>
      </div>
    `);

    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#mount');
    assert.equal(isVisible(attachment), false, 'Parent mount click does not show');

    await click('#external-target');
    assert.equal(isVisible(attachment), true, 'Shown when setReference target is clicked');
  });

  test('yielded reference modifier exists on first render and retargets', async function (assert) {
    let sawReferenceOnFirstYield = false;

    this.set(
      'captureReference',
      modifier((_element, [reference]) => {
        sawReferenceOnFirstYield = typeof reference === 'function' || typeof reference === 'object';
      })
    );

    await render(hbs`
      <div id="wrapper">
        <AttachPopover
          @id="attachment"
          @showOn="click"
          @hideOn="click"
          @lazyRender={{false}}
          as |attacher|
        >
          <span {{this.captureReference attacher.reference}}></span>
          <button id="yielded-ref" {{attacher.reference}} type="button">Inner ref</button>
          Floating element
        </AttachPopover>
      </div>
    `);

    assert.ok(sawReferenceOnFirstYield, 'reference modifier is defined on first yield');

    const attachment = find('#attachment');
    assert.equal(isVisible(attachment), false, 'Initially hidden');

    await click('#wrapper');
    assert.equal(isVisible(attachment), false, 'Wrapper (parent) click does not show after retarget');

    await click('#yielded-ref');
    assert.equal(isVisible(attachment), true, 'Shown when yielded reference element is clicked');
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
        <button id="context-target">Context</button>
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
});
