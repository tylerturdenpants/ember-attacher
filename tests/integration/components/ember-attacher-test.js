import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ember-attacher', 'Integration | Component | ember attacher', {
  integration: true
});

test('it renders', function(assert) {
  // Template block usage:
  this.render(hbs`
    <div>
      {{#ember-attacher popperClass="hello"}}
        popper text
      {{/ember-attacher}}
    </div>
  `);

  let popper = document.querySelector('.hello');
  let innerAttacher = popper.querySelector('.inner');

  assert.ok(innerAttacher);

  assert.ok(innerAttacher.querySelector('div[x-circle]'));

  let innerHTML = innerAttacher.innerHTML.trim();

  assert.equal(innerHTML.indexOf('popper text'), 0);
});
