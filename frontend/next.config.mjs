/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [
    "192.168.1.35",
    "192.168.1.35:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
  experimental: {
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
};

export default nextConfig;
