import babelParser from '@babel/eslint-parser';
import eslintPluginEmberRecommended from 'eslint-plugin-ember/configs/recommended';
import decoratorPositionRecommended from 'eslint-plugin-decorator-position/config/recommended';
import nodePlugin from 'eslint-plugin-n';
import globals from 'globals';

const nodeFiles = [
  '.template-lintrc.js',
  'addon-main.js',
  'rollup.config.mjs',
  'blueprints/*/index.js',
];

export default [
  {
    ignores: [
      'eslint.config.mjs',
      'blueprints/**/files/**',
      'vendor/**',
      'dist/**',
      'tmp/**',
      'bower_components/**',
      'node_modules/**',
      'coverage/**',
      '.node_modules.ember-try/**',
      'bower.json.ember-try',
      'npm-shrinkwrap.json.ember-try',
      'package.json.ember-try',
      'package-lock.json.ember-try',
      'yarn.lock.ember-try',
    ],
  },
  ...eslintPluginEmberRecommended,
  ...decoratorPositionRecommended,
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        ecmaVersion: 2018,
        sourceType: 'module',
        babelOptions: {
          plugins: [['@babel/plugin-proposal-decorators', { version: 'legacy' }]],
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'ember/no-jquery': 'error',
      quotes: ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
      'prefer-const': 'error',
      indent: [
        'error',
        2,
        {
          CallExpression: { arguments: 'first' },
          FunctionDeclaration: { parameters: 'first' },
          FunctionExpression: { parameters: 'first' },
        },
      ],
      'ember/no-observers': 'off',
      'ember/no-runloop': 'off',
    },
  },
  {
    files: nodeFiles,
    rules: {
      'decorator-position/decorator-position': 'off',
    },
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        ecmaVersion: 2018,
        sourceType: 'script',
        babelOptions: {
          plugins: [],
        },
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      n: nodePlugin,
    },
    rules: {
      ...nodePlugin.configs['flat/recommended-script'].rules,
    },
  },
];
