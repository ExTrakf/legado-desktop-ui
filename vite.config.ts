import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    // MICL 用到 ::picker(select):popover-open 等现代 CSS，lightningcss 无法解析（无 esbuild 可用），
    // 干脆关闭 CSS 压缩，确保构建通过。
    cssMinify: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:2323',
        changeOrigin: true,
      },
    },
  },
})
