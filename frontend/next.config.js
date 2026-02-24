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
    return [
      // user-service 이메일 인증 직접 프록시 (user-service: 8085)
      {
        source: '/api/users/:path*',
        destination: 'http://localhost:8085/api/users/:path*',
      },
      // 그 외 모든 API → API Gateway (8080)
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
