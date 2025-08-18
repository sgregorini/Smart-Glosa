/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ignora erros do ESLint no build
  },
  typescript: {
    ignoreBuildErrors: true, // ignora erros de TS no build
  },
}

module.exports = nextConfig
