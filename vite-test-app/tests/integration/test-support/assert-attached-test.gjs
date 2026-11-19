import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, render, triggerEvent } from '@ember/test-helpers';
import { array } from '@ember/helper';
import { AttachTooltip, offset } from 'ember-attacher';
import { assertAttached } from 'ember-attacher/test-support';

function recordingAssert() {
  const results = [];
  return { results, pushResult: (result) => results.push(result) };
}

// Fixed-position boxes give deterministic geometry without depending on Floating UI.
function box(id, { top, left, width = 80, height = 20 }) {
  return `<div id="${id}" style="position: fixed; top: ${top}px; left: ${left}px; width: ${width}px; height: ${height}px; background: #ccc;"></div>`;
}

let mounted = [];

function mount(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  mounted.push(root);
  return root;
}

module('Integration | test-support | assertAttached', function (hooks) {
  setupRenderingTest(hooks);

  hooks.afterEach(function () {
    mounted.forEach((root) => root.remove());
    mounted = [];
  });

  test('passes for an open tooltip placed against its target', async function (assert) {
    await render(<template>
      <button id="trigger" type="button" style="margin: 100px">Trigger</button>
      <AttachTooltip @id="tip" @target="#trigger" @placement="bottom" @arrow={{true}}>
        Tooltip text
      </AttachTooltip>
    </template>);

    await triggerEvent('#trigger', 'mouseenter');

    const recorder = recordingAssert();
    assertAttached(recorder, '#tip', '#trigger', { placement: 'bottom' });

    assert.strictEqual(recorder.results.length, 1, 'pushes exactly one result');
    assert.deepEqual(recorder.results[0].actual, [], 'reports no problems');
    assert.true(recorder.results[0].result, 'result passes');
  });

  test('fails when the attachment is not shown', async function (assert) {
    await render(<template>
      <button id="trigger" type="button" style="margin: 100px">Trigger</button>
      <AttachTooltip @id="tip" @target="#trigger" @placement="bottom">Tooltip text</AttachTooltip>
    </template>);

    const recorder = recordingAssert();
    assertAttached(recorder, find('#tip'), find('#trigger'));

    assert.false(recorder.results[0].result);
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('not visible')),
      'names the visibility problem',
    );
  });

  test('fails when the resolved placement differs from the expected one', async function (assert) {
    await render(<template>
      <button id="trigger" type="button" style="margin: 100px">Trigger</button>
      <AttachTooltip @id="tip" @target="#trigger" @placement="top">Tooltip text</AttachTooltip>
    </template>);

    await triggerEvent('#trigger', 'mouseenter');

    const recorder = recordingAssert();
    assertAttached(recorder, '#tip', '#trigger', { placement: 'bottom' });

    assert.false(recorder.results[0].result);
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('expected placement "bottom"')),
      'names the placement problem',
    );
  });

  test('fails when the attachment is too far from its target', async function (assert) {
    await render(<template>
      <button id="trigger" type="button" style="margin: 100px">Trigger</button>
      <AttachTooltip
        @id="tip"
        @target="#trigger"
        @placement="bottom"
        @middleware={{array (offset 120)}}
      >
        Tooltip text
      </AttachTooltip>
    </template>);

    await triggerEvent('#trigger', 'mouseenter');

    const recorder = recordingAssert();
    assertAttached(recorder, '#tip', '#trigger');

    assert.false(recorder.results[0].result);
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('gap')),
      'names the gap problem',
    );
  });

  test('fails when the attachment sits on the wrong side of its target', function (assert) {
    const root = mount(
      box('target', { top: 200, left: 200 }) +
        `<div id="attachment" data-placement="bottom" style="position: fixed; top: 150px; left: 200px; width: 80px; height: 20px;"></div>`,
    );

    const recorder = recordingAssert();
    assertAttached(recorder, root.querySelector('#attachment'), root.querySelector('#target'));

    assert.false(recorder.results[0].result);
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('not below')),
      'names the side problem',
    );
  });

  test('fails when the arrow does not point at the target', function (assert) {
    const root = mount(
      box('target', { top: 200, left: 200 }) +
        `<div id="attachment" data-placement="bottom" style="position: fixed; top: 230px; left: 200px; width: 300px; height: 20px;">
          <div class="ember-attacher-arrow" style="position: absolute; top: -5px; left: 260px; width: 10px; height: 10px;"></div>
        </div>`,
    );

    const recorder = recordingAssert();
    assertAttached(recorder, root.querySelector('#attachment'), root.querySelector('#target'));

    assert.false(recorder.results[0].result);
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('arrow')),
      'names the arrow problem',
    );
  });

  test('fails when the attachment overflows the viewport', function (assert) {
    const top = window.innerHeight - 10;
    const root = mount(
      box('target', { top: top - 30, left: 200 }) +
        `<div id="attachment" data-placement="bottom" style="position: fixed; top: ${top}px; left: 200px; width: 80px; height: 40px;"></div>`,
    );

    const recorder = recordingAssert();
    assertAttached(recorder, root.querySelector('#attachment'), root.querySelector('#target'));

    assert.false(recorder.results[0].result);
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('viewport')),
      'names the viewport problem',
    );
  });

  test('fails when another element covers the attachment', function (assert) {
    const root = mount(
      box('target', { top: 200, left: 200 }) +
        `<div id="attachment" data-placement="bottom" style="position: fixed; top: 230px; left: 200px; width: 80px; height: 20px;"></div>` +
        `<div id="cover" style="position: fixed; z-index: 10; top: 220px; left: 190px; width: 120px; height: 40px;"></div>`,
    );

    const recorder = recordingAssert();
    assertAttached(recorder, root.querySelector('#attachment'), root.querySelector('#target'));

    assert.false(recorder.results[0].result);
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('covered')),
      'names the covering element',
    );
  });

  test('uses the given message', function (assert) {
    const root = mount(
      box('target', { top: 200, left: 200 }) +
        `<div id="attachment" data-placement="bottom" style="position: fixed; top: 230px; left: 200px; width: 80px; height: 20px;"></div>`,
    );

    const recorder = recordingAssert();
    assertAttached(recorder, root.querySelector('#attachment'), root.querySelector('#target'), {
      message: 'read receipt tooltip',
    });

    assert.true(recorder.results[0].result, 'a well-placed box passes');
    assert.strictEqual(recorder.results[0].message, 'read receipt tooltip');
  });

  test('fails when the attachment does not overlap its target on the cross axis', function (assert) {
    const root = mount(
      box('target', { top: 200, left: 200 }) +
        `<div id="attachment" data-placement="bottom" style="position: fixed; top: 230px; left: 320px; width: 80px; height: 20px;"></div>`,
    );

    const recorder = recordingAssert();
    assertAttached(recorder, root.querySelector('#attachment'), root.querySelector('#target'));

    assert.false(recorder.results[0].result);
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('cross axis')),
      'names the cross-axis overlap problem',
    );
  });

  test('checks horizontal sides and vertical arrow alignment', function (assert) {
    const root = mount(
      box('target', { top: 200, left: 200, width: 80, height: 20 }) +
        `<div id="attachment" data-placement="right" style="position: fixed; top: 200px; left: 288px; width: 80px; height: 60px;">
          <div class="ember-attacher-arrow" style="position: absolute; top: 45px; left: -5px; width: 10px; height: 10px;"></div>
        </div>`,
    );

    const recorder = recordingAssert();
    assertAttached(recorder, root.querySelector('#attachment'), root.querySelector('#target'), {
      placement: 'right',
    });

    assert.false(recorder.results[0].result);
    assert.strictEqual(recorder.results[0].actual.length, 1, 'only the arrow check fails on right side');
    assert.true(
      recorder.results[0].actual.some((problem) => problem.includes('arrow')),
      'detects vertical arrow offset on horizontal placement',
    );
  });

  test('ignores cover hit-test when attachment has pointer-events: none', function (assert) {
    const root = mount(
      box('target', { top: 200, left: 200 }) +
        `<div id="attachment" data-placement="bottom" style="position: fixed; top: 230px; left: 200px; width: 80px; height: 20px; pointer-events: none;"></div>`,
    );

    const recorder = recordingAssert();
    assertAttached(recorder, root.querySelector('#attachment'), root.querySelector('#target'));

    assert.true(recorder.results[0].result, 'does not treat underlying body as a covering element');
  });

  test('reports missing targets and missing data-placement cleanly', function (assert) {
    const missingRecorder = recordingAssert();
    assertAttached(missingRecorder, '#does-not-exist', null);

    assert.false(missingRecorder.results[0].result);
    assert.deepEqual(missingRecorder.results[0].actual, ['attachment not found']);

    const root = mount(
      box('target', { top: 200, left: 200 }) +
        `<div id="attachment" style="position: fixed; top: 230px; left: 200px; width: 80px; height: 20px;"></div>`,
    );

    const noTargetRecorder = recordingAssert();
    assertAttached(noTargetRecorder, root.querySelector('#attachment'), null);
    assert.false(noTargetRecorder.results[0].result);
    assert.deepEqual(noTargetRecorder.results[0].actual, ['target not found']);

    const noPlacementRecorder = recordingAssert();
    assertAttached(noPlacementRecorder, root.querySelector('#attachment'), root.querySelector('#target'));
    assert.false(noPlacementRecorder.results[0].result);
    assert.deepEqual(noPlacementRecorder.results[0].actual, ['attachment has no data-placement']);
  });
});
