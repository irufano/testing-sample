import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // This app fetches data (with loading/error state) inside useEffect on
      // mount/dependency change, without a data-fetching library — the standard
      // pattern this rule flags as "setState directly in an effect". Disabled
      // rather than distorting that pattern to dodge the heuristic.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
