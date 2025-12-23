import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find, focus, settled } from '@ember/test-helpers';
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
});
