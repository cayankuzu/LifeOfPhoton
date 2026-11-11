import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

/** Width and height of a JPEG, from its start-of-frame segment. */
function jpegSize(data: Buffer): { width: number; height: number } {
  let at = 2;
  while (at + 9 < data.length) {
    const marker = data[at + 1];
    // SOF0 to SOF15, except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: data.readUInt16BE(at + 5), width: data.readUInt16BE(at + 7) };
    }
    at += 2 + data.readUInt16BE(at + 2);
  }
  throw new Error('no frame header');
}

/**
 * A static image import as Next.js compiles it (src, width, height and a blur placeholder) rather than Vite's bare URL,
 * so that next/image renders in the tests as it does in the build. The placeholder is a stand-in.
 */
const staticImages: Plugin = {
  name: 'next-static-images',
  enforce: 'pre',
  load(id) {
    if (!/\.jpe?g$/.test(id)) return null;
    const { width, height } = jpegSize(readFileSync(id));
    const image = {
      src: `/_next/static/media/${basename(id)}`,
      width,
      height,
      blurDataURL: 'data:image/jpeg;base64,',
      blurWidth: 8,
      blurHeight: 5,
    };
    return `export default ${JSON.stringify(image)};`;
  },
};

export default defineConfig({
  plugins: [staticImages],
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
