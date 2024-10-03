/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['wagmi'],
  env: {
    BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    BASE_SEPOLIA_CHAIN_ID: String(process.env.BASE_SEPOLIA_CHAIN_ID || ''),
  },
  webpack: (config, { isServer }) => {
    // Exclude contracts directory from being processed by webpack
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [...(config.watchOptions.ignored || []), '**/contracts/**'],
    };
    return config;
  },
};

module.exports = nextConfig;
