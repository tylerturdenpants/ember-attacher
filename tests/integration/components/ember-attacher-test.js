import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ember-attacher', 'Integration | Component | ember attacher', {
  integration: true,
  beforeEach(){
    this.setProperties({
      hideOn: 'click',
      isShown: false,
      showOn: 'click'
    });
  }
});

test('it renders', function(assert) {
  assert.expect(3);

  this.render(hbs`
    <div>
      {{#ember-attacher 
        hideOn=hideOn
        isShown=isShown
        popperClass="hello"
        showOn=showOn}}
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

test('isShown works with showOn/hideOn set to "none"', async function(assert) {
  assert.expect(3);
  this.on('closePopover', () => {
    this.set('isShown', false);
  });

  this.on('openPopover', () => {
    this.set('isShown', true);
  });

  this.setProperties({
    hideOn: 'none',
    showOn: 'none'
  });

  this.render(hbs`
    <button id="close" {{action 'closePopover'}}>
      Close
    </button>
    <button id="open" {{action 'openPopover'}}>
      Click me, captain!
      
      {{#ember-attacher
        hideOn=hideOn
        isShown=isShown
        popperClass="hello"
        showOn=showOn}}
        isShown w/ hideOn/ShowOn of 'none'
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
    <button id="click">
      Click me, captain!
      
      {{#ember-attacher
        hideOn=hideOn
        popperClass="hello"
        showOn=showOn}}
        showOn/hideOn "click"
      {{/ember-attacher}}
    </button>
  `);

  let popper = find('.hello', document.documentElement);
  let innerAttacher = find('.inner', popper);

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  //TODO: should not need to click twice here, something is up!
  await click(find('#click', document.documentElement));
  await click(find('#click', document.documentElement));

  assert.equal(innerAttacher.style.display, '', 'Now shown');

  await click(find('#click', document.documentElement));

  assert.equal(innerAttacher.style.display, 'none', 'Hidden again');
});
