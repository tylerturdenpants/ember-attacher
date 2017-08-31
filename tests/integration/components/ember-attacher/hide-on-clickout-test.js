import hbs from 'htmlbars-inline-precompile';
import { click, find } from 'ember-native-dom-helpers';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('ember-attacher', 'Integration | Component | hideOn "clickout"', {
  integration: true
});

test('hides when an element outside the target is clicked', async function(assert) {
  assert.expect(3);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <div id="parent">
      {{#ember-attacher id='attachment'
                        hideOn='clickout'
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  // Make sure the attachment is still shown when the target is clicked
  await click(find('#parent'));

  assert.equal(innerAttacher.style.display, '', 'Still shown');

  await click(find('#focus-me'));

  assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
});

test('with interactive=false: hides when attachment is clicked', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    <div id="parent">
      {{#ember-attacher id='attachment'
                        hideOn='clickout'
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  await click(innerAttacher);

  assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
});

test("with interactive=true: doesn't hide when attachment is clicked", async function(assert) {
  assert.expect(4);

  this.render(hbs`
    <input type="text" id="focus-me"/>

    <div id="parent">
      {{#ember-attacher id='attachment'
                        hideOn='clickout'
                        interactive=true
                        isShown=true}}
        hideOn click
      {{/ember-attacher}}
    </div>
  `);

  const innerAttacher = find('#attachment > .inner');

  assert.equal(innerAttacher.style.display, '', 'Initially shown');

  // Make sure attachment stays shown when attachment clicked
  await click(innerAttacher);

  assert.equal(innerAttacher.style.display, '', 'Still shown');

  // Make sure attachment stays shown when target clicked
  await click(find('#parent'));

  assert.equal(innerAttacher.style.display, '', 'Still shown');

  // Make sure attachment is hidden once an element outside target or attachment is clicked
  await click(find('#focus-me'));

  assert.equal(innerAttacher.style.display, 'none', 'Now hidden');
});
