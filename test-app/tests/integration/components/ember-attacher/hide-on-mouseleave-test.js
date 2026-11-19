import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, click, find, triggerEvent, waitFor } from '@ember/test-helpers';

module('Integration | Component | hideOn "mouseleave"', function (hooks) {
  setupRenderingTest(hooks);

  test('hides when the mouse leaves the target', async function (assert) {
    assert.expect(2);

    await render(hbs`
      <div id="target">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#target"
        @hideOn="mouseleave"
        @interactive={{false}}
        @isShown={{true}}
      >
        hideOn mouseleave
      </AttachPopover>
    `);

    const attachment = await waitFor('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    await triggerEvent('#target', 'mouseleave');

    assert.false(isVisible(attachment), 'Now hidden');
  });

  test("with interactive=true: doesn't hide if mouse over target or attachment", async function (assert) {
    assert.expect(5);

    await render(hbs`
      <div id="target" style="height: 300px; width: 300px;">
        <span id="other">something else in the target</span>
      </div>
      <AttachPopover
        @id="attachment"
        @target="#target"
        @hideOn="mouseleave"
        @interactive={{true}}
        @isShown={{true}}
      >
        hideOn mouseleave
      </AttachPopover>

      <div id="outside"></div>
    `);

    const attachment = await waitFor('#attachment');
    const target = await waitFor('#target');

    assert.true(isVisible(attachment), 'Initially shown');

    await triggerEvent(target, 'mouseleave');

    // Sanity check still shown
    assert.true(isVisible(attachment), 'Still shown after mouseleave');

    await triggerEvent(attachment, 'mousemove');

    assert.true(isVisible(attachment), 'Still shown after mousemove into attachment');

    await triggerEvent(find('#other'), 'mousemove');

    assert.true(isVisible(attachment), 'Still shown after mousemove into target');

    await triggerEvent(find('#outside'), 'mousemove');

    assert.false(
      isVisible(attachment),
      'Hidden after mousemove outside target and attachment'
    );
  });

  // Regression test
  test('with interactive=true: still hides when mouse leaves target + attachment '
       + 'after a manual hide', async function (assert) {
    assert.expect(4);

    this.set('isShown', true);
    this.set('onChange', (val) => this.set('isShown', val));

    await render(hbs`
      <div id="target" style="height: 300px; width: 300px;">Target</div>
      <AttachPopover
        @id="attachment"
        @target="#target"
        @hideOn="mouseleave"
        @interactive={{true}}
        @isShown={{this.isShown}}
        @onChange={{this.onChange}}
        as |attacher|
      >
        hideOn mouseleave

        <button id="manual-hide" type="button" {{on "click" attacher.hide}}>hide</button>
      </AttachPopover>

      <div id="outside"></div>
    `);
    const attachment = await waitFor('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    await click('#manual-hide');

    assert.false(isVisible(attachment), 'Hidden after manual hide');

    // Make visible again
    this.set('isShown', true);

    // Need to wait for mouseleave listener to be set, then trigger it
    await settled();

    await triggerEvent('#target', 'mouseleave');

    // Sanity check. Also note how the mouseleave didn't trigger a hide event
    assert.true(isVisible(attachment), 'Shown again');

    await triggerEvent(find('#outside'), 'mousemove');

    assert.false(isVisible(attachment), 'Hidden after mousemove');
  });

  test('interactive=true keeps attachment open in diagonal safePolygon corridor without @isOffset', async function (assert) {
    assert.expect(4);

    await render(hbs`
      <style>
        #attachment {
          margin-top: 20px;
          width: 220px;
          height: 80px;
        }
      </style>

      <div id="target" style="position: fixed; top: 20px; left: 100px; height: 40px; width: 60px;">
        target
      </div>
      <AttachPopover
        @id="attachment"
        @target="#target"
        @hideOn="mouseleave"
        @interactive={{true}}
        @placement="bottom"
        @animation="none"
        @isShown={{true}}
      >
        hideOn mouseleave
      </AttachPopover>
    `);

    const attachment = find('#attachment');
    const target = find('#target');

    assert.true(isVisible(attachment), 'Initially shown');

    const targetRect = target.getBoundingClientRect();
    const attachmentRect = attachment.getBoundingClientRect();

    // Exit from bottom-center of target toward the attachment
    const originX = (targetRect.left + targetRect.right) / 2;
    const originY = targetRect.bottom;
    await triggerEvent(target, 'mouseleave', { clientX: originX, clientY: originY });

    assert.true(isVisible(attachment), 'Still shown after mouseleave');

    // Diagonal midpoint heading toward the lower attachment's right edge (inside triangle corridor,
    // even outside the narrower target's horizontal bounds!)
    const midX = (originX + attachmentRect.right) / 2;
    const midY = (targetRect.bottom + attachmentRect.top) / 2;
    await triggerEvent(document, 'mousemove', { clientX: midX, clientY: midY });

    assert.true(
      isVisible(attachment),
      'Stays open inside the automatic safePolygon diagonal corridor without @isOffset'
    );

    // Move laterally beside the narrower target (y within targetRect.top..bottom, x to the right of target
    // where a static 8-corner convex hull would falsely keep the popover open)
    await triggerEvent(document, 'mousemove', {
      clientX: targetRect.right + 10,
      clientY: (targetRect.top + targetRect.bottom) / 2,
    });

    assert.false(
      isVisible(attachment),
      'Hides when cursor exits laterally into adjacent UI beside the target (outside facing-edge corridor)'
    );
  });

  test("with interactive=true and margin gap: doesn't hide if mouse moves between target and attachment", async function (assert) {
    assert.expect(4);

    await render(hbs`
      <style>
        #attachment {
          margin-top: 10px;
        }
      </style>

      <div id="target" style="height: 50px; top: 0; position: fixed; width: 300px;">
        target
      </div>
      <AttachPopover
        @id="attachment"
        @target="#target"
        @hideOn="mouseleave"
        @interactive={{true}}
        @placement="bottom"
        @isShown={{true}}
      >
        hideOn mouseleave
      </AttachPopover>
    `);

    const attachment = find('#attachment');
    const target = find('#target');

    assert.true(isVisible(attachment), 'Initially shown');

    await triggerEvent(target, 'mouseleave');

    // Sanity check still shown
    assert.true(isVisible(attachment), 'Still shown after mouseleave');

    const attachmentPosition = find('#attachment').getBoundingClientRect();

    await triggerEvent(
      document,
      'mousemove',
      {
        clientX: attachmentPosition.left + 1,
        clientY: attachmentPosition.top - 1,
      }
    );

    assert.true(isVisible(attachment), 'Still shown after mousemove into between');

    await triggerEvent(
      document,
      'mousemove',
      {
        clientX: attachmentPosition.left - 1,
        clientY: attachmentPosition.bottom + 1,
      }
    );

    assert.false(isVisible(attachment), 'hidden after mousemove outside');
  });
});
