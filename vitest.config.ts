import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/vite-env.d.ts', 'src/main.tsx'],
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
