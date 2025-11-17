
import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'fRepo',
    short_name: 'fRepo',
    description: 'The Fitness Repository. Track your workouts with ease.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000',
    theme_color: '#000',
    icons: [
      {
        src: 'https://raw.githubusercontent.com/matthewcb4/public_resources/481c0c57077c43a2a965c8531eb3fc1d60863e07/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://raw.githubusercontent.com/matthewcb4/public_resources/481c0c57077c43a2a965c8531eb3fc1d60863e07/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
