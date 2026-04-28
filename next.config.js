/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow subdomain dev origins (e.g. {tenant}.localhost:3000) to request Next.js assets.
  // Next.js expects host patterns (no scheme). Avoid including ports in patterns.
  allowedDevOrigins: ['localhost', '*.localhost'],
};

module.exports = nextConfig;
