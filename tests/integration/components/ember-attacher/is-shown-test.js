import hbs from 'htmlbars-inline-precompile';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | isShown', {
  integration: true
});

test('isShown works with showOn/hideOn set to "click"', async function(assert) {
  assert.expect(3);

  this.render(hbs`
    <button id="toggle-show">
      Click me, captain!

      {{#ember-attacher id='attachment'
                        hideOn='click'
                        isShown=true
                        showOn='click'}}
        isShown w/ hideOn/ShowOn of 'click'
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  await click('#toggle-show');

  assert.equal(innerAttacher.style.display, 'none', 'Now hidden');

  await click('#toggle-show');

  assert.equal(innerAttacher.style.display, '', 'Shown again after click');
});

test('isShown works with showOn/hideOn set to "none"', async function(assert) {
  assert.expect(3);

  this.on('closePopover', () => {
    this.set('isShown', false);
  });

  this.on('openPopover', () => {
    this.set('isShown', true);
  });

  this.set('isShown', false);

  this.render(hbs`
    <button id="open" {{action 'openPopover'}}>
      Click me, captain!

      {{#ember-attacher id='attachment'
                        hideOn='none'
                        isShown=isShown
                        showOn='none'}}
        isShown w/ hideOn/ShowOn of 'none'

        <button id="close" {{action 'closePopover'}}>
          Close
        </button>

      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  await click('#open');

  assert.equal(innerAttacher.style.display, '', 'Now shown');

  await click('#close');

  assert.equal(innerAttacher.style.display, 'none', 'Hidden again');
});

test('nested attachers open and close as expected', async function(assert) {
  assert.expect(7);

  this.on('openParentPopover', () => {
    this.set('parentIsShown', true);
  });

  this.on('closeChildPopover', () => {
    this.set('childIsShown', false);
  });

  this.on('openChildPopover', () => {
    this.set('childIsShown', true);
  });

  this.setProperties({
    childIsShown: false,
    parentIsShown: false
  });

  this.render(hbs`
    <button id="openParent" {{action 'openParentPopover'}}>
      Open parent

      {{#ember-attacher class='parent'
                        hideOn='none'
                        isShown=parentIsShown
                        showOn='none'}}
        <button id="openChild" {{action 'openChildPopover'}}>
          Open child

          {{#ember-attacher class='child'
                            hideDuration=0
                            hideOn='none'
                            isShown=childIsShown
                            showOn='none'}}
            <button id="closeChild" {{action 'closeChildPopover'}}>
              Close child
            </button>
          {{/ember-attacher}}
        </button>
      {{/ember-attacher}}
    </button>
  `);

  const innerChildAttacher = find('.child > .inner');
  const innerParentAttacher = find('.parent > .inner');

  assert.equal(innerParentAttacher.style.display, 'none', 'parent initially hidden');
  assert.equal(innerChildAttacher.style.display, 'none', 'child initially hidden');

  await click('#openParent');

  assert.equal(innerParentAttacher.style.display, '', 'parent shown');

  assert.equal(innerChildAttacher.style.display, 'none', 'child still hidden');

  await click(find('#openChild', innerParentAttacher));

  assert.equal(innerChildAttacher.style.display, '', 'child shown');

  await click('#closeChild');

  assert.equal(innerParentAttacher.style.display, '', 'parent still shown');
  assert.equal(innerChildAttacher.style.display, 'none', 'child hidden');
});
