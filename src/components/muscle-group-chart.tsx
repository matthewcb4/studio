
'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
    Chest: "hsl(340, 82%, 52%)",    // Bright Pink
    Back: "hsl(10, 82%, 52%)",     // Bright Orange
    Legs: "hsl(200, 82%, 52%)",    // Bright Blue
    Shoulders: "hsl(150, 82%, 52%)", // Bright Sea Green
    Arms: "hsl(280, 82%, 52%)",      // Bright Purple
    Core: "hsl(50, 82%, 52%)",       // Bright Yellow
};

interface MuscleGroupVolumeChartProps {
  filteredLogs: WorkoutLog[];
  masterExercises: Exercise[] | null;
  isLoading: boolean;
  dateRangeLabel?: string;
  isTrigger?: boolean;
}

export function MuscleGroupVolumeChart({
  filteredLogs,
  masterExercises,
  isLoading,
  dateRangeLabel,
  isTrigger = false,
}: MuscleGroupVolumeChartProps) {
  
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

  const renderChart = () => {
     if (isLoading) {
        return (
             <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading chart...</p>
                </div>
            </CardContent>
        );
      }
      if (chartData.length === 0) {
        return (
            <CardContent>
                <p className="text-sm text-muted-foreground">No workout data available for this period to display the chart.</p>
            </CardContent>
        );
      }
      return (
        <CardContent>
            <div className="h-[350px] -ml-4">
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
                                        <span className="font-bold" style={{color: chartColors[name as string]}}>{name}</span>
                                        <span>{Number(value).toLocaleString()} lbs</span>
                                    </div>
                                )}
                                labelFormatter={(label) => format(parseISO(label), 'PPP')}
                            />}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        {ALL_MUSCLE_GROUPS.map(group => (
                            <Line
                                key={group}
                                dataKey={group}
                                type="monotone"
                                stroke={chartColors[group]}
                                strokeWidth={2}
                                dot={false}
                                name={group}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
            </div>
        </CardContent>
      );
  }
  
  const headerContent = (
     <div>
        <CardTitle>Muscle Group Volume</CardTitle>
        <CardDescription className="mt-1 text-left">
            { isTrigger ? 'Total volume (lbs) for each muscle group over time.' : `Breakdown for the ${dateRangeLabel?.toLowerCase()}`}
        </CardDescription>
    </div>
  );

  if (isTrigger) {
    return headerContent;
  }

  return (
    <Card>
        <CardHeader>
            {headerContent}
        </CardHeader>
        {renderChart()}
    </Card>
  )
}
