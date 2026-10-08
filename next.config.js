/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: false,
  eslint: {
    // Keep production deploys from failing on lint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep production deploys from failing on type errors.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        port: '',
        search: '',
      },
    ],
  },
  webpack: (config) => {
    config.externals.push('bun:sqlite');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  },
};

export default config;
