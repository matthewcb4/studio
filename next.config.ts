
import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const pwaConfig = {
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  manifestTransforms: [
    (manifest: any) => {
      // Use the exact path for icons, don't append sizes
      manifest.icons.forEach((icon: any) => {
        if (icon.src.includes('logo')) {
          icon.src = '/icons/logo.png';
        }
      });
      return manifest;
    },
  ],
  manifest: {
    name: 'fitness Repo',
    short_name: 'fRepo',
    description: 'Your ultimate fitness companion. Generate AI-powered workouts, track your progress, and crush your goals. Welcome to your new personal best.',
    icons: [
      {
        src: '/icons/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/dashboard.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'Desktop Dashboard View'
      },
      {
        src: '/screenshots/workouts.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'Workout Creation'
      },
      {
        src: '/screenshots/ai_workouts.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'AI Workout Generation'
      },
      {
        src: '/screenshots/progress.jpg',
        sizes: '1280x720',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'Progress Tracking'
      },
      {
        src: '/screenshots/start_workout.jpg',
        sizes: '720x1280',
        type: 'image/jpeg',
        form_factor: 'narrow',
        label: 'Mobile Dashboard'
      },
      {
        src: '/screenshots/working.jpg',
        sizes: '720x1280',
        type: 'image/jpeg',
        form_factor: 'narrow',
        label: 'Mobile AI Guide'
      },
      {
        src: '/screenshots/heatmap.jpg',
        sizes: '720x1280',
        type: 'image/jpeg',
        form_factor: 'narrow',
        label: 'Mobile Workout Session'
      },
      {
        src: '/screenshots/edit_workout.jpg',
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
