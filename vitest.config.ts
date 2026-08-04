import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: [
      'e2e/**',
      'node_modules/**',
      '.next/**',
      '**/*.e2e.test.ts',
      '**/*.spec.ts',
    ],
    env: {
      JWT_SECRET: 'test-jwt-secret-for-unit-tests',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
