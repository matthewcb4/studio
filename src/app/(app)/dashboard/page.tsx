"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
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
import { useCollection, useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import type { CustomWorkout, WorkoutLog } from "@/lib/types";
import { Dumbbell } from "lucide-react";

const parseDuration = (duration: string): number => {
    const parts = duration.split(':');
    if (parts.length === 2) {
        const [minutes, seconds] = parts.map(Number);
        return minutes * 60 + seconds;
    }
    return 0;
};

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
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
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
          <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Total Volume</CardTitle>
                    <CardDescription>This week</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{weeklyStats.volume.toLocaleString()} lbs</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Workouts</CardTitle>
                    <CardDescription>This week</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{weeklyStats.workouts}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Time Spent</CardTitle>
                    <CardDescription>This week</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{weeklyStats.time} min</div>
                </CardContent>
            </Card>
          </>
        ) : (
          <Card className="sm:col-span-1 md:col-span-3 lg:col-span-1 xl:col-span-3 flex flex-col items-center justify-center p-6">
            <CardHeader className="text-center">
              <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle className="mt-4">No Data Yet</CardTitle>
              <CardDescription>
                Complete your first workout to see your stats here.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

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
