/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
};
export default nextConfig;
