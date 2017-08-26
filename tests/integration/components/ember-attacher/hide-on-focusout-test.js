import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "focusout"', {
  integration: true
});

test('hides when the target loses focus', function(assert) {
  assert.expect(3);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher class='hello'
                        hideOn='focusout'
                        showOn='click'}}
        hideOn click
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  return click(find('#click-toggle')).then(() => {
    assert.equal(innerAttacher.style.display, '', 'Now shown');

    document.getElementById('focus-me').focus();

    return wait().then(() => {
      assert.equal(innerAttacher.style.display, 'none', 'hidden again');
    });
  });
});

test('with interactive=false: hides when the attachment gains focus', function(assert) {
  assert.expect(3);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher class='hello'
                        hideOn='focusout'
                        showOn='click'}}
        <input type="text" id="attachment-focus-me"/>
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  return click(find('#click-toggle')).then(() => {
    assert.equal(innerAttacher.style.display, '', 'Now shown');

    document.getElementById('attachment-focus-me').focus();

    return wait().then(() => {
      assert.equal(innerAttacher.style.display, 'none', 'hidden again');
    });
  });
});

test("with interactive=true: doesn't hide when the attachment gains focus", function(assert) {
  assert.expect(4);

  this.render(hbs`
    <input type="text" id="outer-focus-me"/>

    <button id="click-toggle">
      Click me, captain!

      {{#ember-attacher class='hello'
                        hideOn='focusout'
                        interactive=true
                        showOn='click'}}
        <input type="text" id="attachment-focus-me"/>
      {{/ember-attacher}}
    </button>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, 'none', 'Initially hidden');

  return click(find('#click-toggle')).then(() => {
    assert.equal(innerAttacher.style.display, '', 'Now shown');

    document.getElementById('attachment-focus-me').focus();

    return wait().then(() => {
      assert.equal(innerAttacher.style.display, '', 'Still shown');

      document.getElementById('outer-focus-me').focus();

      return wait().then(() => {
        assert.equal(innerAttacher.style.display, '', 'Hidden again');
      });
    });
  });
});
