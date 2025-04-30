/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,  
  transpilePackages: ['antd','@ant-design/icons'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5085/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 