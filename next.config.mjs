/** @type {import('next').NextConfig} */

// Origen HTTP del gateway (EC2). Solo servidor/build — no se expone al browser.
const GATEWAY_ORIGIN = (
  process.env.GATEWAY_ORIGIN ||
  process.env.NEXT_PUBLIC_GATEWAY_ORIGIN ||
  ""
).replace(/\/$/, "");

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!GATEWAY_ORIGIN) return [];

    return [
      // Browser → HTTPS same-origin → proxy → HTTP gateway (evita Mixed Content)
      {
        source: "/gateway/:path*",
        destination: `${GATEWAY_ORIGIN}/api/:path*`,
      },
      // Socket.IO (polling). WebSocket upgrade no funciona bien en Vercel.
      {
        source: "/socket.io/:path*",
        destination: `${GATEWAY_ORIGIN}/socket.io/:path*`,
      },
    ];
  },
  async headers() {
    const workerHeaders = [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
    ];
    return [
      { source: "/push/onesignal/:path*", headers: workerHeaders },
      { source: "/OneSignalSDKWorker.js", headers: workerHeaders },
      { source: "/OneSignalSDKUpdaterWorker.js", headers: workerHeaders },
    ];
  },
};

export default nextConfig;
