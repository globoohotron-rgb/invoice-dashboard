import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'prisma/', 'tests/'],
    },
    // Run tests sequentially to avoid DB conflicts
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})
