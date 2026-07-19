import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.{test,spec}.ts', 'packages/**/__tests__/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@vue-pivot/core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@vue-pivot/table': resolve(__dirname, 'packages/table/src/index.ts'),
      '@vue-pivot/vue': resolve(__dirname, 'packages/vue/src/index.ts'),
      '@vue-pivot/charts': resolve(__dirname, 'packages/charts/src/index.ts'),
    },
  },
})
