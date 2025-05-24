/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,  
  transpilePackages: ['antd','@ant-design/icons'],
  async rewrites() {
    // 使用占位符，在运行时会被替换
    const apiUrl = 'http://__API_URL_PLACEHOLDER__';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;