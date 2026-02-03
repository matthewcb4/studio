"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { BlogPost } from '@/lib/types';

export default function ArticlesPage() {
    const firestore = useFirestore();

    // Query published blog posts
    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'blog_posts'),
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc'),
            limit(20)
        );
    }, [firestore]);

    const { data: posts, isLoading } = useCollection<BlogPost>(postsQuery);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading articles...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Fitness Blog</h1>
                <p className="text-muted-foreground">
                    Expert tips, guides, and motivation to keep you moving.
                </p>
            </div>

            {posts && posts.length === 0 ? (
                <Card className="p-8 text-center bg-muted/30 border-dashed">
                    <p className="text-muted-foreground mb-2">No articles found.</p>
                    <p className="text-sm">Check back later for new content!</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts?.map((post) => (
                        <ArticleCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
}

const slug = typeof post.slug === 'string' ? post.slug : '#';
const title = typeof post.title === 'string' ? post.title : 'Untitled Article';
const excerpt = typeof post.excerpt === 'string' ? post.excerpt : '';

return (
    <Link href={`/articles/${slug}`}>
        <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                    <CategoryBadge category={post.category} />
                    {typeof post.readingTime === 'number' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                            <Clock className="h-3 w-3" />
                            {post.readingTime} min
                        </span>
                    )}
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {title}
                </CardTitle>
                <CardDescription className="text-xs flex items-center mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(post.publishedAt)}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                    {excerpt}
                </p>
                <div className="text-primary text-sm font-medium flex items-center gap-1 mt-auto">
                    Read Article <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
            </CardContent>
        </Card>
    </Link>
);
}

function CategoryBadge({ category }: { category: string }) {
    const colors: Record<string, string> = {
        workouts: 'bg-blue-500/10 text-blue-500',
        nutrition: 'bg-green-500/10 text-green-500',
        tips: 'bg-purple-500/10 text-purple-500',
        motivation: 'bg-orange-500/10 text-orange-500',
        programs: 'bg-pink-500/10 text-pink-500',
    };

    const safeCategory = (typeof category === 'string' && category) || 'Blog';
    // Fallback color - safely check keys
    const colorClass = (typeof category === 'string' && colors[category]) || 'bg-secondary text-foreground';

    return (
        <Badge variant="secondary" className={`${colorClass} hover:bg-opacity-80`}>
            {safeCategory.charAt(0).toUpperCase() + safeCategory.slice(1)}
        </Badge>
    );
}

function formatDate(date: string | any): string {
    if (!date) return '';
    try {
        let d: Date;
        if (typeof date === 'object' && typeof date.toDate === 'function') {
            d = date.toDate();
        } else {
            d = new Date(date);
        }
        return d.toLocaleDateString();
    } catch (e) {
        return '';
    }
}
