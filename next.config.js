/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BASE_SEPOLIA_RPC_URL: "https://sepolia.base.org", // Replace with the actual Base Sepolia RPC URL
    BASE_SEPOLIA_CHAIN_ID: String(process.env.BASE_SEPOLIA_CHAIN_ID || ""),
  },
};

module.exports = nextConfig;
