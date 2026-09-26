/** @type {import('next').NextConfig} */
const appBuild = (process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev').trim();

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD: appBuild,
  },
  experimental: {
    typedRoutes: false,
    serverComponentsExternalPackages: ['edge-tts-universal', 'mpg123-decoder', 'web-push'],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        source: '/app-build.txt',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        source: '/ops-embed.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};
export default nextConfig;
