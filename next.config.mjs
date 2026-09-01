/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverComponentsExternalPackages: ['edge-tts-universal'],
  },
  poweredByHeader: false,
};
export default nextConfig;
