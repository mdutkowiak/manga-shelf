import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Stopniowe typowanie istniejącego kodu: błąd tylko dla nowych plików (patrz override poniżej)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Wzorzec "pobierz dane w useEffect i ustaw stan" jest w projekcie powszechny; do przejścia na TanStack Query/Server Components
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Pliki objęte audytem bezpieczeństwa muszą być typowane ściśle
    files: ['src/lib/api-auth.ts', 'src/lib/safe-fetch.ts', 'src/lib/rate-limit.ts', 'src/lib/admin-config.ts', 'src/proxy.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
