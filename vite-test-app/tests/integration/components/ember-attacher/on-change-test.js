import { hbs } from 'ember-cli-htmlbars';
import { isVisible } from 'ember-attacher';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, find, settled } from '@ember/test-helpers';

module('Integration | Component | onChange', function (hooks) {
  setupRenderingTest(hooks);

  test('fires the onChange hook when visibility is toggled', async function (assert) {
    assert.expect(5);

    this.set('isShown', true);
    this.set('onChange', (val) => this.set('isShown', val));

    await render(hbs`
      <button id="click-toggle" type="button">
        Click me, captain!
      </button>
      <AttachPopover
        @id="attachment"
        @target="#click-toggle"
        @hideOn="click"
        @isShown={{this.isShown}}
        @onChange={{this.onChange}}
        @showOn="click"
      >
        showOn click
      </AttachPopover>
    `);

    const attachment = find('#attachment');

    assert.true(isVisible(attachment), 'Initially shown');

    await click('#click-toggle');

    assert.false(isVisible(attachment), 'Now hidden');
    assert.false(this.isShown);

    // Show again by toggling isShown
    this.set('isShown', true);

    await settled();

    assert.true(isVisible(attachment), 'Shown again');

    // Make sure isShown is still true
    assert.true(this.isShown);
  });
});
