/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['wagmi'],
  env: {
    BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    BASE_SEPOLIA_CHAIN_ID: String(process.env.BASE_SEPOLIA_CHAIN_ID || ''),
  },
};

module.exports = nextConfig;
