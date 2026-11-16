import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, click, find, triggerEvent, waitFor } from '@ember/test-helpers';

module('Integration | Component | hideOn "mouseleave"', function(hooks) {
  setupRenderingTest(hooks);

  test('hides when the mouse leaves the target', async function(assert) {
    assert.expect(2);

    await render(hbs`
      <div id="target">
        {{#attach-popover id='attachment'
                          hideOn='mouseleave'
                          isShown=true}}
          hideOn mouseleave
        {{/attach-popover}}
      </div>
    `);

    const attachment = await waitFor('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await triggerEvent('#target', 'mouseleave');



    assert.equal(isVisible(attachment), false, 'Now hidden');
  });

  test("with interactive=true: doesn't hide if mouse over target or attachment", async function(assert) {
    assert.expect(5);

    await render(hbs`
      <div id="target" style="height: 300px; width: 300px;">
        <span id="other">something else in the target</span>

        {{#attach-popover id='attachment'
                          hideOn='mouseleave'
                          interactive=true
                          isShown=true}}
          hideOn mouseleave
        {{/attach-popover}}
      </div>

      <div id='outside'></div>
    `);

    const attachment = await waitFor('#attachment');
    const target = await waitFor('#target');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await triggerEvent(target, 'mouseleave');

    // Sanity check still shown
    assert.equal(isVisible(attachment), true, 'Still shown after mouseleave');

    await triggerEvent(attachment, 'mousemove');

    assert.equal(isVisible(attachment), true, 'Still shown after mousemove into attachment');

    await triggerEvent(find('#other'), 'mousemove');

    assert.equal(isVisible(attachment), true, 'Still shown after mousemove into target');

    await triggerEvent(find('#outside'), 'mousemove');

    assert.equal(isVisible(attachment),
                 false,
                 'Hidden after mousemove outside target and attachment');
  });

  // Regression test
  test('with interactive=true: still hides when mouse leaves target + attachment '
       + 'after a manual hide', async function(assert) {
    assert.expect(4);

    this.set('isShown', true);

    await render(hbs`
      <div id="target" style="height: 300px; width: 300px;">
        {{#attach-popover id='attachment'
                          hideOn='mouseleave'
                          interactive=true
                          isShown=this.isShown
                          onChange=(fn (mut this.isShown)) as |attacher|}}
          hideOn mouseleave

          <button id="manual-hide" {{on 'click' attacher.hide}}>hide</button>
        {{/attach-popover}}
      </div>

      <div id='outside'></div>
    `);
    const attachment = await waitFor('#attachment');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await click('#manual-hide');

    assert.equal(isVisible(attachment), false, 'Hidden after manual hide');

    // Make visible again
    this.set('isShown', true);

    // Need to wait for mouseleave listener to be set, then trigger it
    await settled();

    await triggerEvent('#target', 'mouseleave');


    // Sanity check. Also note how the mouseleave didn't trigger a hide event
    assert.equal(isVisible(attachment), true, 'Shown again');

    await triggerEvent(find('#outside'), 'mousemove');


    assert.equal(isVisible(attachment), false, 'Hidden after mousemove');
  });

  test('T6: interactive safePolygon keeps attachment open across the diagonal corridor without @isOffset', async function(assert) {
    assert.expect(4);

    await render(hbs`
      <style>
        #attachment {
          margin-top: 10px;
        }
      </style>

      <div id="target" style="height: 50px; top: 0; position: fixed; width: 300px;">
        target
        {{#attach-popover id='attachment'
                          hideOn='mouseleave'
                          interactive=true
                          placement='bottom'
                          isShown=true}}
          hideOn mouseleave
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');
    const target = find('#target');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await triggerEvent(target, 'mouseleave');

    assert.equal(isVisible(attachment), true, 'Still shown after mouseleave');

    const attachmentPosition = find('#attachment').getBoundingClientRect();
    const targetPosition = target.getBoundingClientRect();

    // Midpoint in the gap between target bottom and attachment top (axis-aligned trough)
    await triggerEvent(document, 'mousemove', {
      clientX: attachmentPosition.left + 1,
      clientY: attachmentPosition.top - 1,
    });

    assert.equal(
      isVisible(attachment),
      true,
      'Still shown after mousemove into automatic safePolygon corridor'
    );

    // Outside both rects and outside the convex-hull corridor
    await triggerEvent(document, 'mousemove', {
      clientX: Math.min(targetPosition.left, attachmentPosition.left) - 20,
      clientY: attachmentPosition.bottom + 20,
    });

    assert.equal(isVisible(attachment), false, 'Hidden after mousemove outside safePolygon');
  });

  test('T6: @isOffset remains compatible with automatic safePolygon (no deprecation in 4.3)', async function(assert) {
    assert.expect(4);

    await render(hbs`
      <style>
        #attachment {
          margin-top: 10px;
        }
      </style>

      <div id="target" style="height: 50px; top: 0; position: fixed; width: 300px;">
        target
        {{#attach-popover id='attachment'
                          hideOn='mouseleave'
                          interactive=true
                          isOffset=true
                          placement='bottom'
                          isShown=true}}
          hideOn mouseleave
        {{/attach-popover}}
      </div>
    `);

    const attachment = find('#attachment');
    const target = find('#target');

    assert.equal(isVisible(attachment), true, 'Initially shown');

    await triggerEvent(target, 'mouseleave');

    assert.equal(isVisible(attachment), true, 'Still shown after mouseleave');

    const attachmentPosition = find('#attachment').getBoundingClientRect();

    await triggerEvent(document, 'mousemove', {
      clientX: attachmentPosition.left + 1,
      clientY: attachmentPosition.top - 1,
    });

    assert.equal(isVisible(attachment), true, 'Still shown after mousemove into between');

    await triggerEvent(document, 'mousemove', {
      clientX: attachmentPosition.left - 20,
      clientY: attachmentPosition.bottom + 20,
    });

    assert.equal(isVisible(attachment), false, 'hidden after mousemove outside');
  });
});
