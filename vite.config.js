import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr'],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tracker: resolve(__dirname, 'internal/tracker/index.html'),
      },
    },
  },
})
