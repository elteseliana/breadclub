'use strict';
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['apps-script/dist/**', 'node_modules/**', '.data/**'] },
  js.configs.recommended,
  {
    files: ['site/assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2018, sourceType: 'script',
      globals: Object.assign({}, globals.browser, { BreadClub: 'readonly', BreadClubConfig: 'readonly', BreadClubI18n: 'readonly', module: 'readonly' })
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^BreadClub', caughtErrors: 'none' }],
      'no-redeclare': ['error', { builtinGlobals: false }] // each file defines one shared global
    }
  },
  {
    files: ['apps-script/src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2018, sourceType: 'script',
      globals: { BreadClub: 'readonly', BreadClubServer: 'readonly', module: 'readonly', SpreadsheetApp: 'readonly',
        LockService: 'readonly', ContentService: 'readonly', Utilities: 'readonly' }
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^(BreadClubServer|doGet|doPost|setup)$', caughtErrors: 'none' }],
      'no-redeclare': ['error', { builtinGlobals: false }]
    }
  },
  {
    files: ['tools/**/*.js', 'tests/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: globals.node },
    rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] }
  },
  {
    // code inside page.evaluate() runs in the browser
    files: ['tests/e2e/**/*.js'],
    languageOptions: { globals: Object.assign({}, globals.node, { document: 'readonly' }) }
  }
];
