/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: { "/*": ["./src/data/study-hub/**/*", "./src/data/vault/**/*"] },
};
export default nextConfig;
