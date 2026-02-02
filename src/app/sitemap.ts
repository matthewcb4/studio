import { MetadataRoute } from 'next';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { BlogPost } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://frepo.app';

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ];

    // Dynamic blog posts
    let blogPosts: MetadataRoute.Sitemap = [];

    try {
        const postsRef = collection(db, 'blog_posts');
        const q = query(
            postsRef,
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc')
        );
        const snapshot = await getDocs(q);

        blogPosts = snapshot.docs.map(doc => {
            const data = doc.data() as BlogPost;
            return {
                url: `${baseUrl}/blog/${data.slug}`,
                lastModified: new Date(data.publishedAt),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            };
        });
    } catch (error) {
        console.error('Error generating sitemap for blog posts:', error);
    }

    return [...staticPages, ...blogPosts];
}
