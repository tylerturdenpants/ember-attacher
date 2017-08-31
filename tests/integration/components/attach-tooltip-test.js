import hbs from 'htmlbars-inline-precompile';
import { find } from 'ember-native-dom-helpers';
import { getOwner } from '@ember/application';
import { moduleForComponent, test } from 'ember-qunit';

moduleForComponent('attach-tooltip', 'Integration | Component | attach tooltip', {
  afterEach() {
    getOwner(this).resolveRegistration('config:environment').emberAttacher = {};
  },
  integration: true
});

test('has the default classes', function(assert) {
  this.render(hbs`
    <div>
      {{#attach-tooltip id='tooltip-with-class' class='some-class'}}
        tooltip text
      {{/attach-tooltip}}
    </div>

    <div id="other-target">
      {{#attach-tooltip id='tooltip-with-no-class'}}
        tooltip text
      {{/attach-tooltip}}
    </div>
  `);

  const tooltipWithClass = find('#tooltip-with-class');

  assert.ok(
    tooltipWithClass
      .className
      .startsWith('ember-attacher-popper ember-attacher-tooltip some-class'),
    'it adds the default classes to tooltips with a class'
  );

  const tooltipWithNoClass = find('#tooltip-with-no-class');

  assert.ok(
    tooltipWithNoClass
      .className
      .startsWith('ember-attacher-popper ember-attacher-tooltip'),
    'it adds the defaults classes to tooltips with no class'
  );
});

test('uses the user-supplied default tooltip class', function(assert) {
  getOwner(this).resolveRegistration('config:environment').emberAttacher = {
    tooltipClass: 'different-default'
  };

  this.render(hbs`
    <div id="target">
      {{#attach-tooltip id='attachment' class='some-class'}}
        tooltip text
      {{/attach-tooltip}}
    </div>
  `);

  const tooltip = find('#attachment');

  assert.ok(
    tooltip.className.startsWith('different-default some-class'),
    'it adds the user-supplied default classes'
  );
});

test('it adds aria-describedby to the target and has the default classes', function(assert) {
  this.set('showTooltip', true);

  this.render(hbs`
    <div id="target">
      {{#if showTooltip}}
        {{#attach-tooltip id='attachment'}}
          tooltip text
        {{/attach-tooltip}}
      {{/if}}
    </div>

    <div id="other-target">
      {{#attach-tooltip class='tooltip-with-no-initial-id'}}
        tooltip text
      {{/attach-tooltip}}
    </div>
  `);

  const target = find('#target');
  const tooltip = find('#attachment');

  assert.equal(target.getAttribute('aria-describedby'),
               tooltip.id,
               "target receives aria-describedby with tooltip's ID");

  this.set('showTooltip', false);

  assert.notOk(target.hasAttribute('aria-describedby'),
               'it removes aria-describedby on destruction');

  const tooltipWithNoInitialId = find('.tooltip-with-no-initial-id');

  assert.ok(tooltipWithNoInitialId.id, 'tooltip gets generated ID when no ID is supplied');

  assert.equal(find('#other-target').getAttribute('aria-describedby'),
               tooltipWithNoInitialId.id,
               "target receives aria-describedby with tooltip's generated ID");
});
