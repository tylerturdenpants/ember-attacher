import { click, find, triggerEvent } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import { isVisible } from 'ember-attacher';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "mouseleave"', {
  integration: true
});

test('hides when the mouse leaves the target', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <div id="target">
      {{#attach-popover id='attachment'
                        hideOn='mouseleave'
                        isShown=true}}
        hideOn mouseleave
      {{/attach-popover}}
    </div>
  `);

  // Wait for initial show()
  await wait();

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), true, 'Initially shown');

  await triggerEvent('#target', 'mouseleave');
  await wait();

  assert.equal(isVisible(attachment), false, 'Now hidden');
});

test("with interactive=true: doesn't hide if mouse over target or attachment", async function(assert) {
  assert.expect(5);

  this.render(hbs`
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

  // Wait for initial show()
  await wait();

  const attachment = find('#attachment');
  const target = find('#target');

  assert.equal(isVisible(attachment), true, 'Initially shown');

  await triggerEvent(target, 'mouseleave');
  await wait();

  // Sanity check still shown
  assert.equal(isVisible(attachment), true, 'Still shown after mouseleave');

  await triggerEvent(attachment, 'mousemove');
  await wait();

  assert.equal(isVisible(attachment), true, 'Still shown after mousemove into attachment');

  await triggerEvent(find('#other'), 'mousemove');
  await wait();

  assert.equal(isVisible(attachment), true, 'Still shown after mousemove into target');

  await triggerEvent(find('#outside'), 'mousemove');
  await wait();

  assert.equal(isVisible(attachment),
               false,
               'Hidden after mousemove outside target and attachment');
});

// Regression test
test('with interactive=true: still hides when mouse leaves target + attachment '
     + 'after a manual hide', async function(assert) {
  assert.expect(4);

  this.set('isShown', true);

  this.render(hbs`
    <div id="target" style="height: 300px; width: 300px;">
      {{#attach-popover id='attachment'
                        hideOn='mouseleave'
                        interactive=true
                        isShown=isShown
                        onChange=(action (mut isShown)) as |attacher|}}
        hideOn mouseleave

        <button id="manual-hide" {{action attacher.hide}}>hide</button>
      {{/attach-popover}}
    </div>

    <div id='outside'></div>
  `);

  // Wait for initial show()
  await wait();

  const attachment = find('#attachment');

  assert.equal(isVisible(attachment), true, 'Initially shown');

  await click('#manual-hide');
  await wait();

  assert.equal(isVisible(attachment), false, 'Hidden after manual hide');

  // Make visible again
  this.set('isShown', true);

  // Need to wait for mouseleave listener to be set, then trigger it
  await wait();

  await triggerEvent('#target', 'mouseleave');
  await wait();

  // Sanity check. Also note how the mouseleave didn't trigger a hide event
  assert.equal(isVisible(attachment), true, 'Shown again');

  await triggerEvent(find('#outside'), 'mousemove');
  await wait();

  assert.equal(isVisible(attachment), false, 'Hidden after mousemove');
});

test('with interactive=true and isOffset=false: hides if mouse between '
     + 'target and attachment', async function(assert) {
  assert.expect(3);

  this.render(hbs`
    <style>
      #attachment {
        margin-top: 10px;
      }
    </style>

    <div id="target" style="height: 300px; width: 300px;">
      {{#attach-popover id='attachment'
                        hideOn='mouseleave'
                        interactive=true
                        placement='bottom'
                        isShown=true}}
        hideOn mouseleave
      {{/attach-popover}}
    </div>
  `);

  // Wait for initial show()
  await wait();

  const attachment = find('#attachment');
  const target = find('#target');

  assert.equal(isVisible(attachment), true, 'Initially shown');

  await triggerEvent(target, 'mouseleave');
  await wait();

  // Sanity check still shown
  assert.equal(isVisible(attachment), true, 'Still shown after mouseleave');

  const attachmentPosition = find('#attachment').getBoundingClientRect();

  await triggerEvent(document,
                     'mousemove',
                     {
                       clientX: attachmentPosition.left + 1,
                       clientY: attachmentPosition.top - 1
                     });
  await wait();

  assert.equal(isVisible(attachment), false, 'Hidden after mousemove between');
});

test("with interactive=true and isOffset=true: doesn't hide if mouse between "
     + 'target and attachment', async function(assert) {
  assert.expect(4);

  this.render(hbs`
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

  // Wait for initial show()
  await wait();

  const attachment = find('#attachment');
  const target = find('#target');

  assert.equal(isVisible(attachment), true, 'Initially shown');

  await triggerEvent(target, 'mouseleave');
  await wait();

  // Sanity check still shown
  assert.equal(isVisible(attachment), true, 'Still shown after mouseleave');

  const attachmentPosition = find('#attachment').getBoundingClientRect();

  await triggerEvent(document,
                     'mousemove',
                     {
                       clientX: attachmentPosition.left + 1,
                       clientY: attachmentPosition.top - 1
                     });
  await wait();

  assert.equal(isVisible(attachment), true, 'Still shown after mousemove into between');

  await triggerEvent(document,
                     'mousemove',
                     {
                       clientX: attachmentPosition.left - 1,
                       clientY: attachmentPosition.bottom + 1
                     });
  await wait();

  assert.equal(isVisible(attachment), false, 'hidden after mousemove outside');
});
