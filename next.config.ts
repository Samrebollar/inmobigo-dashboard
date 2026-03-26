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
        source: '/dashboard/reports',
        destination: '/dashboard/reportes',
        permanent: true,
      },
      {
        source: '/dashboard/settings',
        destination: '/dashboard/configuracion',
        permanent: true,
      },
      {
        source: '/dashboard/profile',
        destination: '/dashboard/perfil',
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
