import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tonal Tracker',
    short_name: 'Tonal Tracker',
    description: 'Track your Tonal free-lift workouts with ease.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000',
    theme_color: '#000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}