import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    globals: true,
    // jsdom + fake-indexeddb lets the persistence layer be tested alongside the
    // pure engine functions without a browser.
    environment: 'jsdom',
    // .tsx too: the character renderer is asserted by rendering it and
    // measuring the SVG it emits, which needs JSX.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
