
'use client';

import { useState, useMemo } from 'react';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { UserProfile, WorkoutLog, Exercise } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MaleBody } from './male-body';
import { FemaleBody } from './female-body';
import { Button } from './ui/button';
import Link from 'next/link';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { subDays } from 'date-fns';

// Mapping from exercise category to a simpler muscle group key
const categoryToMuscleMap: Record<string, string> = {
  'Chest': 'Chest',
  'Back': 'Back',
  'Shoulders': 'Shoulders',
  'Legs': 'Legs',
  'Arms': 'Arms', // A general fallback
  'Biceps': 'Biceps',
  'Triceps': 'Triceps',
  'Core': 'Core',
};

export type MuscleData = {
    [key: string]: {
        volume: number;
        intensity: number;
    }
}

export function MuscleHeatmap() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState('30');

    const userProfileRef = useMemoFirebase(() => 
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [firestore, user]);
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

    const masterExercisesQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'exercises') : null,
    [firestore]);
    const { data: masterExercises, isLoading: isLoadingMasterExercises } = useCollection<Exercise>(masterExercisesQuery);
    
    const exercisesById = useMemo(() => {
        if (!masterExercises) return {};
        return masterExercises.reduce((acc, ex) => {
            acc[ex.id] = ex;
            return acc;
        }, {} as Record<string, Exercise>);
    }, [masterExercises]);


    const workoutLogsQuery = useMemoFirebase(() => {
        if (!user) return null;
        const baseQuery = collection(firestore, `users/${user.uid}/workoutLogs`);
        if (timeRange === 'all') {
            return query(baseQuery, orderBy('date', 'desc'));
        }
        const startDate = subDays(new Date(), parseInt(timeRange));
        return query(baseQuery, where('date', '>=', startDate.toISOString()), orderBy('date', 'desc'));

    }, [firestore, user, timeRange]);
    const { data: workoutLogs, isLoading: isLoadingLogs } = useCollection<WorkoutLog>(workoutLogsQuery);

    const muscleData: MuscleData = useMemo(() => {
        if (!workoutLogs || Object.keys(exercisesById).length === 0) return {};

        const data: { [key: string]: { volume: number } } = {};
        let maxVolume = 0;

        workoutLogs.forEach(log => {
            log.exercises.forEach(exerciseLog => {
                const masterExercise = exercisesById[exerciseLog.exerciseId];
                if (masterExercise && masterExercise.category) {
                    const muscle = categoryToMuscleMap[masterExercise.category] || null;

                    if (muscle) {
                        if (!data[muscle]) {
                            data[muscle] = { volume: 0 };
                        }
                        const exerciseVolume = exerciseLog.sets.reduce((acc, set) => acc + set.reps * set.weight, 0);
                        data[muscle].volume += exerciseVolume;

                        if (data[muscle].volume > maxVolume) {
                            maxVolume = data[muscle].volume;
                        }
                    }
                }
            });
        });

        // Normalize intensity from 0 to 1
        const finalData: MuscleData = {};
        for (const muscle in data) {
            finalData[muscle] = {
                volume: data[muscle].volume,
                intensity: maxVolume > 0 ? data[muscle].volume / maxVolume : 0,
            };
        }
        return finalData;

    }, [workoutLogs, exercisesById]);
    
    const isLoading = isLoadingProfile || isLoadingLogs || isLoadingMasterExercises;

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Muscle Heatmap</CardTitle>
                </CardHeader>
                <CardContent className="h-[450px] flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">Loading Heatmap...</div>
                </CardContent>
            </Card>
        )
    }

    if (!userProfile?.biologicalSex) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Muscle Heatmap</CardTitle>
                    <CardDescription>Select your body type in settings to see your activity heatmap.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild>
                        <Link href="/settings">Go to Settings</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const BodyComponent = userProfile.biologicalSex === 'Male' ? MaleBody : FemaleBody;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Muscle Heatmap</CardTitle>
                <CardDescription>Your workout activity focus.</CardDescription>
            </CardHeader>
            <CardContent>
               {isLoadingLogs ? (
                 <div className="h-[450px] flex items-center justify-center"><p>Loading activity...</p></div>
               ) : (
                <div className="w-full h-[450px] flex items-center justify-center">
                    <BodyComponent muscleData={muscleData} />
                </div>
               )}
            </CardContent>
            <CardFooter>
                 <Select onValueChange={setTimeRange} defaultValue={timeRange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 90 Days</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </CardFooter>
        </Card>
    );
}
