import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [],
    pool: 'threads',
    isolate: false,
  },
})
