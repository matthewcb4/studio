
'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import type { WorkoutLog, Exercise } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const categoryToMuscleGroup: Record<string, string[]> = {
  'Chest': ['Chest'],
  'Back': ['Back'],
  'Shoulders': ['Shoulders'],
  'Legs': ['Legs'],
  'Arms': ['Arms', 'Biceps', 'Triceps'],
  'Biceps': ['Arms', 'Biceps'],
  'Triceps': ['Arms', 'Triceps'],
  'Core': ['Core'],
  'Full Body': ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'],
  'Upper Body': ['Chest', 'Back', 'Shoulders', 'Arms'],
  'Lower Body': ['Legs', 'Core'],
};

const ALL_MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

const chartColors: Record<string, string> = {
    Chest: 'hsl(var(--chart-1))',
    Back: 'hsl(var(--chart-2))',
    Legs: 'hsl(var(--primary))',
    Shoulders: 'hsl(var(--accent))',
    Arms: 'hsl(var(--chart-5))',
    Core: 'hsl(var(--secondary))',
};

interface MuscleGroupVolumeChartProps {
  filteredLogs: WorkoutLog[];
  masterExercises: Exercise[] | null;
  isLoading: boolean;
}

export function MuscleGroupVolumeChart({
  filteredLogs,
  masterExercises,
  isLoading,
}: MuscleGroupVolumeChartProps) {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('Legs');

  const chartData = useMemo(() => {
    if (!filteredLogs || !masterExercises) return [];

    const dataByDate: Record<string, Record<string, number>> = {};

    filteredLogs.forEach(log => {
      const date = format(parseISO(log.date), 'yyyy-MM-dd');
      if (!dataByDate[date]) {
        dataByDate[date] = {};
        ALL_MUSCLE_GROUPS.forEach(group => {
            dataByDate[date][group] = 0;
        });
      }

      log.exercises.forEach(loggedEx => {
        const masterEx = masterExercises.find(me => me.id === loggedEx.exerciseId);
        if (masterEx?.category) {
          const exerciseVolume = loggedEx.sets.reduce((sum, set) => sum + (set.weight || 0) * (set.reps || 0), 0);
          
          const affectedGroups = categoryToMuscleGroup[masterEx.category] || [];
          affectedGroups.forEach(group => {
            if (ALL_MUSCLE_GROUPS.includes(group)) {
                 dataByDate[date][group] = (dataByDate[date][group] || 0) + exerciseVolume;
            }
          });
        }
      });
    });

    return Object.entries(dataByDate)
      .map(([date, volumes]) => ({ date, ...volumes }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  }, [filteredLogs, masterExercises]);


  const chartConfig: ChartConfig = useMemo(() => {
    return ALL_MUSCLE_GROUPS.reduce((acc, group) => {
        acc[group] = {
            label: group,
            color: chartColors[group],
        };
        return acc;
    }, {} as ChartConfig);
  }, []);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Muscle Group Volume</CardTitle>
                <CardDescription>Loading chart...</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading data...</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (chartData.length === 0) {
    return null; // Don't render the card if there's no data
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscle Group Volume</CardTitle>
        <CardDescription>
          Showing total volume (lbs) for the selected muscle group over time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div className="w-[180px]">
                <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Muscle Group" />
                    </SelectTrigger>
                    <SelectContent>
                    {ALL_MUSCLE_GROUPS.map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                            tickLine={false}
                            axisLine={false}
                            padding={{ left: 20, right: 20 }}
                        />
                        <YAxis
                            tickFormatter={(value) => `${value.toLocaleString()}`}
                            axisLine={false}
                            tickLine={false}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                formatter={(value, name) => (
                                    <div className="flex flex-col">
                                        <span className="font-bold">{name}</span>
                                        <span>{Number(value).toLocaleString()} lbs</span>
                                    </div>
                                )}
                                labelFormatter={(label) => format(parseISO(label), 'PPP')}
                            />}
                        />
                         <Line
                            dataKey={selectedMuscleGroup}
                            type="monotone"
                            stroke={chartColors[selectedMuscleGroup]}
                            strokeWidth={2}
                            dot={false}
                            name={selectedMuscleGroup}
                        />
                    </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
