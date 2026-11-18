/* eslint-env node */
'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const webpackFallback = { util: false };

  const app = new EmberApp(defaults, {
    autoImport: {
      webpack: {
        resolve: {
          fallback: webpackFallback,
        },
      },
    },
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  const { maybeEmbroider } = require('@embroider/test-setup');
  return maybeEmbroider(app, {
    packagerOptions: {
      webpackConfig: {
        resolve: {
          fallback: webpackFallback,
        },
      },
    },
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
  });
};
