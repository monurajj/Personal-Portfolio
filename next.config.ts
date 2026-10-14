import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Gallery media is served from Cloudinary.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  experimental: {
    serverActions: {
      // The admin media uploader posts whole files through a Server Action, and the
      // action itself allows up to 25 MB (actions/admin.ts). Default is 1 MB; this
      // matches that cap with room for multipart overhead.
      bodySizeLimit: "26mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
