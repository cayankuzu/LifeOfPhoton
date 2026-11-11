/**
 * Headers sent with every response.
 *
 * A Content-Security-Policy is deliberately absent: it has to be developed against the running application
 * (Next.js emits inline scripts, KaTeX inline styles), and a policy that was never exercised is worse than none.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/**
 * The models in public/models keep their file names when their content changes, so they cannot be cached as
 * immutable: a copy is used for one day, then for up to a week more while a fresh one is fetched in the background.
 */
const modelCacheHeaders = [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // three 0.169 is an ES module written in ES2018 syntax, which Next.js 14 bundles as it is, so this is probably
  // redundant by now. It stays until a production build without it has been checked.
  transpilePackages: ['three'],
  async headers() {
    const rules = [{ source: '/:path*', headers: securityHeaders }];
    // In development a model replaced on disk has to show up on the next reload, so only production caches them
    if (process.env.NODE_ENV === 'production') {
      rules.push({ source: '/models/:path*', headers: modelCacheHeaders });
    }
    return rules;
  },
};

export default nextConfig;
