import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VuePivotVue',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      cssFileName: 'vue-pivot',
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        'vue',
        '@tanstack/vue-table',
        '@tanstack/vue-virtual',
        '@vue-pivot/core',
        '@vue-pivot/table',
      ],
    },
  },
})
