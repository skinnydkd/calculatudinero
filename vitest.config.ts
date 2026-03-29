import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@lib': resolve(__dirname, './src/lib'),
      '@data': resolve(__dirname, './src/data'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
