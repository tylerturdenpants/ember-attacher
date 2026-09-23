import { module, test } from 'qunit';
import { visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | styles gallery', function (hooks) {
  setupApplicationTest(hooks);

  test('always-open tooltips use the requested placement', async function (assert) {
    await visit('/gallery');

    const expected = {
      top: 'top',
      bottom: 'bottom',
      left: 'left',
      right: 'right',
      'light theme': 'top',
      fill: 'bottom',
    };

    for (const [label, placement] of Object.entries(expected)) {
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
    }
  });
});
