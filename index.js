/* eslint-env node */
'use strict';

const FilterImports = require('babel-plugin-filter-imports');
const Funnel = require('broccoli-funnel');
const RemoveImports = require('./lib/babel-plugin-remove-imports');
const StripClassCallCheck = require('babel6-plugin-strip-class-callcheck');

module.exports = {
  name: 'ember-attacher',

  included: function(app) {
    this._super.included.apply(this, arguments);

    this._env = app.env;
    this._setupBabelOptions(app.env);
  },

  _hasSetupBabelOptions: false,
  _setupBabelOptions: function(env) {
    if (this._hasSetupBabelOptions) {
      return;
    }

    if (/production/.test(env)) {
      // In some versions of Ember, this.options is undefined during tests
      this.options = this.options || {};

      // Make sure the babel options are accessible
      const babelOptions = this.options.babel = this.options.babel || {};

      babelOptions.plugins = babelOptions.plugins || [];
      babelOptions.postTransformPlugins = babelOptions.postTransformPlugins || [];

      const strippedImports = {
        'ember-attacher/-debug/helpers': [
          'assert',
          'debug',
          'debugOnError',
          'stripInProduction'
        ]
      };
      babelOptions.plugins.push([FilterImports, strippedImports]);
      babelOptions.plugins.push([RemoveImports, 'ember-attacher/-debug/helpers']);
      babelOptions.postTransformPlugins.push(StripClassCallCheck);
    }

    this._hasSetupBabelOptions = true;
  },

  treeForAddon: function(tree) {
    if (/production/.test(this._env)) {
      tree = new Funnel(tree, { exclude: [ /-debug/ ] });
    }

    return this._super.treeForAddon.call(this, tree);
  }
};
