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
  // `next dev` otherwise writes an AGENTS.md into the repository whenever it detects a coding agent;
  // the repository keeps its documentation in README.md.
  agentRules: false,
  // No `transpilePackages`: three 0.169 is published as ES modules in ES2018 syntax, which every browser Next.js 16
  // supports runs as it is. Checked with two production builds of 16.4.6 (Turbopack): with `transpilePackages: ['three']`
  // the client JavaScript differed only in that three's own `typeof window` guard was folded away (21 bytes).
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
