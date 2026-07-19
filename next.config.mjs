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

    // /gateway/* lo maneja app/gateway/[...path]/route.ts (reenvía Authorization).
    // Solo dejamos Socket.IO por rewrite (polling).
    return [
      {
        source: "/socket.io",
        destination: `${GATEWAY_ORIGIN}/socket.io/`,
      },
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
