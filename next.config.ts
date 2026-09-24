import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Compact runtime loads a WASM module from disk; keep it out of the
  // server bundle so Node resolves it natively.
  serverExternalPackages: ["@midnight-ntwrk/compact-runtime", "@midnight-ntwrk/onchain-runtime-v3"],
  poweredByHeader: false,
};

export default nextConfig;
