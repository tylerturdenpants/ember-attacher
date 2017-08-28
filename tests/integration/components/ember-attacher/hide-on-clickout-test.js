import hbs from 'htmlbars-inline-precompile';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "clickout"', {
  integration: true
});

test('hides when an element outside the target is clicked', function(assert) {
  assert.expect(3);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <div id="parent">
      {{#ember-attacher class='hello'
                        hideOn='clickout'
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  // Make sure the attachment is still shown when the target is clicked
  return click(find('#parent')).then(() => {
    assert.equal(innerAttacher.style.display, '', 'Still shown');

    return click(find('#focus-me')).then(() => {
      assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
    });
  });
});

test('with interactive=false: hides when attachment is clicked', function(assert) {
  assert.expect(2);

  this.render(hbs`
    <div id="parent">
      {{#ember-attacher class='hello'
                        hideOn='clickout'
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  return click(innerAttacher).then(() => {
    assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
  });
});

test("with interactive=true: doesn't hide when attachment is clicked", function(assert) {
  assert.expect(4);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <div id="parent">
      {{#ember-attacher class='hello'
                        hideOn='clickout'
                        interactive=true
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('.hello > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  // Make sure attachment stays shown when attachment clicked
  return click(innerAttacher).then(() => {
    assert.equal(innerAttacher.style.display, '', 'Still shown');

    // Make sure attachment stays shown when target clicked
    return click(find('#parent')).then(() => {
      assert.equal(innerAttacher.style.display, '', 'Still shown');

      // Make sure attachment is hidden once an element outside target or attachment is clicked
      return click(find('#focus-me')).then(() => {
        assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
      });
    });
  });
});
