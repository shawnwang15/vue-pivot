import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@vue-pivot/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@vue-pivot/table': resolve(__dirname, '../../packages/table/src/index.ts'),
      '@vue-pivot/vue': resolve(__dirname, '../../packages/vue/src/index.ts'),
      '@vue-pivot/charts': resolve(__dirname, '../../packages/charts/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})
