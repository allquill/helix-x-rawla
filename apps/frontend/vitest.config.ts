import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
  resolve: {
    // Same reason as vite.config.ts, and the same list — vitest does not read
    // vite.config.ts here, so the two must be edited together.
    dedupe: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      '@helix-x/core-sdk',
      '@helix-x-rawla/client-sdk',
      'zod',
      'react-hook-form',
      '@hookform/resolvers',
    ],
  },
});
