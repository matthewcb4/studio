
"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfWeek, isWithinInterval } from "date-fns";
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import type { CustomWorkout, WorkoutLog, UserProfile, ProgressLog } from "@/lib/types";
import { Dumbbell, Target, TrendingDown, TrendingUp } from "lucide-react";

const parseDuration = (duration: string): number => {
    const parts = duration.split(':');
    if (parts.length === 2) {
        const [minutes, seconds] = parts.map(Number);
        return minutes * 60 + seconds;
    }
    return 0;
};

function ProgressSummaryCard() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => 
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [firestore, user]);
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

    const progressLogsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/progressLogs`), orderBy("date", "desc"), limit(1)) : null
    , [firestore, user]);
    const { data: latestProgress, isLoading: isLoadingProgress } = useCollection<ProgressLog>(progressLogsQuery);

    const isLoading = isLoadingProfile || isLoadingProgress;
    const currentWeight = latestProgress?.[0]?.weight;
    const targetWeight = userProfile?.targetWeight;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Progress Summary</CardTitle>
                    <CardDescription>Loading your progress...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">Calculating...</div>
                </CardContent>
            </Card>
        );
    }
    
    if (!targetWeight) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>Set Your Goal</CardTitle>
                    <CardDescription>Add a target weight in settings to see your progress.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/settings">Go to Settings</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (!currentWeight) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Log Your Weight</CardTitle>
                    <CardDescription>Log your weight on the progress page to see your status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/progress">Log Progress</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const diff = Math.round((currentWeight - targetWeight) * 10) / 10;
    const isAbove = diff > 0;
    const isAtGoal = diff === 0;

    let message;
    if (isAtGoal) {
        message = "You've hit your target weight. Amazing work!";
    } else if (isAbove) {
        message = `You are ${diff} lbs above your target. Keep pushing!`;
    } else {
        message = `You are ${Math.abs(diff)} lbs away from your target. You're getting closer!`;
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Progress to Goal</CardTitle>
                <CardDescription>Your journey to {targetWeight} lbs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                   {isAtGoal ? <Target className="w-8 h-8 text-green-500"/> : isAbove ? <TrendingDown className="w-8 h-8 text-yellow-500" /> : <TrendingUp className="w-8 h-8 text-blue-500" />}
                    <div className="text-3xl font-bold">{currentWeight} <span className="text-lg text-muted-foreground">lbs</span></div>
                </div>
                <p className="text-sm text-muted-foreground">{message}</p>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  const customWorkoutsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/customWorkouts`);
  }, [firestore, user]);
  const { data: customWorkouts, isLoading: isLoadingWorkouts } = useCollection<CustomWorkout>(customWorkoutsQuery);
  
  const allWorkoutLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc"));
  }, [firestore, user]);

  const { data: allLogs, isLoading: isLoadingLogs } = useCollection<WorkoutLog>(allWorkoutLogsQuery);

  const recentLogs = useMemo(() => allLogs?.slice(0, 5) || [], [allLogs]);

  const weeklyStats = useMemo(() => {
    if (!allLogs) {
      return { volume: 0, workouts: 0, time: 0 };
    }
    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    
    const thisWeeksLogs = allLogs.filter(log => {
      const logDate = new Date(log.date);
      return isWithinInterval(logDate, { start: startOfThisWeek, end: now });
    });

    const volume = thisWeeksLogs.reduce((acc, log) => acc + (log.volume || 0), 0);
    const workouts = thisWeeksLogs.length;
    const timeInSeconds = thisWeeksLogs.reduce((acc, log) => acc + parseDuration(log.duration), 0);
    const timeInMinutes = Math.floor(timeInSeconds / 60);

    return { volume, workouts, time: timeInMinutes };
  }, [allLogs]);

  const hasData = useMemo(() => allLogs && allLogs.length > 0, [allLogs]);

  return (
    <div className="flex flex-col gap-4 md:gap-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Start Workout</CardTitle>
                <CardDescription>
                Select one of your custom workouts to begin a session.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                <Select onValueChange={setSelectedWorkoutId} disabled={isLoadingWorkouts}>
                    <SelectTrigger>
                    <SelectValue placeholder={isLoadingWorkouts ? "Loading..." : "Select a workout"} />
                    </SelectTrigger>
                    <SelectContent>
                    {customWorkouts?.map((workout) => (
                        <SelectItem key={workout.id} value={workout.id}>
                        {workout.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <Button asChild disabled={!selectedWorkoutId}>
                    <Link href={selectedWorkoutId ? `/workout/${selectedWorkoutId}` : '#'}>Start Session</Link>
                </Button>
                </div>
            </CardContent>
            </Card>

            {hasData ? (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Workouts</CardTitle>
                        <CardDescription>This week</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{weeklyStats.workouts}</div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
                    <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground" />
                    <CardTitle className="mt-4">No Workout Data</CardTitle>
                    <CardDescription>
                        Complete a workout to see your stats.
                    </CardDescription>
                </Card>
            )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
            <ProgressSummaryCard />
            
            {hasData && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Total Volume</CardTitle>
                        <CardDescription>This week</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{weeklyStats.volume.toLocaleString()} lbs</div>
                    </CardContent>
                </Card>
            )}
        </div>
        
       <Card>
            <CardHeader>
                <CardTitle>Body Outline</CardTitle>
                <CardDescription>Your selected body type.</CardDescription>
            </CardHeader>
            <CardContent className="relative p-4 aspect-video">
                <Image src="https://raw.githubusercontent.com/matthewcb4/public_resources/1401389b789ae27dd8ce133567ebae3e240c139d/Male.png" alt="Body outline" fill className="object-contain" />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
                A log of your most recent workouts.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Workout</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Duration</TableHead>
                    <TableHead className="text-right">Total Volume</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoadingLogs && <TableRow><TableCell colSpan={4} className="text-center">Loading recent activity...</TableCell></TableRow>}
                {!isLoadingLogs && recentLogs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No recent workouts found.</TableCell></TableRow>}
                {recentLogs.map((log) => (
                    <TableRow key={log.id}>
                    <TableCell>
                        <div className="font-medium">{log.workoutName}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                        {format(new Date(log.date), "PPP")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                        {log.duration}
                    </TableCell>
                    <TableCell className="text-right">{log.volume.toLocaleString()} lbs</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    </div>
  );
}
