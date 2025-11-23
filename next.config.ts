
import type {NextConfig} from 'next';
import withPWA from '@ducanh2912/next-pwa';
import type { PluginOptions } from '@ducanh2912/next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  screenshots: [
    {
      src: '/screenshots/dashboard.jpg',
      sizes: '720x1280',
      type: 'image/jpeg',
      form_factor: 'narrow',
      label: 'Dashboard View'
    },
    {
      src: '/screenshots/working.jpg',
      sizes: '720x1280',
      type: 'image/jpeg',
      form_factor: 'narrow',
      label: 'Workout Logging'
    },
    {
      src: '/screenshots/history.jpg',
      sizes: '720x1280',
      type: 'image/jpeg',
      form_factor: 'narrow',
      label: 'Workout History'
    },
    {
      src: '/screenshots/progress_mobile.jpg',
      sizes: '720x1280',
      type: 'image/jpeg',
      form_factor: 'narrow',
      label: 'Progress Tracking (Mobile)'
    },
    {
      src: '/screenshots/workouts.jpg',
      sizes: '720x1280',
      type: 'image/jpeg',
      form_factor: 'narrow',
      label: 'Custom Workouts'
    },
    {
      src: '/screenshots/progress.jpg',
      sizes: '1280x720',
      type: 'image/jpeg',
      form_factor: 'wide',
      label: 'Progress Tracking'
    },
    {
      src: '/screenshots/ai_workouts.jpg',
      sizes: '1280x720',
      type: 'image/jpeg',
      form_factor: 'wide',
      label: 'AI Workout Generator'
    }
  ]
} as PluginOptions);

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
        protocol: 'https',
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
