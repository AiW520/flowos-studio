import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      'import/no-anonymous-default-export': 'off',
      // UI state is intentionally reset when a modal or selected project changes.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next*/**',
    '.repo-state-check/**',
    'node_modules/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'opentu/**',
  ]),
])
