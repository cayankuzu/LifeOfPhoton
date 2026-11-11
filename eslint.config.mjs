// ESLint flat configuration. Next.js 16 removed `next lint`; `npm run lint` runs `eslint .` with this file.
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // what `"extends": "eslint:recommended"` was in the old .eslintrc.json
  js.configs.recommended,
  ...nextVitals,
  ...nextTypeScript,
  {
    linterOptions: {
      // an `eslint-disable` that no longer suppresses anything is reported (as a warning, like `true` did in .eslintrc)
      reportUnusedDisableDirectives: 'warn',
    },
    rules: {
      'array-callback-return': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  globalIgnores(['.next/', 'out/', 'node_modules/', 'coverage/', 'public/', 'next-env.d.ts']),
]);
