import type { NextConfig } from "next";

// Static export so the site can be hosted on GitHub Pages behind the
// rciu.org custom domain (same architecture as mhida.org).
// basePath is injected at build time by the deploy workflow when the
// site is served from a subpath; it's empty for local dev and for the
// custom domain.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  // Emit each page as <route>/index.html so any static host
  // (GitHub Pages, local preview servers) resolves URLs directly.
  trailingSlash: true,
  basePath,
  images: {
    // GitHub Pages has no image-optimization server.
    unoptimized: true,
  },
};

export default nextConfig;
