
import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const pwaConfig = {
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  manifest: {
    name: 'fitness Repo',
    short_name: 'fRepo',
    description: 'Your ultimate fitness companion. Generate AI-powered workouts, track your progress, and crush your goals. Welcome to your new personal best.',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/dashboard.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'Desktop Dashboard View'
      },
      {
        src: '/workouts.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'Workout Creation'
      },
      {
        src: '/ai_workouts.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'AI Workout Generation'
      },
      {
        src: '/progress.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'Progress Tracking'
      },
      {
        src: '/mobile_dashboard.jpg',
        sizes: '720x1280',
        type: 'image/jpeg',
        form_factor: 'narrow',
        label: 'Mobile Dashboard'
      },
      {
        src: '/mobile_guide.jpg',
        sizes: '720x1280',
        type: 'image/jpeg',
        form_factor: 'narrow',
        label: 'Mobile AI Guide'
      },
      {
        src: '/mobile_workout.jpg',
        sizes: '720x1280',
        type: 'image/jpeg',
        form_factor: 'narrow',
        label: 'Mobile Workout Session'
      },
      {
        src: '/mobile_history.jpg',
        sizes: '720x1280',
        type: 'image/jpeg',
        form_factor: 'narrow',
        label: 'Mobile Workout History'
      }
    ]
  }
};

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
        protocol: 'https' as const,
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

export default withPWA(pwaConfig)(nextConfig);
