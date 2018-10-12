/* eslint-env node */
'use strict';

const FilterImports = require('babel-plugin-filter-imports');
const Funnel = require('broccoli-funnel');
const StripClassCallCheck = require('babel6-plugin-strip-class-callcheck');

module.exports = {
  name: require('./package').name,

  included(app) {
    this._super.included.apply(this, arguments);

    this._env = app.env;
    this._setupBabelOptions(app.env);
  },

  _hasSetupBabelOptions: false,
  _setupBabelOptions(env) {
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
        'imports': {
          'ember-attacher/-debug/helpers': [
            'assert',
            'debug',
            'debugOnError',
            'stripInProduction'
          ]
        }
      };
      babelOptions.plugins.push([FilterImports, strippedImports]);
      babelOptions.postTransformPlugins.push(StripClassCallCheck);
    }

    this._hasSetupBabelOptions = true;
  },

  treeForAddon(tree) {
    if (/production/.test(this._env)) {
      tree = new Funnel(tree, { exclude: [/-debug/] });
    }

    return this._super.treeForAddon.call(this, tree);
  },

  treeForAddonTestSupport(tree) {
    // intentionally not calling _super here
    // so that can have our `import`'s be
    // import { click, fillIn } from 'ember-native-dom-helpers';

    const namespacedTree = new Funnel(tree, {
      srcDir: '/',
      destDir: `/${this.moduleName()}`,
      annotation: `Addon#treeForTestSupport (${this.name})`
    });

    return this.preprocessJs(namespacedTree, '/', this.name, {
      registry: this.registry
    });
  }
};
