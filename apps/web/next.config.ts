import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Produit un serveur autonome et leger pour l'image Docker
  output: "standalone",
  cacheComponents: true,
  allowedDevOrigins: ["192.168.2.13"],
  partialPrefetching: true,
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
