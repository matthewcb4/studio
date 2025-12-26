'use client';

import { useState, useEffect, useCallback } from 'react';

interface WorkoutSessionData {
    sessionLog: Record<string, Array<{ reps?: number; weight?: number; duration?: number; type?: string }>>;
    exerciseStates: Record<string, {
        currentSet: number;
        logs: Array<{ reps?: number; weight?: number; duration?: number; type?: string }>;
        weight: string;
        reps: string;
        duration: string;
        bodyweightPercentage: number;
        setType: string;
    }>;
    elapsedTime: number;
    currentGroupIndex: number;
    startTime: number; // When the workout session started
}

const STORAGE_KEY_PREFIX = 'workout_session_';

/**
 * Hook to persist workout session state to localStorage
 * Prevents data loss when switching apps on mobile
 */
export function usePersistedWorkoutSession(workoutId: string) {
    const storageKey = `${STORAGE_KEY_PREFIX}${workoutId}`;

    // Load initial state from localStorage
    const loadPersistedData = useCallback((): WorkoutSessionData | null => {
        if (typeof window === 'undefined') return null;

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const data = JSON.parse(stored) as WorkoutSessionData;
                // Check if session is still valid (within 4 hours)
                const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
                if (data.startTime > fourHoursAgo) {
                    return data;
                } else {
                    // Clear stale session
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (error) {
            console.error('Error loading workout session:', error);
        }
        return null;
    }, [storageKey]);

    // Save state to localStorage
    const saveSession = useCallback((data: WorkoutSessionData) => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving workout session:', error);
        }
    }, [storageKey]);

    // Clear session from localStorage
    const clearSession = useCallback(() => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error('Error clearing workout session:', error);
        }
    }, [storageKey]);

    // Check if there's a persisted session
    const hasPersistedSession = useCallback((): boolean => {
        return loadPersistedData() !== null;
    }, [loadPersistedData]);

    return {
        loadPersistedData,
        saveSession,
        clearSession,
        hasPersistedSession,
    };
}

/**
 * Clear all workout sessions from localStorage
 * Useful for cleanup
 */
export function clearAllWorkoutSessions() {
    if (typeof window === 'undefined') return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}
