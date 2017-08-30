import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import { click, find, triggerEvent } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "mouseleave"', {
  integration: true
});

test('hides when the mouse leaves the target', function(assert) {
  assert.expect(2);

  this.render(hbs`
    <div id="target">
      {{#ember-attacher id='attachment'
                        hideOn='mouseleave'
                        isShown=true}}
        hideOn mouseleave
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  return triggerEvent('#target', 'mouseleave').then(() => {
    assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
  });
});

test("with interactive=true: doesn't hide if mouse over target or attachment", function(assert) {
  assert.expect(5);

  this.render(hbs`
    <div id="target" style="height: 300px; width: 300px;">
      <span id="other">something else in the target</span>

      {{#ember-attacher id='hello'
                        hideOn='mouseleave'
                        interactive=true
                        isShown=true}}
        hideOn mouseleave
      {{/ember-attacher}}
    </div>

    <div id='outside'></div>
  `);

  const innerAttacher = find('#hello > .inner');
  const target = find('#target');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  return triggerEvent(target, 'mouseleave').then(() => {
    // Sanity check still shown
    assert.equal(innerAttacher.style.display, '', 'Still shown after mouseleave');

    return triggerEvent(innerAttacher, 'mousemove').then(() => {
      assert.equal(innerAttacher.style.display, '', 'Still shown after mousemove into attachment');

      return triggerEvent(find('#other'), 'mousemove').then(() => {
        assert.equal(innerAttacher.style.display, '', 'Still shown after mousemove into target');

        return triggerEvent(find('#outside'), 'mousemove').then(() => {
          assert.equal(innerAttacher.style.display,
                       'none',
                       'Hidden after mousemove outside target and attachment');
        });
      });
    });
  });
});

// Regression test
test('with interactive=true: still hides when mouse leaves target + attachment '
     + 'after a manual hide', function(assert) {
  assert.expect(4);

  this.set('isShown', true);

  this.render(hbs`
    <div id="target" style="height: 300px; width: 300px;">
      {{#ember-attacher id='hello'
                        hideOn='mouseleave'
                        interactive=true
                        isShown=isShown
                        onChange=(action (mut isShown)) as |attacher|}}
        hideOn mouseleave

        <button id="manual-hide" {{action attacher.hide}}>hide</button>
      {{/ember-attacher}}
    </div>

    <div id='outside'></div>
  `);

  const innerAttacher = find('#hello > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  return click(find('#manual-hide')).then(() => {
    assert.equal(innerAttacher.style.display, 'none', 'Hidden after manual hide');

    // Make visible again
    this.set('isShown', true);

    // Need to wait for mouseleave listener to be set, then trigger it
    return wait().then(() => {
      return triggerEvent('#target', 'mouseleave').then(() => {
        // Sanity check. Also note how the mouseleave didn't trigger a hide event
        assert.equal(innerAttacher.style.display, '', 'Shown again');

        return triggerEvent(find('#outside'), 'mousemove').then(() => {
          assert.equal(innerAttacher.style.display, 'none', 'Hidden after mousemove');
        });
      });
    });
  });
});

test('with interactive=true and isOffset=false: hides if mouse between '
     + 'target and attachment', function(assert) {
  assert.expect(3);

  this.render(hbs`
    <style>
      #attachment {
        margin-top: 10px;
      }
    </style>

    <div id="target" style="height: 300px; width: 300px;">
      {{#ember-attacher id='attachment'
                        hideOn='mouseleave'
                        interactive=true
                        placement='bottom'
                        isShown=true}}
        hideOn mouseleave
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('#attachment > .inner');
  const target = find('#target');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  return triggerEvent(target, 'mouseleave').then(() => {
    // Sanity check still shown
    assert.equal(innerAttacher.style.display, '', 'Still shown after mouseleave');

    const attachmentPosition = find('#attachment').getBoundingClientRect();

    return triggerEvent(document,
                        'mousemove',
                        {
                          clientX: attachmentPosition.left + 1,
                          clientY: attachmentPosition.top - 1
                        }).then(() => {
      assert.equal(innerAttacher.style.display, 'none', 'Hidden after mousemove between');
    });
  });
});

test("with interactive=true and isOffset=true: doesn't hide if mouse between "
     + 'target and attachment', function(assert) {
  assert.expect(4);

  this.render(hbs`
    <style>
      #attachment {
        margin-top: 10px;
      }
    </style>

    <div id="target" style="height: 300px; width: 300px;">
      {{#ember-attacher id='attachment'
                        hideOn='mouseleave'
                        interactive=true
                        isOffset=true
                        placement='bottom'
                        isShown=true}}
        hideOn mouseleave
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('#attachment > .inner');
  const target = find('#target');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  return triggerEvent(target, 'mouseleave').then(() => {
    // Sanity check still shown
    assert.equal(innerAttacher.style.display, '', 'Still shown after mouseleave');

    const attachmentPosition = find('#attachment').getBoundingClientRect();

    return triggerEvent(document,
                        'mousemove',
                        {
                          clientX: attachmentPosition.left + 1,
                          clientY: attachmentPosition.top - 1
                        }).then(() => {
      assert.equal(innerAttacher.style.display, '', 'Still shown after mousemove into between');

      return triggerEvent(document,
                          'mousemove',
                          {
                            clientX: attachmentPosition.left - 1,
                            clientY: attachmentPosition.bottom + 1
                          }).then(() => {
        assert.equal(innerAttacher.style.display, 'none', 'hidden after mousemove outside');
      });
    });
  });
});
