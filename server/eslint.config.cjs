const js = require('@eslint/js')
const globals = require('globals')
const { defineConfig, globalIgnores } = require('eslint/config')

module.exports = defineConfig([
  globalIgnores(['node_modules', 'coverage', 'src/**', 'prisma/**', 'scripts/**']),
  {
    files: ['tests/**/*.js', 'src/__tests__/**/*.js', 'jest.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
])
