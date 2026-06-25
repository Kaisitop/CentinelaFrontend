/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
