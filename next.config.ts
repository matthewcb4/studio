
import type {NextConfig} from 'next';
import withPWA from '@ducanh2912/next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  screenshots: [
    {
      src: 'https://picsum.photos/seed/1/720/1280',
      sizes: '720x1280',
      type: 'image/jpeg',
      form_factor: 'narrow',
      label: 'Dashboard View'
    },
    {
      src: 'https://picsum.photos/seed/2/720/1280',
      sizes: '720x1280',
      type: 'image/jpeg',
      form_factor: 'narrow',
      label: 'Workout Logging'
    },
    {
      src: 'https://picsum.photos/seed/3/1280/720',
      sizes: '1280x720',
      type: 'image/jpeg',
      form_factor: 'wide',
      label: 'Progress Tracking'
    },
    {
      src: 'https://picsum.photos/seed/4/1280/720',
      sizes: '1280x720',
      type: 'image/jpeg',
      form_factor: 'wide',
      label: 'AI Workout Generator'
    }
  ]
});

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https'
        ,
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default pwaConfig(nextConfig);
