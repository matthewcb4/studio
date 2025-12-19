'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timer, MapPin, Heart, TrendingUp, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

import type { ActivityType, CardioMetrics, WorkoutLog, UserProfile } from '@/lib/types';
import { useUser, useFirestore, addDoc, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cardioIntensityMultipliers } from '@/lib/muscle-mapping';

const cardioLogSchema = z.object({
    activityType: z.enum(['run', 'walk', 'cycle', 'hiit']),
    durationMinutes: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
    distance: z.coerce.number().optional(),
    distanceUnit: z.enum(['mi', 'km']).default('mi'),
    avgHeartRate: z.coerce.number().optional(),
    incline: z.coerce.number().optional(),
    notes: z.string().optional(),
});

type CardioLogFormValues = z.infer<typeof cardioLogSchema>;

// Cardio-only activity types
type CardioActivityType = 'run' | 'walk' | 'cycle' | 'hiit';

const activityOptions: { value: CardioActivityType; label: string; icon: string }[] = [
    { value: 'run', label: 'Run', icon: '🏃' },
    { value: 'walk', label: 'Walk', icon: '🚶' },
    { value: 'cycle', label: 'Cycle', icon: '🚴' },
    { value: 'hiit', label: 'HIIT', icon: '💪' },
];

// HIIT muscle group options for selection
const hiitMuscleOptions = [
    { value: 'quads', label: 'Legs (Quads)', icon: '🦵' },
    { value: 'glutes', label: 'Glutes', icon: '🍑' },
    { value: 'abs', label: 'Core', icon: '💪' },
    { value: 'chest', label: 'Chest', icon: '🏋️' },
    { value: 'shoulders_front', label: 'Shoulders', icon: '💪' },
    { value: 'lats', label: 'Back', icon: '🔙' },
    { value: 'biceps', label: 'Arms', icon: '💪' },
];

interface CardioLogFormProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultActivity?: CardioActivityType;
}

export function CardioLogForm({ isOpen, onOpenChange, defaultActivity = 'run' }: CardioLogFormProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedHiitMuscles, setSelectedHiitMuscles] = useState<string[]>(['quads', 'glutes', 'abs', 'chest', 'shoulders_front']);

    // User profile for streak updates
    const userProfileRef = useMemoFirebase(() =>
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
        , [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const form = useForm<CardioLogFormValues>({
        resolver: zodResolver(cardioLogSchema),
        defaultValues: {
            activityType: defaultActivity,
            durationMinutes: undefined,
            distance: undefined,
            distanceUnit: 'mi',
            avgHeartRate: undefined,
            incline: undefined,
            notes: '',
        },
    });

    // Calculate pace when distance and duration are available
    const watchedDuration = form.watch('durationMinutes');
    const watchedDistance = form.watch('distance');
    const watchedUnit = form.watch('distanceUnit');
    const watchedActivity = form.watch('activityType');

    const calculatedPace = (() => {
        if (!watchedDuration || !watchedDistance || watchedDistance === 0) return null;
        const paceMinutes = watchedDuration / watchedDistance;
        const mins = Math.floor(paceMinutes);
        const secs = Math.round((paceMinutes - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')} /${watchedUnit}`;
    })();

    // Reset form when dialog opens or activity type changes from buttons
    useEffect(() => {
        if (isOpen) {
            form.reset({
                activityType: defaultActivity,
                durationMinutes: undefined,
                distance: undefined,
                distanceUnit: 'mi',
                avgHeartRate: undefined,
                incline: undefined,
                notes: '',
            });
            // Reset HIIT muscles to default full-body selection
            setSelectedHiitMuscles(['quads', 'glutes', 'abs', 'chest', 'shoulders_front']);
        }
    }, [isOpen, defaultActivity, form]);

    const onSubmit = async (values: CardioLogFormValues) => {
        if (!user) return;
        setIsSubmitting(true);

        try {
            // Filter out undefined values to avoid Firebase errors
            const cardioMetrics: CardioMetrics = {};
            if (values.distance !== undefined) cardioMetrics.distance = values.distance;
            if (values.distanceUnit) cardioMetrics.distanceUnit = values.distanceUnit;
            if (calculatedPace) cardioMetrics.avgPace = calculatedPace;
            if (values.avgHeartRate !== undefined) cardioMetrics.avgHeartRate = values.avgHeartRate;
            if (values.incline !== undefined) cardioMetrics.incline = values.incline;

            // Get activity display name
            const activityName = activityOptions.find(a => a.value === values.activityType)?.label || 'Cardio';

            // Calculate muscles worked based on activity type
            let musclesWorked: Record<string, number> | undefined;
            const activityKey = activityName; // 'Run', 'Walk', 'Cycle', 'HIIT'

            if (values.activityType === 'hiit') {
                // Use user-selected muscles for HIIT
                const intensity = values.durationMinutes / 30; // Normalize: 30 min = 1.0 intensity
                musclesWorked = {};
                selectedHiitMuscles.forEach(muscle => {
                    musclesWorked![muscle] = intensity / selectedHiitMuscles.length;
                });
            } else if (cardioIntensityMultipliers[activityKey]) {
                // Use predefined multipliers for other cardio
                const intensity = values.durationMinutes / 30; // Normalize: 30 min = 1.0 intensity
                musclesWorked = {};
                const multipliers = cardioIntensityMultipliers[activityKey];
                for (const [muscle, multiplier] of Object.entries(multipliers)) {
                    musclesWorked[muscle] = intensity * multiplier;
                }
            }

            const workoutLog: Omit<WorkoutLog, 'id'> = {
                userId: user.uid,
                workoutName: `${activityName} Session`,
                date: new Date().toISOString(),
                duration: `${values.durationMinutes} min`,
                activityType: values.activityType,
                cardioMetrics,
                musclesWorked,
                // No exercises or volume for pure cardio
            };

            const logsCollection = collection(firestore, `users/${user.uid}/workoutLogs`);
            await addDoc(logsCollection, workoutLog);

            // Update user profile for streak and XP (cardio counts towards daily exercise streak)
            if (userProfileRef) {
                const now = new Date();
                const todayStr = now.toLocaleDateString('en-CA');
                const lastDateStr = userProfile?.lastWorkoutDate
                    ? new Date(userProfile.lastWorkoutDate).toLocaleDateString('en-CA')
                    : null;

                let newStreak = userProfile?.currentStreak || 0;
                let streakUpdated = false;

                // If not same day, check if consecutive
                if (lastDateStr !== todayStr) {
                    if (lastDateStr) {
                        const yesterday = new Date(now);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

                        if (lastDateStr === yesterdayStr) {
                            newStreak += 1;
                            streakUpdated = true;
                        } else {
                            newStreak = 1; // Reset
                        }
                    } else {
                        newStreak = 1; // First workout ever
                        streakUpdated = true;
                    }
                }

                const newLongestStreak = Math.max(newStreak, userProfile?.longestStreak || 0);

                // XP for cardio: 50 base + 1 per 5 minutes
                const xpEarned = 50 + Math.floor(values.durationMinutes / 5);
                const currentXP = userProfile?.xp || 0;
                const newXP = currentXP + xpEarned;
                const currentLevel = userProfile?.level || 1;
                const newLevel = Math.floor(newXP / 1000) + 1;
                const levelUp = newLevel > currentLevel;

                updateDocumentNonBlocking(userProfileRef, {
                    lastWorkoutDate: now.toISOString(),
                    currentStreak: newStreak,
                    longestStreak: newLongestStreak,
                    xp: newXP,
                    level: newLevel,
                });

                if (streakUpdated) {
                    setTimeout(() => {
                        toast({
                            title: "🔥 Streak Increased!",
                            description: `You are on a ${newStreak} day streak!`,
                            className: "bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400"
                        });
                    }, 500);
                }

                if (levelUp) {
                    setTimeout(() => {
                        toast({
                            title: "🎉 Level Up!",
                            description: `Congratulations! You reached Level ${newLevel}!`,
                            className: "bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400"
                        });
                    }, 1000);
                }
            }

            toast({
                title: 'Cardio Logged!',
                description: `${activityName} session (${values.durationMinutes} min) has been recorded.`,
            });

            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error('Error logging cardio:', error);
            toast({
                title: 'Error',
                description: 'Failed to log cardio session.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl">{activityOptions.find(a => a.value === watchedActivity)?.icon}</span>
                        Log Cardio Session
                    </DialogTitle>
                    <DialogDescription>
                        Record your cardio workout. Only duration is required.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="activityType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Activity Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select activity" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {activityOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    <span className="flex items-center gap-2">
                                                        <span>{option.icon}</span>
                                                        <span>{option.label}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="durationMinutes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Timer className="h-4 w-4" />
                                        Duration (minutes) *
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="30"
                                            {...field}
                                            className="text-lg"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="distance"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Distance
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                placeholder="3.0"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="distanceUnit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="mi">Miles</SelectItem>
                                                <SelectItem value="km">Kilometers</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {calculatedPace && (
                            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                <span className="text-sm">Pace: <strong>{calculatedPace}</strong></span>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="avgHeartRate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Heart className="h-4 w-4" />
                                        Avg Heart Rate (optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="145"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>BPM from your watch or chest strap</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {(watchedActivity === 'run' || watchedActivity === 'walk') && (
                            <FormField
                                control={form.control}
                                name="incline"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Incline % (optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.5"
                                                placeholder="1.0"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>For treadmill workouts</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {watchedActivity === 'hiit' && (
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm font-medium">Muscles Worked</Label>
                                    <p className="text-xs text-muted-foreground">Select the muscle groups you targeted</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {hiitMuscleOptions.map((option) => (
                                        <div key={option.value} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`hiit-muscle-${option.value}`}
                                                checked={selectedHiitMuscles.includes(option.value)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedHiitMuscles(prev => [...prev, option.value]);
                                                    } else {
                                                        setSelectedHiitMuscles(prev => prev.filter(m => m !== option.value));
                                                    }
                                                }}
                                            />
                                            <Label
                                                htmlFor={`hiit-muscle-${option.value}`}
                                                className="text-sm cursor-pointer"
                                            >
                                                {option.icon} {option.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Log Session
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
