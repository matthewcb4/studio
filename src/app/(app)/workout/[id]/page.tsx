"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, ArrowLeft, Timer, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { customWorkouts } from '@/lib/data';
import type { CustomWorkout, LoggedSet } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function WorkoutSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const workoutId = params.id as string;
  const workout: CustomWorkout | undefined = useMemo(() => customWorkouts.find(w => w.id === workoutId), [workoutId]);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [sessionLog, setSessionLog] = useState<Record<string, LoggedSet[]>>({});
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    setStartTime(new Date());
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!workout) {
    return <div>Workout not found.</div>;
  }

  const currentExercise = workout.exercises[currentExerciseIndex];
  const totalExercises = workout.exercises.length;
  const isLastSet = currentSet === currentExercise.sets;
  const isLastExercise = currentExerciseIndex === totalExercises - 1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleLogSet = () => {
    if (!weight || !reps) {
      toast({ title: 'Missing Info', description: 'Please enter weight and reps.', variant: 'destructive' });
      return;
    }
    const exerciseLog = sessionLog[currentExercise.exerciseId] || [];
    const newLog: LoggedSet = { weight: parseFloat(weight), reps: parseFloat(reps) };
    setSessionLog({ ...sessionLog, [currentExercise.exerciseId]: [...exerciseLog, newLog] });
    setWeight('');
    setReps('');

    if (isLastSet) {
      if (isLastExercise) {
        setIsFinished(true);
      } else {
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSet(1);
      }
    } else {
      setCurrentSet(prev => prev + 1);
    }
  };

  const finishWorkout = () => {
    // Mock saving the workout log
    console.log('Workout Finished!', { workout, sessionLog, duration: formatTime(elapsedTime) });
    toast({
      title: 'Workout Complete!',
      description: 'Your session has been logged successfully.',
    });
    router.push('/history');
  };
  
  const progressValue = (currentExerciseIndex / totalExercises) * 100;
  
  if(isFinished) {
    return (
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
            <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
            <h1 className="text-4xl font-bold mb-2">Workout Complete!</h1>
            <p className="text-muted-foreground text-lg mb-6">Great job finishing your workout.</p>
            <Card className="w-full text-left">
                <CardHeader>
                    <CardTitle>{workout.name}</CardTitle>
                    <CardDescription>Session Summary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Time</span>
                        <span className="font-bold text-primary">{formatTime(elapsedTime)}</span>
                    </div>
                     <div className="space-y-2">
                        {Object.entries(sessionLog).map(([exerciseId, sets]) => {
                             const exercise = workout.exercises.find(e => e.exerciseId === exerciseId);
                             const totalVolume = sets.reduce((acc, set) => acc + (set.weight * set.reps), 0);
                             return (
                                <div key={exerciseId} className="text-sm">
                                    <p className="font-medium">{exercise?.exerciseName}</p>
                                    <p className="text-muted-foreground">{sets.length} sets, Total Volume: {totalVolume} lbs</p>
                                </div>
                             )
                        })}
                    </div>
                </CardContent>
            </Card>
            <Button onClick={finishWorkout} className="w-full mt-6">
                Save & Go to History
            </Button>
        </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4"/> Exit</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
              <AlertDialogDescription>
                Your current workout progress will be lost. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push('/dashboard')}>Exit Workout</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div className="flex items-center gap-2 text-lg font-medium text-muted-foreground">
          <Timer className="h-5 w-5" />
          <span>{formatTime(elapsedTime)}</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1">
            <p className="text-sm text-muted-foreground">Exercise {currentExerciseIndex + 1} of {totalExercises}</p>
            <p className="text-sm font-medium">{workout.name}</p>
        </div>
        <Progress value={progressValue} className="h-2"/>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{currentExercise.exerciseName}</CardTitle>
          <CardDescription>
            Set {currentSet} of {currentExercise.sets} &bull; Goal: {currentExercise.reps} reps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input id="weight" type="number" placeholder="e.g. 135" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reps">Reps</Label>
              <Input id="reps" type="number" placeholder="e.g. 8" value={reps} onChange={e => setReps(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleLogSet} className="w-full">
            {isLastSet && isLastExercise ? 'Log & Finish' : isLastSet ? 'Log Set & Next Exercise' : 'Log Set'}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
        
      {sessionLog[currentExercise.exerciseId] && (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Logged Sets</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {sessionLog[currentExercise.exerciseId].map((set, index) => (
                         <li key={index} className="flex justify-between items-center text-sm p-2 bg-secondary rounded-md">
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="font-medium text-secondary-foreground">Set {index + 1}</span>
                            </div>
                            <span className="text-muted-foreground">{set.weight} lbs &times; {set.reps} reps</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
