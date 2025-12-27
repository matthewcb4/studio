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
async function aggregateLeaderboard(
    metric: LeaderboardMetric,
    period: 'weekly' | 'monthly' | 'alltime',
    snapshotId: string
): Promise<void> {
    console.log(`Aggregating leaderboard: ${snapshotId}`);

    // Calculate start date based on period
    let startDate: Date | undefined;
    const now = new Date();

    if (period === 'weekly') {
        // Start of current week (Monday)
        const dayOfWeek = now.getUTCDay();
        const daysToMonday = (dayOfWeek + 6) % 7;
        startDate = new Date(now);
        startDate.setUTCDate(now.getUTCDate() - daysToMonday);
        startDate.setUTCHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
        // Start of current month
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
    // alltime has no startDate

    // Get all users who have opted into leaderboards
    const usersSnapshot = await db.collection('users').get();

    const entries: LeaderboardEntry[] = [];

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Get user profile
        const profileDoc = await db.doc(`users/${userId}/profile/main`).get();
        const profile = profileDoc.data() as UserProfile | undefined;

        // Skip users who haven't opted in
        if (!profile?.leaderboardSettings?.optedIn) {
            continue;
        }

        // Get user's workout logs
        const logsSnapshot = await db.collection(`users/${userId}/workoutLogs`).get();
        const logs = logsSnapshot.docs.map(doc => doc.data() as WorkoutLog);

        // Calculate metrics
        const metrics = await calculateUserMetrics(userId, logs, profile, startDate);

        // Get display name
        const displayName = profile.leaderboardSettings.generatedName || `User#${userId.slice(0, 4)}`;
        const customName = profile.leaderboardSettings.displayNameType === 'custom'
            ? profile.leaderboardSettings.customDisplayName
            : undefined;

        entries.push({
            rank: 0, // Will be set after sorting
            displayName,
            customName,
            avatarEmoji: getAvatarEmoji(userId),
            value: metrics[metric],
            userId,
        });
    }

    // Sort by value (descending) and assign ranks
    entries.sort((a, b) => b.value - a.value);
    entries.forEach((entry, index) => {
        entry.rank = index + 1;
    });

    // Keep top 100
    const topEntries = entries.slice(0, 100);

    // Save to Firestore
    await db.doc(`leaderboards/${snapshotId}`).set({
        id: snapshotId,
        metric,
        period,
        entries: topEntries,
        totalParticipants: entries.length,
        updatedAt: new Date().toISOString(),
    });

    console.log(`Saved ${topEntries.length} entries to ${snapshotId}`);
}

/**
 * Scheduled function that runs daily at midnight UTC
 * Aggregates all leaderboard metrics for all periods
 */
export const aggregateLeaderboards = onSchedule({
    schedule: '0 0 * * *', // Every day at midnight UTC
    timeZone: 'UTC',
    memory: '512MiB',
}, async () => {
    console.log('Starting daily leaderboard aggregation...');

    const metrics: LeaderboardMetric[] = [
        'totalVolume',
        'workoutCount',
        'activeDays',
        'xpEarned',
        'cardioMinutes',
    ];

    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    for (const metric of metrics) {
        // Weekly leaderboard
        await aggregateLeaderboard(metric, 'weekly', `weekly_${metric}_${yearMonth}`);

        // Monthly leaderboard
        await aggregateLeaderboard(metric, 'monthly', `monthly_${metric}_${yearMonth}`);

        // All-time leaderboard
        await aggregateLeaderboard(metric, 'alltime', `alltime_${metric}`);
    }

    console.log('Daily leaderboard aggregation complete!');
});

/**
 * HTTP endpoint to manually trigger aggregation (for testing)
 * Can be called via: https://<region>-<project>.cloudfunctions.net/manualAggregateLeaderboards
 */
export const manualAggregateLeaderboards = onRequest({
    memory: '512MiB',
    cors: true,
}, async (req, res) => {
    // Simple auth check - require a secret header
    const authHeader = req.headers['x-admin-secret'];
    if (!authHeader || authHeader !== process.env.ADMIN_SECRET) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    console.log('Manual leaderboard aggregation triggered...');

    const metrics: LeaderboardMetric[] = [
        'totalVolume',
        'workoutCount',
        'activeDays',
        'xpEarned',
        'cardioMinutes',
    ];

    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    for (const metric of metrics) {
        await aggregateLeaderboard(metric, 'weekly', `weekly_${metric}_${yearMonth}`);
        await aggregateLeaderboard(metric, 'monthly', `monthly_${metric}_${yearMonth}`);
        await aggregateLeaderboard(metric, 'alltime', `alltime_${metric}`);
    }

    res.json({ success: true, message: 'Leaderboard aggregation complete' });
});
