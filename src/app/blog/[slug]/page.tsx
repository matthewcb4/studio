import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerFirestore } from '@/firebase/server';
import type { BlogPost } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowLeft, Download, Share2, ChevronRight } from 'lucide-react';
import { BlogReader } from '@/components/blog-reader';

export const dynamic = 'force-dynamic';

interface BlogPostPageProps {
    params: Promise<{ slug: string }>;
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
    try {
        const db = getServerFirestore();
        const postsRef = db.collection('blog_posts');
        const snapshot = await postsRef
            .where('slug', '==', slug)
            .where('status', '==', 'published')
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as BlogPost;
    } catch (error) {
        console.error('Error fetching blog post:', error);
        return null;
    }
}

async function getRelatedPosts(currentSlug: string, category: string): Promise<BlogPost[]> {
    try {
        const db = getServerFirestore();
        const postsRef = db.collection('blog_posts');
        const snapshot = await postsRef
            .where('status', '==', 'published')
            .where('category', '==', category)
            .orderBy('publishedAt', 'desc')
            .limit(4)
            .get();
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as BlogPost))
            .filter(post => post.slug !== currentSlug)
            .slice(0, 3);
    } catch (error) {
        console.error('Error fetching related posts:', error);
        return [];
    }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        return {
            title: 'Post Not Found | fRepo Blog',
        };
    }

    return {
        title: `${post.title} | fRepo Blog`,
        description: post.seoDescription || post.excerpt,
        openGraph: {
            title: post.title,
            description: post.seoDescription || post.excerpt,
            url: `https://frepo.app/blog/${post.slug}`,
            siteName: 'fRepo',
            type: 'article',
            publishedTime: post.publishedAt,
            images: post.featuredImage ? [post.featuredImage] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.seoDescription || post.excerpt,
        },
    };
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function CategoryBadge({ category }: { category: BlogPost['category'] }) {
    const colors: Record<BlogPost['category'], string> = {
        workouts: 'bg-blue-500/10 text-blue-500',
        nutrition: 'bg-green-500/10 text-green-500',
        tips: 'bg-purple-500/10 text-purple-500',
        motivation: 'bg-orange-500/10 text-orange-500',
        programs: 'bg-pink-500/10 text-pink-500',
    };
    return (
        <Badge variant="secondary" className={colors[category]}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
        </Badge>
    );
}

function AppPromoCard() {
    return (
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-xl">💪</span> Ready to Start Training?
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to Crush Your Goals?</h3>
                <p className="text-lg mb-6">
                    Stop guessing and start making progress. Download fRepo today to generate personalized workouts, track your lifts, and visualize your gains. Only a one-time fee of $0.99 for lifetime access.
                </p>
                <Button size="lg" className="font-bold text-lg px-8 py-6 h-auto" asChild>
                    <Link href="/signup">
                        <Download className="mr-2 h-6 w-6" />
                        Get fRepo ($0.99)
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function RelatedPostCard({ post }: { post: BlogPost }) {
    return (
        <Link href={`/blog/${post.slug}`}>
            <Card className="h-full hover:shadow-md transition-all duration-200 hover:border-primary/30 group cursor-pointer">
                <CardHeader className="pb-2">
                    <CardDescription className="text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt)}
                    </CardDescription>
                    <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-xs line-clamp-2">
                        {post.excerpt}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
}

// Simple markdown-to-HTML renderer for blog content
function renderMarkdown(content: string): string {
    return content
        // Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-8 mb-4">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-10 mb-6">$1</h1>')
        // Bold and italic
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
        // Paragraphs (lines with content not already wrapped)
        .replace(/^(?!<[hl]|<li)(.*[^\n])$/gim, '<p class="mb-4 leading-relaxed">$1</p>')
        // Line breaks
        .replace(/\n\n/g, '\n');
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        notFound();
    }

    const relatedPosts = await getRelatedPosts(slug, post.category);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                        <span className="text-2xl">🏋️</span> fRepo
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link href="/blog" className="text-sm font-medium hover:text-primary">
                            Blog
                        </Link>
                        <Button asChild size="sm">
                            <Link href="/">Get the App</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            {/* Breadcrumbs */}
            <div className="border-b bg-muted/30">
                <div className="container mx-auto px-4 py-3">
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/" className="hover:text-primary">Home</Link>
                        <ChevronRight className="h-4 w-4" />
                        <Link href="/blog" className="hover:text-primary">Blog</Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground truncate max-w-[200px]">{post.title}</span>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Article */}
                    <article className="lg:col-span-3">
                        {/* Back Link */}
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 group"
                        >
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Back to all articles
                        </Link>

                        {/* Article Header */}
                        <header className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <CategoryBadge category={post.category} />
                                {post.readingTime && (
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {post.readingTime} min read
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                                {post.title}
                            </h1>
                            <div className="flex items-center gap-4 text-muted-foreground mb-6">
                                <span className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(post.publishedAt)}
                                </span>
                            </div>

                            <BlogReader content={post.content} title={post.title} />
                        </header>

                        {/* Tags */}
                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-8">
                                {post.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                        #{tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Article Content */}
                        <div
                            className="prose prose-lg dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
                        />

                        {/* CTA at end of article */}
                        <Card className="mt-12 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                            <CardContent className="py-8 text-center">
                                <h3 className="text-2xl font-bold mb-2">Put This Into Practice 💪</h3>
                                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                                    Stop reading, start lifting! Download fRepo and log your workouts with
                                    AI-powered guidance and progress tracking.
                                </p>
                                <Button asChild size="lg">
                                    <Link href="/">
                                        <Download className="h-5 w-5 mr-2" />
                                        Get fRepo ($0.99)
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Related Posts */}
                        {relatedPosts.length > 0 && (
                            <section className="mt-12">
                                <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {relatedPosts.map(relatedPost => (
                                        <RelatedPostCard key={relatedPost.id} post={relatedPost} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </article>

                    {/* Sidebar */}
                    <aside className="lg:col-span-1 space-y-6">
                        <div className="sticky top-24">
                            <AppPromoCard />
                        </div>
                    </aside>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t py-8 bg-muted/30">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} fRepo. All rights reserved.</p>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <Link href="/privacy" className="hover:text-primary">Privacy</Link>
                        <Link href="/terms" className="hover:text-primary">Terms</Link>
                        <Link href="/" className="hover:text-primary">Home</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
