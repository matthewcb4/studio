"use client";

import { useState, useMemo } from 'react';
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { format } from 'date-fns';
import { exercises } from '@/lib/data';
import type { ChartConfig } from "@/components/ui/chart";
import { useCollection, useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { WorkoutLog } from '@/lib/types';


export default function ProgressPage() {
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0].id);
  const { user } = useUser();
  const firestore = useFirestore();

  const workoutLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "asc"));
  }, [firestore, user]);
  
  const { data: workoutLogs, isLoading } = useCollection<WorkoutLog>(workoutLogsQuery);

  const chartData = useMemo(() => {
    if (!selectedExerciseId || !workoutLogs) return [];
    
    return workoutLogs
      .map(log => {
        const exerciseLog = log.exercises.find(e => e.exerciseId === selectedExerciseId);
        if (!exerciseLog) return null;

        const maxWeight = Math.max(...exerciseLog.sets.map(s => s.weight), 0);
        const volume = exerciseLog.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);

        return {
          date: new Date(log.date),
          maxWeight,
          volume,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.date.getTime() - b!.date.getTime());
  }, [selectedExerciseId, workoutLogs]);

  const selectedExerciseName = exercises.find(e => e.id === selectedExerciseId)?.name;

  const maxWeightChartConfig = {
    maxWeight: {
      label: "Max Weight (lbs)",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const volumeChartConfig = {
    volume: {
      label: "Volume (lbs)",
      color: "hsl(var(--accent))",
    },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Progress Tracker</h1>
        <p className="text-muted-foreground">
          Visualize your performance over time for specific exercises.
        </p>
      </div>
      
      <Card className="max-w-sm">
        <CardContent className="pt-6">
          <label className="text-sm font-medium">Select Exercise</label>
           <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an exercise" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {isLoading && <Card className="flex flex-col items-center justify-center p-12"><CardHeader className="text-center"><CardTitle>Loading Progress Data...</CardTitle></CardHeader></Card>}
      {!isLoading && chartData.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Max Weight Progression</CardTitle>
                <CardDescription>{selectedExerciseName}</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={maxWeightChartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData as any} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'MMM d')}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        dataKey="maxWeight"
                        domain={['dataMin - 10', 'dataMax + 10']}
                        axisLine={false}
                        tickLine={false}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Line type="monotone" dataKey="maxWeight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                    </LineChart>
                </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Total Volume Progression</CardTitle>
                <CardDescription>{selectedExerciseName}</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={volumeChartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData as any} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'MMM d')}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis dataKey="volume" axisLine={false} tickLine={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="volume" fill="hsl(var(--accent))" radius={4} />
                    </BarChart>
                </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            </Card>
        </div>
        ) : (
        !isLoading && <Card className="flex flex-col items-center justify-center p-12">
            <CardHeader className="text-center">
                <CardTitle>No Data Available</CardTitle>
                <CardDescription>
                    No workout logs found for {selectedExerciseName}. Complete a workout with this exercise to see your progress.
                </CardDescription>
            </CardHeader>
        </Card>
      )}
    </div>
  );
}
