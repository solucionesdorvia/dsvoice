/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.draeger.com",
      },
      {
        protocol: "https",
        hostname: "draeger.com",
      },
    ],
  },
};

export default nextConfig;
