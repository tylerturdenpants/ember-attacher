import globals from 'globals';
import js from '@eslint/js';
import ember from 'eslint-plugin-ember/recommended';
import n from 'eslint-plugin-n';
import babelParser from '@babel/eslint-parser/experimental-worker';

const esmParserOptions = {
  ecmaFeatures: { modules: true },
  ecmaVersion: 'latest',
};

export default [
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', '.node_modules.ember-try/', '!**/.*'],
  },
  js.configs.recommended,
  ember.configs.base,
  ember.configs.gjs,
  {
    files: ['**/*.js'],
    languageOptions: {
      parser: babelParser,
    },
  },
  {
    files: ['**/*.{js,gjs}'],
    languageOptions: {
      parserOptions: esmParserOptions,
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    ...n.configs['flat/recommended-script'],
    files: ['**/*.cjs', 'config/**/*.js'],
    plugins: { n },
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 'latest',
      globals: { ...globals.node },
    },
  },
  {
    ...n.configs['flat/recommended-module'],
    files: ['**/*.mjs'],
    plugins: { n },
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parserOptions: esmParserOptions,
      globals: { ...globals.node },
    },
  },
];
