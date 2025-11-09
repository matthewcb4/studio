
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle,
  ArrowLeft,
  Timer,
  ChevronRight,
  Check,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { CustomWorkout, LoggedSet, WorkoutExercise } from '@/lib/types';
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
} from '@/components/ui/alert-dialog';
import {
  useDoc,
  useUser,
  useFirestore,
  addDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="aspect-[9/16] w-full max-w-sm mx-auto mt-2">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full rounded-lg"
      ></iframe>
    </div>
  );
}

// Represents the state for a single exercise within a group
type ExerciseState = {
  currentSet: number;
  logs: LoggedSet[];
  weight: string;
  reps: string;
};

export default function WorkoutSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const workoutId = params.id as string;

  const { user } = useUser();
  const firestore = useFirestore();

  const workoutDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}/customWorkouts/${workoutId}`);
  }, [firestore, user, workoutId]);

  const { data: workout, isLoading: isLoadingWorkout } =
    useDoc<CustomWorkout>(workoutDocRef);

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  // State for all exercises in the current group
  const [exerciseStates, setExerciseStates] = useState<
    Record<string, ExerciseState>
  >({});
  const [sessionLog, setSessionLog] = useState<Record<string, LoggedSet[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const groupedExercises = useMemo(() => {
    if (!workout?.exerciseGroups) return [];
    return workout.exerciseGroups;
  }, [workout]);

  // Initialize/reset exercise states when workout or group changes
  useEffect(() => {
    if (groupedExercises[currentGroupIndex]) {
      const newStates: Record<string, ExerciseState> = {};
      groupedExercises[currentGroupIndex].forEach(ex => {
        newStates[ex.exerciseId] = {
          currentSet: 1,
          logs: [],
          weight: '',
          reps: '',
        };
      });
      setExerciseStates(newStates);
    }
  }, [groupedExercises, currentGroupIndex]);


  useEffect(() => {
    setStartTime(new Date());
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoadingWorkout) {
    return <div>Loading workout...</div>;
  }

  if (!workout) {
    return <div>Workout not found.</div>;
  }
  
  const currentGroup = groupedExercises[currentGroupIndex];
  const totalGroups = groupedExercises.length;
  const isLastGroup = currentGroupIndex === totalGroups - 1;

  if (!currentGroup) {
      // Can happen if workout data is malformed or empty
      return <div>Error: No exercises found for this workout group.</div>
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleLogSet = (exercise: WorkoutExercise) => {
    const state = exerciseStates[exercise.exerciseId];
    if (!state.weight || !state.reps) {
      toast({
        title: 'Missing Info',
        description: 'Please enter weight and reps.',
        variant: 'destructive',
      });
      return;
    }

    const newLog: LoggedSet = { weight: parseFloat(state.weight), reps: parseFloat(state.reps) };
    
    // Update session log for the entire workout
    const fullSessionLog = sessionLog[exercise.exerciseId] || [];
    setSessionLog({ ...sessionLog, [exercise.exerciseId]: [...fullSessionLog, newLog]});

    // Update the local state for the current exercise
    const newLogs = [...state.logs, newLog];
    const newState = { ...state, logs: newLogs, weight: '', reps: '' };
    
    // Move to next set or finish exercise
    if (state.currentSet < exercise.sets) {
      newState.currentSet += 1;
    } 
    setExerciseStates({ ...exerciseStates, [exercise.exerciseId]: newState });
  };
  
  const handleNextGroup = () => {
     if (isLastGroup) {
      setIsFinished(true);
    } else {
      setCurrentGroupIndex(prev => prev + 1);
    }
  }

  // Check if all exercises in the current group are completed
  const isGroupFinished = currentGroup.every(ex => {
    const state = exerciseStates[ex.exerciseId];
    return state && state.currentSet >= ex.sets && state.logs.length >= ex.sets;
  });

  const finishWorkout = () => {
    if (!user || !workout) return;
    const logsCollection = collection(firestore, `users/${user.uid}/workoutLogs`);
    const exercises = Object.entries(sessionLog).map(([exerciseId, sets]) => ({
      exerciseId,
      exerciseName:
        workout.exerciseGroups
          .flat()
          .find((e) => e.exerciseId === exerciseId)?.exerciseName || 'Unknown',
      sets,
    }));
    const totalVolume = exercises.reduce(
      (total, ex) =>
        total + ex.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
      0
    );

    const workoutLog = {
      userId: user.uid,
      workoutName: workout.name,
      date: new Date().toISOString(),
      duration: formatTime(elapsedTime),
      exercises,
      volume: totalVolume,
    };

    addDocumentNonBlocking(logsCollection, workoutLog);

    toast({
      title: 'Workout Complete!',
      description: 'Your session has been logged successfully.',
    });
    router.push('/history');
  };

  const progressValue = (currentGroupIndex / totalGroups) * 100;
  
  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
        <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
        <h1 className="text-4xl font-bold mb-2">Workout Complete!</h1>
        <p className="text-muted-foreground text-lg mb-6">
          Great job finishing your workout.
        </p>
        <Card className="w-full text-left">
          <CardHeader>
            <CardTitle>{workout.name}</CardTitle>
            <CardDescription>Session Summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Time</span>
              <span className="font-bold text-primary">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(sessionLog).map(([exerciseId, sets]) => {
                const exercise = workout.exerciseGroups
                  .flat()
                  .find((e) => e.exerciseId === exerciseId);
                const totalVolume = sets.reduce(
                  (acc, set) => acc + set.weight * set.reps,
                  0
                );
                return (
                  <div key={exerciseId} className="text-sm">
                    <p className="font-medium">{exercise?.exerciseName}</p>
                    <p className="text-muted-foreground">
                      {sets.length} sets, Total Volume: {totalVolume} lbs
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Button onClick={finishWorkout} className="w-full mt-6">
          Save & Go to History
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Exit
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
              <AlertDialogDescription>
                Your current workout progress will be lost. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push('/dashboard')}>
                Exit Workout
              </AlertDialogAction>
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
          <p className="text-sm text-muted-foreground">
            Group {currentGroupIndex + 1} of {totalGroups}
          </p>
          <p className="text-sm font-medium">{workout.name}</p>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      {currentGroup.map((exercise, index) => {
        const state = exerciseStates[exercise.exerciseId];
        if (!state) return <div key={index}>Loading exercise...</div>;

        const isExerciseComplete = state.currentSet > exercise.sets;

        return (
          <Card key={exercise.exerciseId} className={isExerciseComplete ? 'opacity-50' : ''}>
            <CardHeader>
              <CardTitle className="text-2xl">{exercise.exerciseName}</CardTitle>
              <CardDescription>
                Set {Math.min(state.currentSet, exercise.sets)} of {exercise.sets} &bull; Goal: {exercise.reps} reps
              </CardDescription>
            </CardHeader>
            {!isExerciseComplete && (
                 <CardContent className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                         <Label htmlFor={`weight-${exercise.exerciseId}`}>Weight (lbs)</Label>
                         <Input id={`weight-${exercise.exerciseId}`} type="number" placeholder="e.g. 135" value={state.weight} onChange={e => setExerciseStates({...exerciseStates, [exercise.exerciseId]: {...state, weight: e.target.value}})} />
                         </div>
                         <div className="space-y-1">
                         <Label htmlFor={`reps-${exercise.exerciseId}`}>Reps</Label>
                         <Input id={`reps-${exercise.exerciseId}`} type="number" placeholder="e.g. 8" value={state.reps} onChange={e => setExerciseStates({...exerciseStates, [exercise.exerciseId]: {...state, reps: e.target.value}})} />
                         </div>
                     </div>
                     <Button onClick={() => handleLogSet(exercise)} className="w-full">
                         Log Set
                     </Button>
                 </CardContent>
            )}
             {state.logs.length > 0 && (
                <CardContent>
                    <p className="text-sm font-medium mb-2">Logged Sets</p>
                    <ul className="space-y-2">
                        {state.logs.map((set, index) => (
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
             )}
            {exercise.videoId && (
              <CardContent>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                        <Video className="mr-2 h-4 w-4"/>
                        Show/Hide Video
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <YouTubeEmbed videoId={exercise.videoId} />
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            )}
          </Card>
        );
      })}
       <Button onClick={handleNextGroup} className="w-full" disabled={!isGroupFinished}>
            {isLastGroup ? 'Log & Finish' : 'Next Exercise Group'}
            <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
    </div>
  );
}

    