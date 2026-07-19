import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
            {
        protocol: "https",
        hostname: "api.vod.spokhrel.dev",
        pathname: "/storage/**",
      },
      { protocol: "http", hostname: "localhost", pathname: "/storage/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/home/watch/:video_id", destination: "/watch/:video_id", permanent: true },
    ];
  },
};

export default nextConfig;
