
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from '@/components/ui/form';
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
import { format } from 'date-fns';
import { exercises } from '@/lib/data';
import type { ChartConfig } from '@/components/ui/chart';
import {
  useCollection,
  useUser,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { WorkoutLog, ProgressLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const weightLogSchema = z.object({
  weight: z.coerce.number().min(1, { message: 'Please enter a valid weight.' }),
});

export default function ProgressPage() {
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0].id);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);

  const workoutLogsQuery = useMemoFirebase(
    () => {
      if (!user) return null;
      return query(
        collection(firestore, `users/${user.uid}/workoutLogs`),
        orderBy('date', 'asc')
      );
    },
    [firestore, user]
  );
  const { data: workoutLogs, isLoading: isLoadingWorkoutLogs } =
    useCollection<WorkoutLog>(workoutLogsQuery);

  const progressLogsQuery = useMemoFirebase(
    () => {
      if (!user) return null;
      return query(
        collection(firestore, `users/${user.uid}/progressLogs`),
        orderBy('date', 'asc')
      );
    },
    [firestore, user]
  );
  const { data: progressLogs, isLoading: isLoadingProgressLogs } =
    useCollection<ProgressLog>(progressLogsQuery);

  const weightForm = useForm<z.infer<typeof weightLogSchema>>({
    resolver: zodResolver(weightLogSchema),
    defaultValues: {
      weight: undefined,
    },
  });

  const onWeightSubmit = async (values: z.infer<typeof weightLogSchema>) => {
    if (!user) return;
    setIsSubmittingWeight(true);
    const progressLogCollection = collection(
      firestore,
      `users/${user.uid}/progressLogs`
    );
    try {
      await addDocumentNonBlocking(progressLogCollection, {
        userId: user.uid,
        date: new Date().toISOString(),
        weight: values.weight,
      });
      toast({ title: 'Success', description: 'Your weight has been logged.' });
      weightForm.reset();
    } catch (error) {
      console.error('Error logging weight:', error);
      toast({
        title: 'Error',
        description: 'Failed to log weight.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingWeight(false);
    }
  };

  const exerciseChartData = useMemo(() => {
    if (!selectedExerciseId || !workoutLogs) return [];

    return workoutLogs
      .map((log) => {
        const exerciseLog = log.exercises.find(
          (e) => e.exerciseId === selectedExerciseId
        );
        if (!exerciseLog) return null;

        const maxWeight = Math.max(...exerciseLog.sets.map((s) => s.weight), 0);

        return {
          date: new Date(log.date),
          maxWeight,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.date.getTime() - b!.date.getTime());
  }, [selectedExerciseId, workoutLogs]);

  const weightChartData = useMemo(() => {
    if (!progressLogs) return [];
    return progressLogs.map((log) => ({
      date: new Date(log.date),
      weight: log.weight,
    }));
  }, [progressLogs]);

  const selectedExerciseName = exercises.find(
    (e) => e.id === selectedExerciseId
  )?.name;

  const maxWeightChartConfig = {
    maxWeight: {
      label: 'Max Weight (lbs)',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  const weightChartConfig = {
    weight: {
      label: 'Body Weight (lbs)',
      color: 'hsl(var(--accent))',
    },
  } satisfies ChartConfig;

  const isLoading = isLoadingWorkoutLogs || isLoadingProgressLogs;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Progress Tracker</h1>
        <p className="text-muted-foreground">
          Log your weight and visualize your performance over time.
        </p>
      </div>

      <Accordion type="multiple" className="w-full space-y-4">
        <AccordionItem value="log-weight" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 text-left">
              <div>
                <CardTitle>Log Body Weight</CardTitle>
                <CardDescription className="mt-1.5 text-left">
                  Enter your current weight for today.
                </CardDescription>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Form {...weightForm}>
                <form onSubmit={weightForm.handleSubmit(onWeightSubmit)}>
                  <CardContent>
                    <FormField
                      control={weightForm.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (lbs)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 185.5"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isSubmittingWeight}>
                      {isSubmittingWeight && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Log Weight
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="weight-progression" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 text-left">
                <div>
                    <CardTitle>Weight Progression</CardTitle>
                    <CardDescription className="mt-1.5 text-left">
                        Your body weight over time.
                    </CardDescription>
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent>
                {isLoading && <p>Loading chart data...</p>}
                {!isLoading && weightChartData.length > 0 ? (
                  <ChartContainer
                    config={weightChartConfig}
                    className="h-[200px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={weightChartData as any}
                        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) =>
                            format(new Date(value), 'MMM d')
                          }
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          dataKey="weight"
                          domain={['dataMin - 5', 'dataMax + 5']}
                          axisLine={false}
                          tickLine={false}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2}
                          dot={{ r: 4, fill: 'hsl(var(--accent))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  !isLoading && (
                    <p className="text-sm text-muted-foreground">
                      No weight logged yet.
                    </p>
                  )
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="exercise-performance" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 text-left">
                <div>
                    <CardTitle>Exercise Performance</CardTitle>
                    <CardDescription className="mt-1.5 text-left">
                        Select an exercise to see your lift progression.
                    </CardDescription>
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4">
                <div className="max-w-xs">
                  <label className="text-sm font-medium">
                    Select Exercise
                  </label>
                  <Select
                    value={selectedExerciseId}
                    onValueChange={setSelectedExerciseId}
                  >
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
                </div>
                {isLoading && (
                  <div className="flex flex-col items-center justify-center p-12">
                    <CardHeader className="text-center">
                      <CardTitle>Loading Progress Data...</CardTitle>
                    </CardHeader>
                  </div>
                )}
                {!isLoading && exerciseChartData.length > 0 ? (
                  <ChartContainer
                    config={maxWeightChartConfig}
                    className="h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={exerciseChartData as any}
                        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) =>
                            format(new Date(value), 'MMM d')
                          }
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          dataKey="maxWeight"
                          domain={['dataMin - 10', 'dataMax + 10']}
                          axisLine={false}
                          tickLine={false}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Line
                          type="monotone"
                          dataKey="maxWeight"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  !isLoading && (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
                      <CardHeader className="text-center">
                        <CardTitle>No Data Available</CardTitle>
                        <CardDescription>
                          No workout logs found for {selectedExerciseName}.
                          Complete a workout with this exercise to see your
                          progress.
                        </CardDescription>
                      </CardHeader>
                    </div>
                  )
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

    