import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => ['view', 'text', 'button', 'input', 'picker', 'image'].includes(tag),
        },
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/subPackages/financial-plan/__tests__/setup.ts'],
    include: ['src/**/*.spec.ts'],
    clearMocks: true,
  },
})
