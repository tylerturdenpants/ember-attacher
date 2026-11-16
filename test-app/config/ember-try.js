'use strict';

const { embroiderOptimized } = require('@embroider/test-setup');

module.exports = async function () {
  return {
    packageManager: 'pnpm',
    command: 'pnpm run test',
    scenarios: [
      {
        name: 'ember-lts-3.28',
        npm: {
          devDependencies: {
            'ember-source': '~3.28.12',
            'ember-qunit': '~5.1.5',
            '@ember/test-helpers': '~2.9.6',
          },
        },
      },
      {
        name: 'ember-lts-6.12',
        npm: {
          devDependencies: {
            'ember-source': '~6.12.0',
          },
        },
      },
      embroiderOptimized(),
    ],
  };
};
