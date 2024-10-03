/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['wagmi'],
  env: {
    BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    BASE_SEPOLIA_CHAIN_ID: String(process.env.BASE_SEPOLIA_CHAIN_ID || ''),
  },
  webpack: (config, { isServer }) => {
    // Ensure watchOptions and ignored exist
    config.watchOptions = config.watchOptions || {};
    config.watchOptions.ignored = config.watchOptions.ignored || [];

    // Add contracts directory to ignored list
    if (Array.isArray(config.watchOptions.ignored)) {
      config.watchOptions.ignored.push('**/contracts/**');
    } else if (typeof config.watchOptions.ignored === 'string') {
      config.watchOptions.ignored = [config.watchOptions.ignored, '**/contracts/**'];
    } else {
      config.watchOptions.ignored = ['**/contracts/**'];
    }

    return config;
  },
};

module.exports = nextConfig;
