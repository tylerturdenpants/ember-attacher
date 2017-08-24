import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | ember attacher', {
  integration: true
});

test('it renders', function(assert) {
  assert.expect(3);

  this.render(hbs`
    <div>
      {{#ember-attacher popperClass="hello"}}
        popper text
      {{/ember-attacher}}
    </div>
  `);

  let popper = find('.hello', document.documentElement);
  let innerAttacher = find('.inner', popper);

  assert.ok(innerAttacher, '.inner class exists');

  assert.ok(find('div[x-circle]', innerAttacher), 'div[x-circle] exists');

  let innerHTML = innerAttacher.innerHTML.trim();

  assert.equal(innerHTML.indexOf('popper text'), 0);
});

test('nested attachers open and close as expected', async function(assert) {
  assert.expect(6);

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
    hideOn: 'none',
    parentIsShown: false,
    showOn: 'none'
  });

  this.render(hbs`
    <button id="openParent" {{action 'openParentPopover'}}>
      Open parent

      {{#ember-attacher hideOn=hideOn
                        isShown=parentIsShown
                        popperClass="parent"
                        showOn=showOn}}
        <button id="openChild" {{action 'openChildPopover'}}>
          Open child

          {{#ember-attacher hideOn=hideOn
                            isShown=childIsShown
                            popperClass="child"
                            showOn=showOn}}
            <button id="closeChild" {{action 'closeChildPopover'}}>
              Close child
            </button>
          {{/ember-attacher}}
        </button>
      {{/ember-attacher}}
    </button>
  `);

  // Need to wait for didInsertElement to process
  await wait();

  let child = find('.child', document.documentElement);
  let innerChildAttacher = find('.inner', child);
  let parent = find('.parent', document.documentElement);
  let innerParentAttacher = find('.inner', parent);

  assert.equal(innerParentAttacher.style.display, 'none', 'parent initially hidden');
  assert.equal(innerChildAttacher.style.display, 'none', 'child initially hidden');

  await click(find('#openParent', document.documentElement));

  assert.equal(innerParentAttacher.style.display, '', 'parent shown');

  await click(find('#openChild', innerParentAttacher));

  assert.equal(innerChildAttacher.style.display, '', 'child shown');

  await click(find('#closeChild', document.documentElement));

  assert.equal(innerChildAttacher.style.display, 'none', 'child hidden');
  assert.equal(innerParentAttacher.style.display, '', 'parent still shown');
});

test('isShown works with showOn/hideOn set to "click"', async function(assert) {
  assert.expect(3);

  this.setProperties({
    hideOn: 'click',
    isShown: true,
    showOn: 'click'
  });

  this.render(hbs`
    <button id="toggle-show">
      Click me, captain!

      {{#ember-attacher hideOn=hideOn
                        isShown=isShown
                        popperClass="hello"
                        showOn=showOn}}
        isShown w/ hideOn/ShowOn of 'click'
      {{/ember-attacher}}
    </button>
  `);

  // Need to wait for didInsertElement to process
  await wait();

  let popper = find('.hello', document.documentElement);
  let innerAttacher = find('.inner', popper);

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  await click(find('#toggle-show', document.documentElement));

  await wait();

  assert.equal(innerAttacher.style.display, 'none', 'Now hidden');

  await click(find('#toggle-show', document.documentElement));

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

  this.setProperties({
    isShown: false,
    hideOn: 'none',
    showOn: 'none'
  });

  this.render(hbs`
    <button id="open" {{action 'openPopover'}}>
      Click me, captain!

      {{#ember-attacher hideOn=hideOn
                        isShown=isShown
                        popperClass="hello"
                        showOn=showOn}}
        isShown w/ hideOn/ShowOn of 'none'

        <button id="close" {{action 'closePopover'}}>
          Close
        </button>

      {{/ember-attacher}}
    </button>
  `);

  let popper = find('.hello', document.documentElement);
  let innerAttacher = find('.inner', popper);

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  await click(find('#open', document.documentElement));

  assert.equal(innerAttacher.style.display, '', 'Now shown');

  await click(find('#close', document.documentElement));

  assert.equal(innerAttacher.style.display, 'none', 'Hidden again');
});

test('showOn/hideOn set to "click"', async function(assert) {
  assert.expect(3);

  this.setProperties({
    hideOn: 'click',
    showOn: 'click'
  });

  this.render(hbs`
    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher hideOn=hideOn
                        popperClass="hello"
                        showOn=showOn}}
        showOn/hideOn "click"
      {{/ember-attacher}}
    </button>
  `);

  // Need to wait for didInsertElement to add the click listener
  await wait();

  let popper = find('.hello', document.documentElement);
  let innerAttacher = find('.inner', popper);

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  await click(find('#click-toggle', document.documentElement));

  await wait();

  assert.equal(innerAttacher.style.display, '', 'Now shown');

  await click(find('#click-toggle', document.documentElement));

  assert.equal(innerAttacher.style.display, 'none', 'Hidden again');
});
