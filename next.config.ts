import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // Next.js treats /@handle as a parallel-route slot, not a path.
    // Rewrite /@handle → /agent/handle so profile links with @ work.
    return [
      {
        source: '/@:handle',
        destination: '/agent/:handle',
      },
    ]
  },
};

export default nextConfig;
