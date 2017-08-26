import hbs from 'htmlbars-inline-precompile';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | isShown', {
  integration: true
});

test('isShown works with showOn/hideOn set to "click"', function(assert) {
  assert.expect(3);

  this.render(hbs`
    <button id="toggle-show">
      Click me, captain!

      {{#ember-attacher class='hello'
                        hideOn='click'
                        isShown=true
                        showOn='click'}}
        isShown w/ hideOn/ShowOn of 'click'
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  return click(find('#toggle-show')).then(() => {
    assert.equal(innerAttacher.style.display, 'none', 'Now hidden');

    return click(find('#toggle-show')).then(() => {
      assert.equal(innerAttacher.style.display, '', 'Shown again after click');
    });
  });
});

test('isShown works with showOn/hideOn set to "none"', function(assert) {
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

      {{#ember-attacher class='hello'
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

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  return click(find('#open')).then(() => {
    assert.equal(innerAttacher.style.display, '', 'Now shown');

    return click(find('#close')).then(() => {
      assert.equal(innerAttacher.style.display, 'none', 'Hidden again');
    });
  });
});

test('nested attachers open and close as expected', function(assert) {
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

  return click(find('#openParent')).then(() => {
    assert.equal(innerParentAttacher.style.display, '', 'parent shown');

    return click(find('#openChild', innerParentAttacher)).then(() => {
      assert.equal(innerChildAttacher.style.display, '', 'child shown');

      return click(find('#closeChild')).then(() => {
        assert.equal(innerChildAttacher.style.display, 'none', 'child hidden');
        assert.equal(innerParentAttacher.style.display, '', 'parent still shown');
      });
    });
  });
});
