/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.livemart.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  experimental: {
    // ppr: true,  // Canary 버전에서만 사용 가능
    // reactCompiler: true,  // babel-plugin-react-compiler 필요
  },
  async rewrites() {
    const apiBase = process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api-gateway:8080';
    return [
      // OAuth2 소셜 로그인 → api-gateway → user-service
      {
        source: '/oauth2/:path*',
        destination: `${apiBase}/oauth2/:path*`,
      },
      {
        source: '/login/:path*',
        destination: `${apiBase}/login/:path*`,
      },
      // 모든 API → API Gateway (8080)
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
