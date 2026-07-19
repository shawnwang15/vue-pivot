import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VuePivotTable',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    sourcemap: true,
    rollupOptions: {
      external: ['vue', '@tanstack/vue-table', '@vue-pivot/core'],
    },
  },
})
