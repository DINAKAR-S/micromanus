/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer ships its own React reconciler; keep it external to the server bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Pin the tracing root to this project (a parent lockfile exists on this machine).
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
