import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test, todo } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ember-attacher', 'Integration | Component | ember attacher', {
  integration: true,
  beforeEach(){
    this.setProperties({
      hideOn: 'click',
      interactive: true,
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

todo('nested attachers open and close as expected', async function(assert) {
  assert.expect(6);

  this.on('closeChildPopover', () => {
    this.set('childIsShown', false);
  });

  this.on('openChildPopover', () => {
    this.set('childIsShown', true);
  });

  this.on('closeParentPopover', () => {
    this.set('parentIsShown', false);
  });

  this.on('openParentPopover', () => {
    this.set('parentIsShown', true);
  });

  this.setProperties({
    childIsShown: false,
    hideOn: 'none',
    parentIsShown: false,
    showOn: 'none'
  });

  //TODO: figure out how to fire actions from inside components
  this.render(hbs`
    <button id="openParent" {{action 'openParentPopover'}}>
      Open parent
      
      {{#ember-attacher
        hideOn=hideOn
        interactive=interactive
        isShown=parentIsShown
        popperClass="parent"
        showOn=showOn}}
        
        <button id="openChild" {{action 'openChildPopover'}}>
          Open child
    
          {{#ember-attacher
            hideOn=hideOn
            interactive=interactive
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

todo('isShown works with showOn/hideOn set to "click"', async function(assert) {
  assert.expect(3);
  this.on('closePopover', () => {
    this.set('isShown', false);
  });

  this.on('openPopover', () => {
    this.set('isShown', true);
  });

  this.render(hbs`
    <button id="open" {{action 'openPopover'}}>
      Click me, captain!
      
      {{#ember-attacher
        hideOn=hideOn
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

todo('isShown works with showOn/hideOn set to "none"', async function(assert) {
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
    <button id="open" {{action 'openPopover'}}>
      Click me, captain!
      
      {{#ember-attacher
        hideOn=hideOn
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

todo('showOn/hideOn set to "click"', async function(assert) {
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
