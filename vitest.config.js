import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      // gas-entry.js only hands Google's global services to createApp; it runs only inside Google.
      exclude: ['src/gas-entry.js'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ['text'],
    },
  },
});
