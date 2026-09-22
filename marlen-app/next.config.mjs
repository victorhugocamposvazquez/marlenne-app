/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverComponentsExternalPackages: ['edge-tts-universal', 'mpg123-decoder'],
  },
  poweredByHeader: false,
};
export default nextConfig;
