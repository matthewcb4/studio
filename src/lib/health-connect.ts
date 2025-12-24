/**
 * Health Connect Service
 * 
 * This service provides a bridge to the native Health Connect plugin
 * for syncing workout data with Google Fit, Fitbit, Samsung Health, etc.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// Health Connect plugin interface
interface HealthConnectPlugin {
    isAvailable(): Promise<{ available: boolean; status: number }>;
    getHealthPermissions(): Promise<{ granted: boolean; grantedCount: number; requiredCount: number }>;
    requestHealthPermissions(): Promise<{ message: string; permissionsRequired: number }>;
    writeWorkout(options: {
        title: string;
        startTime: number;
        endTime: number;
        calories?: number;
        notes?: string;
    }): Promise<{ success: boolean; recordIds: string; message: string }>;
}

// Register the plugin
const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');

/**
 * Check if Health Connect is available on this device
 */
export async function isHealthConnectAvailable(): Promise<boolean> {
    // Only available on Android native
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
        return false;
    }

    try {
        const result = await HealthConnect.isAvailable();
        return result.available;
    } catch (error) {
        console.error('Error checking Health Connect availability:', error);
        return false;
    }
}

/**
 * Check if we have Health Connect permissions
 */
export async function hasHealthConnectPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    try {
        const result = await HealthConnect.getHealthPermissions();
        return result.granted;
    } catch (error) {
        console.error('Error checking Health Connect permissions:', error);
        return false;
    }
}

/**
 * Request Health Connect permissions
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    try {
        await HealthConnect.requestHealthPermissions();
        // Re-check permissions after request
        return await hasHealthConnectPermissions();
    } catch (error) {
        console.error('Error requesting Health Connect permissions:', error);
        return false;
    }
}

/**
 * Sync a completed workout to Health Connect
 * @param workout - The workout data to sync
 * @param isEnabled - Whether the user has enabled Health Connect sync (from profile)
 */
export async function syncWorkoutToHealthConnect(workout: {
    name: string;
    startTime: Date;
    endTime: Date;
    totalVolume?: number;
    exerciseCount?: number;
    notes?: string;
}, isEnabled: boolean = true): Promise<boolean> {
    // Check if user has enabled Health Connect sync
    if (!isEnabled) {
        console.log('Health Connect sync skipped - disabled by user');
        return false;
    }

    if (!Capacitor.isNativePlatform()) {
        console.log('Health Connect sync skipped - not on native platform');
        return false;
    }

    // Check if available and has permissions
    const available = await isHealthConnectAvailable();
    if (!available) {
        console.log('Health Connect not available on this device');
        return false;
    }

    const hasPermissions = await hasHealthConnectPermissions();
    if (!hasPermissions) {
        console.log('Health Connect permissions not granted');
        return false;
    }

    try {
        // Estimate calories from volume (very rough estimate: 1 cal per 30 lbs lifted)
        const estimatedCalories = workout.totalVolume ? Math.round(workout.totalVolume / 30) : 0;

        const result = await HealthConnect.writeWorkout({
            title: workout.name,
            startTime: workout.startTime.getTime(),
            endTime: workout.endTime.getTime(),
            calories: estimatedCalories,
            notes: workout.notes || `fRepo: ${workout.exerciseCount || 0} exercises`,
        });

        console.log('Workout synced to Health Connect:', result);
        return result.success;
    } catch (error) {
        console.error('Error syncing to Health Connect:', error);
        return false;
    }
}

/**
 * Check if we're running in the Capacitor native app
 */
export function isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
}
