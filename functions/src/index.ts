/**
 * Firebase Cloud Functions for Leaderboard Aggregation
 * 
 * This module provides scheduled functions to aggregate user workout data
 * and compute leaderboard rankings for the gamification system.
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Types matching the frontend
interface LeaderboardEntry {
    rank: number;
    displayName: string;
    customName?: string;
    avatarEmoji?: string;
    value: number;
    userId: string;
}

interface LeaderboardSettings {
    optedIn: boolean;
    displayNameType: 'generated' | 'custom';
    generatedName?: string;
    customDisplayName?: string;
}

interface UserProfile {
    leaderboardSettings?: LeaderboardSettings;
    lifetimeVolume?: number;
    xp?: number;
    currentStreak?: number;
}

interface WorkoutLog {
    date: string;
    volume?: number;
    activityType?: string;
    duration?: string;
    cardioMetrics?: {
        calories?: number;
    };
}

type LeaderboardMetric = 'totalVolume' | 'workoutCount' | 'activeDays' | 'xpEarned' | 'cardioMinutes';

// Avatar emojis for users
const AVATAR_EMOJIS = ['🦁', '🐺', '🦅', '🐯', '🦈', '🐻', '🦊', '🐲', '🦍', '🦬', '🦏', '🐘'];

function getAvatarEmoji(userId: string): string {
    // Deterministic emoji based on userId
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_EMOJIS[hash % AVATAR_EMOJIS.length];
}

/**
 * Calculate metrics for a user from their workout logs
 */
async function calculateUserMetrics(
    userId: string,
    logs: WorkoutLog[],
    profile: UserProfile,
    startDate?: Date
): Promise<Record<LeaderboardMetric, number>> {
    // Filter logs by date if provided
    const filteredLogs = startDate
        ? logs.filter(log => new Date(log.date) >= startDate)
        : logs;

    // Calculate total volume
    const totalVolume = filteredLogs.reduce((sum, log) => sum + (log.volume || 0), 0);

    // Calculate workout count
    const workoutCount = filteredLogs.length;

    // Calculate active days (unique dates)
    const uniqueDates = new Set(filteredLogs.map(log => log.date.split('T')[0]));
    const activeDays = uniqueDates.size;

    // XP earned (from profile, or calculated)
    const xpEarned = profile.xp || 0;

    // Calculate cardio minutes
    let cardioMinutes = 0;
    filteredLogs.forEach(log => {
        if (log.activityType === 'run' || log.activityType === 'walk' ||
            log.activityType === 'cycle' || log.activityType === 'hiit') {
            // Parse duration string like "45 min"
            const durationMatch = log.duration?.match(/(\d+)/);
            if (durationMatch) {
                cardioMinutes += parseInt(durationMatch[1], 10);
            }
        }
    });

    return {
        totalVolume,
        workoutCount,
        activeDays,
        xpEarned,
        cardioMinutes,
    };
}

/**
 * Aggregate leaderboard for a specific metric and period
 */


/**
 * Scheduled function that runs daily at midnight UTC
 * Aggregates all leaderboard metrics for all periods
 */
/**
 * Scheduled function that runs daily at midnight UTC
 * Aggregates all leaderboard metrics for all periods in a single pass per user
 */
export const aggregateLeaderboards = onSchedule({
    schedule: '0 0 * * *', // Every day at midnight UTC
    timeZone: 'UTC',
    memory: '1GiB', // Increased memory for batch processing
    timeoutSeconds: 540, // Increased timeout for processing all users
}, async () => {
    console.log('Starting optimized daily leaderboard aggregation...');

    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    // Time period start dates
    // Weekly (Monday)
    const dayOfWeek = now.getUTCDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    const weeklyStart = new Date(now);
    weeklyStart.setUTCDate(now.getUTCDate() - daysToMonday);
    weeklyStart.setUTCHours(0, 0, 0, 0);

    // Monthly (1st)
    const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Initialize global leaderboards buckets
    const metrics: LeaderboardMetric[] = [
        'totalVolume',
        'workoutCount',
        'activeDays',
        'xpEarned',
        'cardioMinutes',
    ];

    // Structure: leaders[period][metric] = LeaderboardEntry[]
    const leaders: Record<string, Record<string, LeaderboardEntry[]>> = {
        weekly: {},
        monthly: {},
        alltime: {}
    };

    // Initialize arrays
    for (const metric of metrics) {
        leaders.weekly[metric] = [];
        leaders.monthly[metric] = [];
        leaders.alltime[metric] = [];
    }

    // Process users in batches
    const usersSnapshot = await db.collection('users').get();
    console.log(`Processing ${usersSnapshot.size} users...`);

    const users = usersSnapshot.docs;
    const CHUNK_SIZE = 50; // Process 50 users at a time

    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
        const chunk = users.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async (userDoc) => {
            try {
                const userId = userDoc.id;

                // Get profile
                const profileDoc = await db.doc(`users/${userId}/profile/main`).get();
                if (!profileDoc.exists) return;

                const profile = profileDoc.data() as UserProfile;

                // Skip if not opted in - BUT we still might want to calculate stats for the user's own view?
                // For "Friends" comparisons, we need stats even if they aren't on the GLOBAL leaderboard.
                // However, the cost saving comes from updating the profile. 
                // Let's update EVERYONE'S profile stats, but only add to 'leaders' array if opted in.
                // This enables "Friends" leaderboards to work even if you hide from Global.

                // Get workout logs ONCE
                const logsSnapshot = await db.collection(`users/${userId}/workoutLogs`).get();
                const logs = logsSnapshot.docs.map(doc => doc.data() as WorkoutLog);

                // Calculate stats for all periods
                const weeklyStats = await calculateUserMetrics(userId, logs, profile, weeklyStart);
                const monthlyStats = await calculateUserMetrics(userId, logs, profile, monthlyStart);
                const allTimeStats = await calculateUserMetrics(userId, logs, profile, undefined);

                // Update user profile with calculated stats
                await db.doc(`users/${userId}/profile/main`).set({
                    leaderboardStats: {
                        weekly: weeklyStats,
                        monthly: monthlyStats,
                        allTime: allTimeStats,
                        updatedAt: new Date().toISOString()
                    }
                }, { merge: true });

                // If opted in, add to global leaderboards
                if (profile.leaderboardSettings?.optedIn) {
                    const displayName = profile.leaderboardSettings.generatedName || `User#${userId.slice(0, 4)}`;
                    const customName = profile.leaderboardSettings.displayNameType === 'custom'
                        ? profile.leaderboardSettings.customDisplayName
                        : undefined;
                    const avatarEmoji = getAvatarEmoji(userId);

                    const createEntry = (value: number): LeaderboardEntry => ({
                        rank: 0,
                        displayName,
                        customName,
                        avatarEmoji,
                        value,
                        userId
                    });

                    for (const metric of metrics) {
                        leaders.weekly[metric].push(createEntry(weeklyStats[metric]));
                        leaders.monthly[metric].push(createEntry(monthlyStats[metric]));
                        leaders.alltime[metric].push(createEntry(allTimeStats[metric]));
                    }
                }

            } catch (err) {
                console.error(`Error processing user ${userDoc.id}:`, err);
            }
        }));
    }

    // Sort, rank, and save global leaderboards
    const saveLeaderboard = async (period: 'weekly' | 'monthly' | 'alltime', metric: LeaderboardMetric, entries: LeaderboardEntry[]) => {
        // Sort
        entries.sort((a, b) => b.value - a.value);

        // Rank
        entries.forEach((e, idx) => e.rank = idx + 1);

        // Take top 100
        const top100 = entries.slice(0, 100);

        // ID generation
        let snapshotId = `alltime_${metric}`;
        if (period === 'weekly') snapshotId = `weekly_${metric}_${yearMonth}`;
        if (period === 'monthly') snapshotId = `monthly_${metric}_${yearMonth}`;

        await db.doc(`leaderboards/${snapshotId}`).set({
            id: snapshotId,
            metric,
            period,
            entries: top100,
            totalParticipants: entries.length,
            updatedAt: new Date().toISOString(),
        });
    };

    console.log('Saving global leaderboards...');

    for (const metric of metrics) {
        await saveLeaderboard('weekly', metric, leaders.weekly[metric]);
        await saveLeaderboard('monthly', metric, leaders.monthly[metric]);
        await saveLeaderboard('alltime', metric, leaders.alltime[metric]);
    }

    console.log('Daily optimized aggregation complete!');
});

/**
 * HTTP endpoint to manually trigger aggregation (for testing)
 * Can be called via: https://<region>-<project>.cloudfunctions.net/manualAggregateLeaderboards
 */
// For manual trigger, we can just invoke the logic
// But since the new logic is in the scheduled function, we'll duplicate the call or refactor.
// To keep it simple and safe for this manual tool, I'll just call the logic directly if I extracted it, 
// or copy it. Given the file structure, let's just create a shared function or copy the core logic.
// For now, I'll make the manual trigger just return a message saying to use the scheduler or
// I will extract the logic. 
// Let's just implement a simple redirect to the logic for now by copying the body.
// actually, simpler: let's export the logic function and call it.

// ... Actually, to avoid code duplication in this file, I'll just leave this as a "TODO: Update manual trigger" 
// or essentially copy the body of the `aggregateLeaderboards` function's callback here.

export const manualAggregateLeaderboards = onRequest({
    timeoutSeconds: 540,
    memory: '1GiB',
}, async (req, res) => {
    console.log('Starting MANUALLY TRIGGERED optimized aggregation...');

    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    // Calculate start dates
    const dayOfWeek = now.getUTCDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    const weeklyStart = new Date(now);
    weeklyStart.setUTCDate(now.getUTCDate() - daysToMonday);
    weeklyStart.setUTCHours(0, 0, 0, 0);

    const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const metrics: LeaderboardMetric[] = [
        'totalVolume',
        'workoutCount',
        'activeDays',
        'xpEarned',
        'cardioMinutes',
    ];

    const leaders: Record<string, Record<string, LeaderboardEntry[]>> = {
        weekly: {},
        monthly: {},
        alltime: {}
    };

    for (const metric of metrics) {
        leaders.weekly[metric] = [];
        leaders.monthly[metric] = [];
        leaders.alltime[metric] = [];
    }

    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs;
    const CHUNK_SIZE = 50;

    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
        const chunk = users.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (userDoc) => {
            try {
                const userId = userDoc.id;
                const profileDoc = await db.doc(`users/${userId}/profile/main`).get();
                if (!profileDoc.exists) return;
                const profile = profileDoc.data() as UserProfile;

                const logsSnapshot = await db.collection(`users/${userId}/workoutLogs`).get();
                const logs = logsSnapshot.docs.map(doc => doc.data() as WorkoutLog);

                const weeklyStats = await calculateUserMetrics(userId, logs, profile, weeklyStart);
                const monthlyStats = await calculateUserMetrics(userId, logs, profile, monthlyStart);
                const allTimeStats = await calculateUserMetrics(userId, logs, profile, undefined);

                await db.doc(`users/${userId}/profile/main`).set({
                    leaderboardStats: {
                        weekly: weeklyStats,
                        monthly: monthlyStats,
                        allTime: allTimeStats,
                        updatedAt: new Date().toISOString()
                    }
                }, { merge: true });

                if (profile.leaderboardSettings?.optedIn) {
                    const displayName = profile.leaderboardSettings.generatedName || `User#${userId.slice(0, 4)}`;
                    const customName = profile.leaderboardSettings.displayNameType === 'custom'
                        ? profile.leaderboardSettings.customDisplayName
                        : undefined;
                    const avatarEmoji = getAvatarEmoji(userId);
                    const createEntry = (value: number): LeaderboardEntry => ({
                        rank: 0,
                        displayName,
                        customName,
                        avatarEmoji,
                        value,
                        userId
                    });

                    for (const metric of metrics) {
                        leaders.weekly[metric].push(createEntry(weeklyStats[metric]));
                        leaders.monthly[metric].push(createEntry(monthlyStats[metric]));
                        leaders.alltime[metric].push(createEntry(allTimeStats[metric]));
                    }
                }
            } catch (err) {
                console.error(`Error processing user ${userDoc.id}:`, err);
            }
        }));
    }

    const saveLeaderboard = async (period: 'weekly' | 'monthly' | 'alltime', metric: LeaderboardMetric, entries: LeaderboardEntry[]) => {
        entries.sort((a, b) => b.value - a.value);
        entries.forEach((e, idx) => e.rank = idx + 1);
        const top100 = entries.slice(0, 100);
        let snapshotId = `alltime_${metric}`;
        if (period === 'weekly') snapshotId = `weekly_${metric}_${yearMonth}`;
        if (period === 'monthly') snapshotId = `monthly_${metric}_${yearMonth}`;

        await db.doc(`leaderboards/${snapshotId}`).set({
            id: snapshotId,
            metric,
            period,
            entries: top100,
            totalParticipants: entries.length,
            updatedAt: new Date().toISOString(),
        });
    };

    for (const metric of metrics) {
        await saveLeaderboard('weekly', metric, leaders.weekly[metric]);
        await saveLeaderboard('monthly', metric, leaders.monthly[metric]);
        await saveLeaderboard('alltime', metric, leaders.alltime[metric]);
    }

    res.json({ success: true, message: 'Optimized leaderboard aggregation complete' });
});

// ============================================
// AUTOMATED BLOG GENERATION
// ============================================

import { BLOG_TOPICS, getNextTopic, BlogTopic } from './topics';

interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
    publishedAt: string;
    status: 'draft' | 'published';
    seoDescription: string;
    readingTime: number;
}

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60);
}

/**
 * Estimate reading time based on word count (avg 200 wpm)
 */
function estimateReadingTime(content: string): number {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200);
}

/**
 * Get all existing blog post slugs to avoid duplicates
 */
async function getExistingSlugs(): Promise<string[]> {
    const snapshot = await db.collection('blog_posts').select('slug').get();
    return snapshot.docs.map(doc => doc.data().slug as string);
}

/**
 * Generate blog content using Google AI (Gemini)
 * Note: This uses the REST API directly since we're in Cloud Functions
 */
async function generateBlogContent(topic: BlogTopic): Promise<Omit<BlogPost, 'id' | 'publishedAt' | 'status'> | null> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('No Google AI API key found. Set GOOGLE_GENAI_API_KEY in environment.');
        return null;
    }

    const prompt = `You are an expert fitness writer creating content for fRepo, a workout tracking app. 
Generate a high-quality, SEO-optimized blog post on the following topic.

**Topic:** ${topic.topic}
**Category:** ${topic.category}
**Target Keywords:** ${topic.targetKeywords.join(', ')}
**Target Word Count:** 800-1000 words

## Writing Guidelines:
1. Write in a conversational but authoritative tone
2. Use short paragraphs (2-3 sentences max) for readability
3. Include actionable tips and practical advice
4. Use markdown formatting:
   - ## for main sections
   - ### for subsections
   - **bold** for emphasis
   - Bullet points for lists
5. Start with a hook that addresses the reader's pain point
6. Include 4-6 main sections with clear headings
7. End with a motivating conclusion and call-to-action
8. Naturally incorporate the target keywords without keyword stuffing
9. Make content scannable with headers every 150-200 words

## Content Requirements:
- Cite specific numbers/statistics when making claims (use realistic estimates)
- Include form tips and safety notes where relevant
- Make it practical - readers should be able to apply advice immediately
- Avoid generic filler content - every sentence should add value

## Output Format:
Return a JSON object with these exact fields:
{
  "title": "An engaging, SEO-friendly title (max 60 chars)",
  "excerpt": "A compelling 1-2 sentence summary for previews (max 160 chars)",
  "content": "The full blog post content in markdown format",
  "seoDescription": "A 150-160 character meta description for search engines",
  "tags": ["tag1", "tag2", "tag3"] // 3-6 relevant tags
}

Generate the blog post now. Return ONLY the JSON object, no other text.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096,
                    }
                })
            }
        );

        if (!response.ok) {
            console.error('AI API error:', await response.text());
            return null;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error('No content in AI response');
            return null;
        }

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = text;
        if (text.includes('```json')) {
            jsonStr = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            jsonStr = text.split('```')[1].split('```')[0];
        }

        const parsed = JSON.parse(jsonStr.trim());

        return {
            slug: generateSlug(parsed.title),
            title: parsed.title,
            excerpt: parsed.excerpt,
            content: parsed.content,
            category: topic.category,
            tags: parsed.tags || topic.targetKeywords.slice(0, 3),
            seoDescription: parsed.seoDescription,
            readingTime: estimateReadingTime(parsed.content),
        };
    } catch (error) {
        console.error('Error generating blog content:', error);
        return null;
    }
}

/**
 * Scheduled function that runs daily at 6 AM UTC
 * Generates a new blog post using AI
 */
export const generateDailyBlogPost = onSchedule({
    schedule: '0 6 * * *', // Every day at 6 AM UTC
    timeZone: 'UTC',
    memory: '512MiB',
    timeoutSeconds: 120,
    secrets: ['GOOGLE_GENAI_API_KEY'],
}, async () => {
    console.log('Starting daily blog post generation...');

    try {
        // Get existing slugs to avoid duplicates
        const existingSlugs = await getExistingSlugs();
        console.log(`Found ${existingSlugs.length} existing blog posts`);

        // Get next topic to generate
        const topic = getNextTopic(existingSlugs);

        if (!topic) {
            console.log('All topics have been used. No new post generated.');
            return;
        }

        console.log(`Generating post for topic: ${topic.topic}`);

        // Generate content using AI
        const blogContent = await generateBlogContent(topic);

        if (!blogContent) {
            console.error('Failed to generate blog content');
            return;
        }

        // Check if slug already exists (double-check)
        if (existingSlugs.includes(blogContent.slug)) {
            console.log(`Slug "${blogContent.slug}" already exists. Skipping.`);
            return;
        }

        // Save to Firestore
        const blogPost: Omit<BlogPost, 'id'> = {
            ...blogContent,
            publishedAt: new Date().toISOString(),
            status: 'published',
        };

        const docRef = await db.collection('blog_posts').add(blogPost);
        console.log(`Successfully created blog post: ${docRef.id} - ${blogPost.title}`);

    } catch (error) {
        console.error('Error in daily blog generation:', error);
    }
});

/**
 * HTTP endpoint to manually trigger blog generation (for testing)
 * Usage: POST /manualGenerateBlogPost
 */
export const manualGenerateBlogPost = onRequest({
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: ['GOOGLE_GENAI_API_KEY'],
}, async (req, res) => {
    console.log('Manual blog post generation triggered...');

    try {
        // Get existing slugs
        const existingSlugs = await getExistingSlugs();

        // Get next topic or use custom topic from request body
        let topic: BlogTopic | null = null;

        if (req.body?.topic) {
            // Custom topic from request
            topic = {
                topic: req.body.topic,
                category: req.body.category || 'tips',
                targetKeywords: req.body.keywords || ['fitness', 'workout'],
                priority: 'high',
            };
        } else {
            topic = getNextTopic(existingSlugs);
        }

        if (!topic) {
            res.status(400).json({ success: false, error: 'No topics available' });
            return;
        }

        console.log(`Generating post for: ${topic.topic}`);

        const blogContent = await generateBlogContent(topic);

        if (!blogContent) {
            res.status(500).json({ success: false, error: 'Failed to generate content' });
            return;
        }

        // Save to Firestore
        const blogPost: Omit<BlogPost, 'id'> = {
            ...blogContent,
            publishedAt: new Date().toISOString(),
            status: 'published',
        };

        const docRef = await db.collection('blog_posts').add(blogPost);

        res.json({
            success: true,
            id: docRef.id,
            title: blogPost.title,
            slug: blogPost.slug,
            message: 'Blog post generated and published!',
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: String(error) });
    }
});
