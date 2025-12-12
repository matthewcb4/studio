'use client';

import { useState } from 'react';
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

import type { ActivityType, CardioMetrics, WorkoutLog } from '@/lib/types';
import { useUser, useFirestore, addDoc } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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

    const onSubmit = async (values: CardioLogFormValues) => {
        if (!user) return;
        setIsSubmitting(true);

        try {
            const cardioMetrics: CardioMetrics = {
                distance: values.distance,
                distanceUnit: values.distanceUnit,
                avgPace: calculatedPace || undefined,
                avgHeartRate: values.avgHeartRate,
                incline: values.incline,
            };

            // Get activity display name
            const activityName = activityOptions.find(a => a.value === values.activityType)?.label || 'Cardio';

            const workoutLog: Omit<WorkoutLog, 'id'> = {
                userId: user.uid,
                workoutName: `${activityName} Session`,
                date: new Date().toISOString(),
                duration: `${values.durationMinutes} min`,
                activityType: values.activityType,
                cardioMetrics,
                // No exercises or volume for pure cardio
            };

            const logsCollection = collection(firestore, `users/${user.uid}/workoutLogs`);
            await addDoc(logsCollection, workoutLog);

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
