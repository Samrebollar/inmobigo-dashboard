import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/dashboard/properties',
        destination: '/dashboard/condominios',
        permanent: true,
      },
      {
        source: '/dashboard/condominio',
        destination: '/dashboard/condominios',
        permanent: true,
      },
      {
        source: '/dashboard/condos',
        destination: '/dashboard/condominios',
        permanent: true,
      },
      {
        source: '/dashboard/residents',
        destination: '/dashboard/residentes',
        permanent: true,
      },
      {
        source: '/properties',
        destination: '/dashboard/condominios',
        permanent: true,
      },
      {
        source: '/condominios',
        destination: '/dashboard/condominios',
        permanent: true,
      }
    ]
  }
};

export default nextConfig;
