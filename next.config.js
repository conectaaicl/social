/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.replicate.delivery" },
      { protocol: "https", hostname: "cdninstagram.com" },
    ],
  },
}

module.exports = nextConfig
