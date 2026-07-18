import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Populate the module-level CLIENT_ID read in app/model/auth/wix-client.base.ts.
    env: {
      NEXT_PUBLIC_WIX_CLIENT_ID: 'test-client-id',
    },
    coverage: {
      provider: 'v8',
      include: [
        'app/model/auth/**',
        'components/auth/**',
        'app/login/**',
        'app/signup/**',
        'app/forgot-password/**',
      ],
    },
  },
  // Resolve the "@/*" alias from tsconfig.json (Vite 4 supports this natively).
  resolve: {
    tsconfigPaths: true,
  },
});
