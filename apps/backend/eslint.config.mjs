// ESLint 9 flat config.
//
// `@typescript-eslint/eslint-plugin`'s `flat/recommended` already wires up the
// parser and the plugin itself, so this config needs no `@eslint/js` import —
// that package is a transitive dep of eslint and pnpm's strict node_modules
// does not expose it to this app.
import tseslint from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  ...tseslint.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      // Decorator metadata and third-party client payloads make `any` common in
      // NestJS code; keep it visible without failing the task.
      '@typescript-eslint/no-explicit-any': 'warn',
      // `_`-prefixed params are the convention for deliberately unused args
      // (e.g. Swagger's `operationIdFactory: (_controllerKey, methodKey) => …`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
