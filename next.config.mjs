/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: { "/*": ["./src/data/study-hub/**/*", "./src/data/vault/**/*"], "/api/pdf-worker": ["./node_modules/pdfjs-dist/build/pdf.worker.min.mjs"] },
};
export default nextConfig;
