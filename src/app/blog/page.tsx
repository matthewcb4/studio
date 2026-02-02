import { Metadata } from 'next';
import Link from 'next/link';
import { getServerFirestore } from '@/firebase/server';
import type { BlogPost } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, Download } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Fitness Blog | fRepo - Workout Tracker',
    description: 'Expert fitness tips, workout guides, and training advice to help you reach your goals. Free workouts, nutrition tips, and more.',
    openGraph: {
        title: 'Fitness Blog | fRepo',
        description: 'Expert fitness tips, workout guides, and training advice.',
        url: 'https://frepo.app/blog',
        siteName: 'fRepo',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Fitness Blog | fRepo',
        description: 'Expert fitness tips, workout guides, and training advice.',
    },
};

async function getBlogPosts(): Promise<BlogPost[]> {
    try {
        const db = getServerFirestore();
        const postsRef = db.collection('blog_posts');
        const snapshot = await postsRef
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')
            .limit(20)
            .get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as BlogPost));
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        return [];
    }
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
        workouts: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
        nutrition: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
        tips: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
        motivation: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
        programs: 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20',
    };
    return (
        <Badge variant="secondary" className={colors[category]}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
        </Badge>
    );
}

function BlogPostCard({ post }: { post: BlogPost }) {
    return (
        <Link href={`/blog/${post.slug}`}>
            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50 group cursor-pointer">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <CategoryBadge category={post.category} />
                        {post.readingTime && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {post.readingTime} min read
                            </span>
                        )}
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                        {post.excerpt}
                    </p>
                    <div className="flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all">
                        Read more <ArrowRight className="h-4 w-4" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function AppPromoCard() {
    return (
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">💪</span> Track Your Workouts
                </CardTitle>
                <CardDescription>
                    Stop just reading about workouts — start logging them!
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">✅ AI-powered workout generation</li>
                    <li className="flex items-center gap-2">✅ Progress tracking & muscle heatmap</li>
                    <li className="flex items-center gap-2">✅ Voice logging for hands-free use</li>
                    <li className="flex items-center gap-2">✅ Works offline as a PWA</li>
                </ul>
                <Button asChild className="w-full">
                    <Link href="/">
                        <Download className="h-4 w-4 mr-2" />
                        Get fRepo Free
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export default async function BlogPage() {
    const posts = await getBlogPosts();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                        <span className="text-2xl">🏋️</span> fRepo
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link href="/blog" className="text-sm font-medium text-primary">
                            Blog
                        </Link>
                        <Button asChild size="sm">
                            <Link href="/">Get the App</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-background">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Fitness Tips & Workout Guides
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Expert advice to help you build muscle, lose fat, and achieve your fitness goals.
                        New articles published daily.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Blog Posts Grid */}
                    <div className="lg:col-span-3">
                        {posts.length === 0 ? (
                            <Card className="p-12 text-center">
                                <p className="text-muted-foreground text-lg mb-4">
                                    No blog posts yet. Check back soon!
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    We&apos;re working on bringing you the best fitness content.
                                </p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {posts.map((post) => (
                                    <BlogPostCard key={post.id} post={post} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-1 space-y-6">
                        <AppPromoCard />

                        {/* Categories */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Categories</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                <CategoryBadge category="workouts" />
                                <CategoryBadge category="nutrition" />
                                <CategoryBadge category="tips" />
                                <CategoryBadge category="motivation" />
                                <CategoryBadge category="programs" />
                            </CardContent>
                        </Card>
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
