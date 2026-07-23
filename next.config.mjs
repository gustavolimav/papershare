/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14 needs this flag to invoke instrumentation.ts's register()
  // hook (infra/env.ts's startup validation) — stabilized by default in
  // Next.js 15+, where this option becomes a no-op.
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
