import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default [
  // =========================
  // Ignore patterns
  // =========================
  {
    ignores: ['build/**', 'node_modules/**', 'drizzle/**', 'eslint.config.mjs'],
  },
  // =========================
  // TypeScript files
  // =========================
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: [join(__dirname, 'tsconfig.json')],
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],

      // Imports
      'no-duplicate-imports': 'off',
      'import/no-duplicates': 'warn',
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'unused-imports/no-unused-imports': 'warn',

      // Code style
      camelcase: 'off',
      'prefer-const': 'error',
      'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 1 }],
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
]
