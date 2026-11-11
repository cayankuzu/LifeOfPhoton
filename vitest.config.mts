import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // The test transform takes its JSX mode from tsconfig.json, where Next.js 16 insists on "react-jsx". It is stated here
  // as well, so that the tests do not depend on what Next.js writes there (with the "preserve" of Next.js 14 they failed).
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Several tests build the whole avenue, measure the tessellation error over the sphere or typeset the whole dossier
    // at every speed: about a second each on an idle machine, but tens of seconds on a loaded one or on a small CI
    // runner while the GPU tests keep SwiftShader busy on every core. The default of 5 s failed them spuriously;
    // a test that really hangs still fails after a minute.
    testTimeout: 60_000,
  },
});
