module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:ember-suave/recommended'
  ],
  env: {
    browser: true
  },
  rules: {
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true, 'avoidEscape': true }],
    'ember-suave/no-const-outside-module-scope': 0,
    'ember-suave/no-direct-property-access': 1,
    'ember-suave/require-access-in-comments': 0,
    'prefer-const': 2,
    'indent': ['error', 2, {
      "CallExpression": { 'arguments': 'first' },
      'FunctionDeclaration': { 'parameters': 'first' },
      'FunctionExpression': { 'parameters': 'first' }
    }],
  }
};
