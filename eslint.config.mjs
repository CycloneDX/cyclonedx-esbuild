/*!
TODO LICENSE HEADER
*/

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import baseCfg, { globals } from './tools/code-style/eslint.config.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* eslint-disable jsdoc/valid-types */

/**
 * @type {import('tools/code-style/node_modules/eslint').Linter.Config[]}
 * @see https://eslint.org
 */
export default [
  ...baseCfg,
  {
    name: 'project-specific',
    rules: {
      complexity: ['error', { max: 15 }]
    }
  },
  {
    name: 'project-specific',
    files: ['src/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      'jsdoc/reject-any-type': 'off'
    }
  },
  {
    files: [
      '**/*.{test,spec}.{js,mjs,cjs,ts}',
      'tests/**.{js,mjs,cjs,ts}'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      }
    }
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
      },
    },
  },
  {
    files: ['examples/**/*.{js,mjs,cjs,ts}'],
    rules: {
      'no-console': 'off'
    },
  },
  {
    // global ignores must have nothing but a "ignores" property!
    // see https://github.com/eslint/eslint/discussions/17429#discussioncomment-6579229
    ignores: [
      'reports/',
      'dist/',
      'docs/api/',
      'docs/_build/',
      'docs/.venv/',
      'examples/**/dist/',
      'tools/',
      'tests/_testbeds/',
      'tests/_data/'
    ],
  },
]
