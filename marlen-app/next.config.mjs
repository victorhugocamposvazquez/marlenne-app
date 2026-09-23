/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverComponentsExternalPackages: ['edge-tts-universal', 'mpg123-decoder', 'web-push'],
  },
  poweredByHeader: false,
};
export default nextConfig;
