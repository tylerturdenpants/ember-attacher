import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | registerAPI', {
  integration: true,

  beforeEach() {
    this.set('foundTarget', null);
    this.set('show', false);
  }
});

test('registerAPI returns the target', function(assert) {
  assert.expect(1);

  this.on('registerAPI', ({ popperTarget }) => {
    const expectedTarget = document.getElementById('parent');
    assert.equal(popperTarget, expectedTarget);
  });

  this.render(hbs`
    <div id='parent'>
      {{#if show}}
        {{#attach-popover id='attachment' registerAPI=(action 'registerAPI')}}
          template block text
        {{/attach-popover}}
      {{/if}}
    </div>
  `);

  this.set('show', true);

  return wait();
});

test('when the popper changes the API is reregistered', function(assert) {
  assert.expect(1);

  this.on('registerAPI', () => assert.ok('register API called'));

  this.set('eventsEnabled', true);

  this.render(hbs`
    <div class='parent'>
      {{#attach-popover class='popper-element'
                        eventsEnabled=eventsEnabled
                        registerAPI=(action 'registerAPI')}}
        template block text
      {{/attach-popover}}
    </div>
  `);

  this.set('eventsEnabled', false);
});
