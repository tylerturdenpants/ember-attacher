/* eslint-env node */
'use strict';

module.exports = {
  name: 'ember-attacher',

  included: function(/* app */) {
    this._super.included.apply(this, arguments);
  }
};
