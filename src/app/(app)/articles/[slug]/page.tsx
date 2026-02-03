"use client";

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { BlogPost } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowLeft, Loader2, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper to render markdown (same as public blog)
function renderMarkdown(content: string): string {
    return content
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-8 mb-4">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-10 mb-6">$1</h1>')
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
        .replace(/^(?!<[hl]|<li)(.*[^\n])$/gim, '<p class="mb-4 leading-relaxed">$1</p>')
        .replace(/\n\n/g, '\n');
}

export default function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    // Unwrap params using React.use()
    const { slug } = use(params);

    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // Fetch post by slug
    // Note: In a real app we might want to pass data from the list, but fetching by slug is safer
    const postQuery = useMemoFirebase(() => {
        if (!firestore || !slug) return null;
        return query(
            collection(firestore, 'blog_posts'),
            where('slug', '==', slug),
            where('status', '==', 'published'),
            limit(1)
        );
    }, [firestore, slug]);

    const { data: posts, isLoading } = useCollection<BlogPost>(postQuery);
    const post = posts?.[0];

    // Handle back navigation
    const handleBack = () => {
        router.back();
    };

    const handleShare = () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({
                title: post?.title,
                text: post?.excerpt,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Link Copied", description: "Article link copied to clipboard." });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>Loading article...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-xl font-bold mb-2">Article Not Found</h2>
                <p className="text-muted-foreground mb-4">This article doesn't exist or has been removed.</p>
                <Button onClick={() => router.push('/articles')}>Back to Articles</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.push('/articles')} className="gap-2 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="h-4 w-4" /> Back to Articles
                </Button>
                <Button variant="ghost" size="icon" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                </Button>
            </div>

            <article>
                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Badge variant="secondary" className="capitalize">
                            {post.category}
                        </Badge>
                        {post.readingTime && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {post.readingTime} min read
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(post.publishedAt).toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</span>
                    </div>
                </header>

                <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                    <div className="mt-8 pt-8 border-t flex flex-wrap gap-2">
                        {post.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-muted-foreground">
                                #{tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </article>
        </div>
    );
}
