"use client";

import Link from "next/link";
import { useState } from "react";
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
import { format } from "date-fns";
import { useCollection, useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import type { CustomWorkout, WorkoutLog } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  const customWorkoutsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/customWorkouts`);
  }, [firestore, user]);
  const { data: customWorkouts, isLoading: isLoadingWorkouts } = useCollection<CustomWorkout>(customWorkoutsQuery);

  const workoutLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc"), limit(5));
  }, [firestore, user]);
  const { data: recentLogs, isLoading: isLoadingLogs } = useCollection<WorkoutLog>(workoutLogsQuery);

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
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>Total Volume</CardTitle>
                <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">20,500 lbs</div>
                <p className="text-xs text-muted-foreground">+15% from last week</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle>Workouts</CardTitle>
                <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">2</div>
                 <p className="text-xs text-muted-foreground">On track for your goal of 3</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle>Time Spent</CardTitle>
                <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">120 min</div>
                <p className="text-xs text-muted-foreground">+20 min from last week</p>
            </CardContent>
        </Card>
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
              {!isLoadingLogs && recentLogs?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No recent workouts found.</TableCell></TableRow>}
              {recentLogs?.map((log) => (
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
