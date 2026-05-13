/** @type {import('next').NextConfig} */

// Dominios autorizados a embeber este sitio dentro de un iframe.
// Override en Railway con la env var ALLOWED_FRAME_ANCESTORS si hace falta
// agregar/quitar dominios sin redeployar codigo.
//   Ejemplo: "https://dragersolutions.com.ar https://www.dragersolutions.com.ar"
const FRAME_ANCESTORS =
  process.env.ALLOWED_FRAME_ANCESTORS ??
  "'self' https://dragersolutions.com.ar https://www.dragersolutions.com.ar";

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${FRAME_ANCESTORS};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
