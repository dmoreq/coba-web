import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
      (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");
    if (!apiUrl) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
