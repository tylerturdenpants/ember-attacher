import { module, test } from 'qunit';
import { visit, waitUntil } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | styles gallery', function (hooks) {
  setupApplicationTest(hooks);

  test('always-open tooltips use the requested placement and CSS', async function (assert) {
    await visit('/gallery');

    const expected = {
      top: { placement: 'top', arrow: true },
      bottom: { placement: 'bottom', arrow: true },
      left: { placement: 'left', arrow: true },
      right: { placement: 'right', arrow: true },
      'light theme': { placement: 'top', arrow: true },
      fill: { placement: 'bottom', arrow: false },
      shift: { placement: 'top', arrow: true },
      scale: { placement: 'bottom', arrow: true },
      none: { placement: 'left', arrow: true },
      perspective: { placement: 'right', arrow: true },
    };

    for (const [label, { placement, arrow }] of Object.entries(expected)) {
      const cell = document.querySelector(
        `[data-test-styles-gallery-cell="${label}"]`
      );
      assert.ok(cell, `cell exists for ${label}`);

      const shell = cell.querySelector('.ember-attacher');
      assert.ok(shell, `floating shell exists for ${label}`);

      assert.strictEqual(
        shell.getAttribute('x-placement'),
        placement,
        `${label} x-placement`
      );

      const shellStyle = getComputedStyle(shell);
      assert.notEqual(
        shellStyle.display,
        'none',
        `${label} shell is shown (CSS loaded)`
      );

      const inner = shell.querySelector('.ember-attacher-show');
      assert.ok(inner, `${label} inner has show class`);
      await waitUntil(
        () => getComputedStyle(inner).opacity === '1',
        { timeout: 2000 }
      );
      assert.strictEqual(
        getComputedStyle(inner).opacity,
        '1',
        `${label} inner is visible`
      );

      if (arrow) {
        assert.ok(
          inner.querySelector('.ember-attacher-arrow'),
          `${label} has ember-attacher-arrow`
        );
      }
    }
  });
});
