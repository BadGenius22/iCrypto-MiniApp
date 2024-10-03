/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['wagmi'],
  env: {
    BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    BASE_SEPOLIA_CHAIN_ID: String(process.env.BASE_SEPOLIA_CHAIN_ID || ''),
  },
  webpack: (config) => {
    // Ensure watchOptions exists
    config.watchOptions = config.watchOptions || {};

    // Add contracts directory to ignored list
    config.watchOptions.ignored = [
      ...(Array.isArray(config.watchOptions.ignored) ? config.watchOptions.ignored : []),
      '**/contracts/**',
    ];

    return config;
  },
};

module.exports = nextConfig;
