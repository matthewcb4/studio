
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
  Star,
  Loader2,
  SkipForward,
  Youtube,
  Edit,
  Save,
  Share2,
} from 'lucide-react';
import Image from 'next/image';
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
import type { CustomWorkout, LoggedSet, WorkoutExercise, UserExercisePreference, ProgressLog, LoggedExercise, WorkoutLog, UserProfile } from '@/lib/types';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDoc,
  useUser,
  useFirestore,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useCollection,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc, collection, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { findExerciseVideo, type FindExerciseVideoOutput } from '@/ai/flows/find-exercise-video-flow';
import { ShareWorkoutDialog } from '@/components/share-workout-dialog';
import { ShareWorkoutDialog } from '@/components/share-workout-dialog';
import { checkPersonalRecord } from '@/lib/analytics';
import { PlateCalculator } from '@/components/plate-calculator';



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
  duration: string;
  includeBodyweight: boolean;
  setType: 'normal' | 'warmup' | 'drop' | 'failure';
};

// Group exercises by supersetId for display
const groupExercises = (exercises: WorkoutExercise[] = []) => {
  if (!exercises) return [];
  const grouped = exercises.reduce((acc, ex) => {
    (acc[ex.supersetId] = acc[ex.supersetId] || []).push(ex);
    return acc;
  }, {} as Record<string, WorkoutExercise[]>);

  // Sort outer groups, a bit tricky without a dedicated order field.
  // Let's assume the first exercise's original index gives a hint.
  const originalOrder: Record<string, number> = {};
  exercises.forEach((ex, index) => {
    if (!(ex.supersetId in originalOrder)) {
      originalOrder[ex.supersetId] = index;
    }
  });

  return Object.values(grouped).sort((a, b) => {
    const orderA = originalOrder[a[0].supersetId];
    const orderB = originalOrder[b[0].supersetId];
    return orderA - orderB;
  });
};


export default function WorkoutSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const workoutId = params.id as string;

  const { user } = useUser();
  const firestore = useFirestore();

  const [sessionExercises, setSessionExercises] = useState<WorkoutExercise[]>([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const workoutDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}/customWorkouts/${workoutId}`);
  }, [firestore, user, workoutId]);

  const { data: workout, isLoading: isLoadingWorkout } =
    useDoc<CustomWorkout>(workoutDocRef);

  useEffect(() => {
    if (workout?.exercises) {
      // Initialize session exercises when workout data loads
      setSessionExercises(workout.exercises);
    }
  }, [workout]);

  const exercisePreferencesQuery = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/exercisePreferences`) : null
    , [firestore, user]);
  const { data: exercisePreferences, isLoading: isLoadingPreferences } = useCollection<UserExercisePreference>(exercisePreferencesQuery);

  const progressLogsQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, `users/${user.uid}/progressLogs`), orderBy("date", "desc"), limit(1)) : null
    , [firestore, user]);
  const { data: latestProgress } = useCollection<ProgressLog>(progressLogsQuery);
  const latestWeight = latestProgress?.[0]?.weight || 150;

  const userProfileRef = useMemoFirebase(() =>
    user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const historyQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, `users/${user.uid}/workoutLogs`)) : null
    , [firestore, user]);
  const { data: workoutHistory } = useCollection<WorkoutLog>(historyQuery);


  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  // State for all exercises in the current group
  const [exerciseStates, setExerciseStates] = useState<
    Record<string, ExerciseState>
  >({});
  const [sessionLog, setSessionLog] = useState<Record<string, LoggedSet[]>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finishedLog, setFinishedLog] = useState<WorkoutLog | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(0);

  const [videoResults, setVideoResults] = useState<{ exerciseId: string; videos: FindExerciseVideoOutput['videos'] }>({ exerciseId: '', videos: [] });
  const [findingVideoFor, setFindingVideoFor] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<FindExerciseVideoOutput['videos'][0] | null>(null);

  // Auto-Rest Timer State
  const [restTimer, setRestTimer] = useState<{ endTime: number; originalDuration: number } | null>(null);
  const [restTimeRemaining, setRestTimeRemaining] = useState<number>(0);

  // Timer Effect
  useEffect(() => {
    if (!restTimer) return;

    const interval = setInterval(() => {
      const remaining = Math.ceil((restTimer.endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setRestTimer(null);
        setRestTimeRemaining(0);
        // Optional: Play a sound?
        toast({ title: "Rest Finished!", description: "Time to get back to work." });
      } else {
        setRestTimeRemaining(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [restTimer, toast]);

  const skipRest = () => {
    setRestTimer(null);
    setRestTimeRemaining(0);
  };

  const addRestTime = (seconds: number) => {
    if (restTimer) {
      setRestTimer(prev => prev ? { ...prev, endTime: prev.endTime + seconds * 1000 } : null);
    }
  };

  const exerciseGroups = useMemo(() => {
    if (!sessionExercises) return [];
    return groupExercises(sessionExercises);
  }, [sessionExercises]);

  // Initialize/reset exercise states when workout or group changes
  useEffect(() => {
    if (exerciseGroups[currentGroupIndex]) {
      const newStates: Record<string, ExerciseState> = {};
      exerciseGroups[currentGroupIndex].forEach(ex => {
        newStates[ex.id] = {
          currentSet: 1,
          logs: [],
          weight: '',
          reps: '',
          duration: '',
          includeBodyweight: false, // Default to NOT including bodyweight
          setType: 'normal',
        };
      });
      setExerciseStates(newStates);
    }
  }, [exerciseGroups, currentGroupIndex]);


  useEffect(() => {
    const timer = setInterval(() => {
      if (!isFinished) {
        setElapsedTime((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  const handleFindVideo = async (exerciseId: string, exerciseName: string) => {
    if (!exerciseName) return;
    setFindingVideoFor(exerciseId);
    try {
      const result = await findExerciseVideo({ exerciseName });
      if (result.videos && result.videos.length > 0) {
        setVideoResults({ exerciseId, videos: result.videos });
        setSelectedVideo(result.videos[0]);
      } else {
        toast({ variant: "destructive", title: "No Videos Found", description: "The AI couldn't find any suitable videos for this exercise." });
      }
    } catch (error) {
      console.error("Error finding video:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Could not find videos at this time." });
    } finally {
      setFindingVideoFor(null);
    }
  };

  const handleSelectVideo = (masterExerciseId: string, videoId: string) => {
    if (!user) return;
    const preferenceDocRef = doc(firestore, `users/${user.uid}/exercisePreferences`, masterExerciseId);
    setDocumentNonBlocking(preferenceDocRef, { videoId: videoId, userId: user.uid }, { merge: true });

    toast({
      title: "Video Preference Saved",
      description: `Video linked for this exercise.`
    });
    setVideoResults({ exerciseId: '', videos: [] }); // Close dialog
    setSelectedVideo(null);
  };

  const handleUnitChange = (exerciseId: string, newUnit: WorkoutExercise['unit']) => {
    setSessionExercises(prevExercises =>
      prevExercises.map(ex =>
        ex.id === exerciseId ? { ...ex, unit: newUnit } : ex
      )
    );
  };

  if (isLoadingWorkout || isLoadingPreferences) {
    return <div>Loading workout...</div>;
  }

  if (!workout) {
    return <div>Workout not found.</div>;
  }

  const currentGroup = exerciseGroups[currentGroupIndex];
  const totalGroups = exerciseGroups.length;
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

  const handleLogSet = (exercise: WorkoutExercise, skipped = false) => {
    const state = exerciseStates[exercise.id];
    const unit = exercise.unit || 'reps';

    let newLog: LoggedSet;

    if (skipped) {
      newLog = { weight: 0, reps: 0 };
    } else {
      if (unit === 'reps-only') {
        if (!state.reps) {
          toast({ title: 'Missing Info', description: 'Please enter reps.', variant: 'destructive' });
          return;
        }
        newLog = { weight: 0, reps: parseFloat(state.reps) };
      } else if (unit === 'bodyweight') {
        if (!state.reps) {
          toast({ title: 'Missing Info', description: 'Please enter reps.', variant: 'destructive' });
          return;
        }
        const additionalWeight = state.weight ? parseFloat(state.weight) : 0;
        const bodyweightComponent = state.includeBodyweight ? latestWeight : 0;
        newLog = { weight: bodyweightComponent + additionalWeight, reps: parseFloat(state.reps) };
      } else if (unit === 'reps') {
        if (!state.weight || !state.reps) {
          toast({ title: 'Missing Info', description: 'Please enter weight and reps.', variant: 'destructive' });
          return;
        }
        newLog = { weight: parseFloat(state.weight), reps: parseFloat(state.reps) };
      } else { // 'seconds'
        if (!state.duration) {
          toast({ title: 'Missing Info', description: 'Please enter duration.', variant: 'destructive' });
          return;
        }
        newLog = { duration: parseFloat(state.duration) };
      }
    }

    if (!skipped) {
      newLog.type = state.setType;
    }

    const fullSessionLog = sessionLog[exercise.id] || [];
    const updatedFullSessionLog = [...fullSessionLog, newLog];
    setSessionLog({ ...sessionLog, [exercise.id]: updatedFullSessionLog });

    // Update exercise state (move to next set)
    setExerciseStates(prev => ({
      ...prev,
      [exercise.id]: {
        ...prev[exercise.id],
        currentSet: prev[exercise.id].currentSet + 1,
        logs: [...prev[exercise.id].logs, newLog]
      }
    }));

    // Check for PRs
    if (!skipped && workoutHistory) {
      const prs = checkPersonalRecord(exercise.exerciseId, newLog, workoutHistory);
      if (prs) {
        prs.forEach(pr => {
          toast({
            title: "🏆 New Personal Record!",
            description: pr.type === 'max_weight'
              ? `Heaviest Weight: ${pr.newValue} lbs (Prev: ${pr.oldValue} lbs)`
              : `Best 1RM: ${pr.newValue} lbs (Prev: ${pr.oldValue} lbs)`,
            // Styling for "gold" effect
            className: "bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400",
            duration: 5000,
          });
        });
      }
    }

    // Auto-Rest Timer
    // Start timer if not the very last set of the workout (simplified: if not skipped)
    if (!skipped && state.currentSet < exercise.sets) {
      const REST_DURATION = 90; // Default 90s, could be preference
      setRestTimer({
        endTime: Date.now() + REST_DURATION * 1000,
        originalDuration: REST_DURATION
      });
      setRestTimeRemaining(REST_DURATION);
    }
  }

  const isGroupFinished = currentGroup.every(ex => {
    const state = exerciseStates[ex.id];
    return state && state.currentSet >= ex.sets && state.logs.length >= ex.sets;
  });

  const finishWorkout = async () => {
    if (!user || !workout || isFinishing) return;
    setIsFinishing(true);

    const logsCollection = collection(firestore, `users/${user.uid}/workoutLogs`);

    const loggedExercises: LoggedExercise[] = Object.entries(sessionLog).map(([exerciseInstanceId, sets]) => ({
      exerciseId: workout.exercises.find(e => e.id === exerciseInstanceId)?.exerciseId || 'Unknown',
      exerciseName: workout.exercises.find(e => e.id === exerciseInstanceId)?.exerciseName || 'Unknown',
      sets,
    }));

    const totalVolume = loggedExercises.reduce(
      (total, ex) =>
        total + ex.sets.reduce((sum, set) => {
          // Exclude warm-up sets from volume
          if (set.type === 'warmup') return sum;
          return sum + (set.weight || 0) * (set.reps || 0);
        }, 0),
      0
    );

    const newWorkoutLog: Omit<WorkoutLog, 'id'> = {
      userId: user.uid,
      workoutName: workout.name,
      date: new Date().toISOString(),
      duration: formatTime(elapsedTime),
      exercises: loggedExercises,
      volume: totalVolume,
      rating: 0, // Default rating
    };

    try {
      // 1. Save Workout Log
      const newLogRef = await addDoc(logsCollection, newWorkoutLog);
      setFinishedLog({ ...newWorkoutLog, id: newLogRef.id });

      // 2. Calculate Gamification Stats
      const now = new Date();
      // Use local date string for streak calculation to respect user's "day"
      const todayStr = now.toLocaleDateString('en-CA');
      const lastDateStr = userProfile?.lastWorkoutDate ? new Date(userProfile.lastWorkoutDate).toLocaleDateString('en-CA') : null;

      let newStreak = userProfile?.currentStreak || 0;
      let streakUpdated = false;

      // If not same day, check if consecutive
      if (lastDateStr !== todayStr) {
        if (lastDateStr) {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toLocaleDateString('en-CA');

          if (lastDateStr === yesterdayStr) {
            newStreak += 1;
            streakUpdated = true;
          } else {
            newStreak = 1; // Reset 
          }
        } else {
          newStreak = 1; // First workout
          streakUpdated = true;
        }
      }

      const newLongestStreak = Math.max(newStreak, userProfile?.longestStreak || 0);
      const newLifetimeVolume = (userProfile?.lifetimeVolume || 0) + totalVolume;

      // XP: 100 for finishing + 1 per 100lbs
      const xpEarned = 100 + Math.floor(totalVolume / 100);
      const currentXP = userProfile?.xp || 0;
      const newXP = currentXP + xpEarned;

      const currentLevel = userProfile?.level || 1;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const levelUp = newLevel > currentLevel;

      // 3. Update User Profile
      if (userProfileRef) {
        updateDocumentNonBlocking(userProfileRef, {
          lastWorkoutDate: now.toISOString(),
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lifetimeVolume: newLifetimeVolume,
          xp: newXP,
          level: newLevel
        });
      }

      setIsFinished(true); // Move to summary screen

      toast({
        title: 'Workout Complete!',
        description: `Logged successfully. +${xpEarned} XP!`,
      });

      if (streakUpdated) {
        setTimeout(() => {
          toast({
            title: "🔥 Streak Increased!",
            description: `You are on a ${newStreak} day streak!`,
            className: "bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400"
          });
        }, 1000);
      }

      if (levelUp) {
        setTimeout(() => {
          toast({
            title: "🎉 Level Up!",
            description: `Congratulations! You reached Level ${newLevel}!`,
            className: "bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400"
          });
        }, 2000);
      }

    } catch (error) {
      console.error("Error finishing workout:", error);
      toast({
        title: "Error",
        description: "Failed to save workout log.",
        variant: "destructive"
      });
    } finally {
      setIsFinishing(false);
    }
  };

  const handleRatingSubmit = (rating: number) => {
    if (!user || !finishedLog) return;
    setCurrentRating(rating);
    const logDocRef = doc(firestore, `users/${user.uid}/workoutLogs`, finishedLog.id);
    updateDocumentNonBlocking(logDocRef, { rating });
    toast({
      title: 'Rating Saved!',
      description: `You rated this workout ${rating} out of 5 stars.`
    });
  }

  const progressValue = totalGroups > 0 ? ((currentGroupIndex) / totalGroups) * 100 : 0;

  if (isFinished && finishedLog) {
    return (
      <>
        {isShareDialogOpen && finishedLog && userProfile && (
          <ShareWorkoutDialog
            log={finishedLog}
            userProfile={userProfile}
            isOpen={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
          />
        )}
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
          <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
          <h1 className="text-4xl font-bold mb-2">Workout Logged!</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Great job finishing your workout. How would you rate it?
          </p>
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className="w-10 h-10 cursor-pointer transition-colors"
                fill={star <= (hoverRating || currentRating) ? 'hsl(var(--primary))' : 'transparent'}
                stroke={star <= (hoverRating || currentRating) ? 'hsl(var(--primary))' : 'currentColor'}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleRatingSubmit(star)}
              />
            ))}
          </div>
          <Card className="w-full text-left">
            <CardHeader>
              <CardTitle>{finishedLog.workoutName}</CardTitle>
              <CardDescription>Session Summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time</span>
                <span className="font-bold text-primary">
                  {finishedLog.duration}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-bold text-primary">
                  {finishedLog.volume.toLocaleString()} lbs
                </span>
              </div>
              <div className="space-y-2">
                {finishedLog.exercises.map((exercise) => {
                  const totalVolume = exercise.sets.reduce(
                    (acc, set) => acc + (set.weight || 0) * (set.reps || 0),
                    0
                  );
                  return (
                    <div key={exercise.exerciseId} className="text-sm">
                      <p className="font-medium">{exercise.exerciseName}</p>
                      <p className="text-muted-foreground">
                        {exercise.sets.length} sets, Total Volume: {totalVolume.toLocaleString()} lbs
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button onClick={() => router.push('/history')} className="w-full">
              View in History
            </Button>
            <Button onClick={() => setIsShareDialogOpen(true)} className="w-full" variant="outline">
              <Share2 className="mr-2 h-4 w-4" /> Share Workout
            </Button>
          </div>
        </div>
      </>
    );
  }

  const handleNextGroup = () => {
    if (isLastGroup) {
      finishWorkout();
    } else {
      setCurrentGroupIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <Dialog open={videoResults.videos.length > 0} onOpenChange={() => { setVideoResults({ exerciseId: '', videos: [] }); setSelectedVideo(null); }}>
        <DialogContent className="sm:max-w-lg w-full max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Select a Video</DialogTitle>
            <DialogDescription>
              Click a video on the right to preview it, then link it to this exercise.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {selectedVideo ? (
                <>
                  <YouTubeEmbed videoId={selectedVideo.videoId} />
                  <h3 className="font-semibold">{selectedVideo.title}</h3>
                  <Button className="w-full" onClick={() => handleSelectVideo(videoResults.exerciseId, selectedVideo.videoId)}>
                    Link this Video
                  </Button>
                </>
              ) : (
                <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Select a video to preview</p>
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {videoResults.videos.map(video => (
                <button key={video.videoId} onClick={() => setSelectedVideo(video)} className="w-full text-left space-y-2 hover:bg-secondary p-2 rounded-lg transition-colors">
                  <div className="flex gap-4">
                    <Image src={video.thumbnailUrl} alt={video.title} width={120} height={67} className="rounded-md bg-muted" />
                    <p className="text-sm font-medium line-clamp-3">{video.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

        {currentGroup.map((exercise) => {
          const state = exerciseStates[exercise.id];
          if (!state) return <div key={exercise.id}>Loading exercise...</div>;

          const isEditing = editingExerciseId === exercise.id;
          const isExerciseComplete = state.currentSet > exercise.sets;
          const unit = exercise.unit || 'reps';

          const videoId = exercisePreferences?.find(p => p.id === exercise.exerciseId)?.videoId;

          return (
            <Card key={exercise.id} className={isExerciseComplete ? 'opacity-50' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{exercise.exerciseName}</CardTitle>
                    <CardDescription>
                      Set {Math.min(state.currentSet, exercise.sets)} of {exercise.sets} &bull; Goal: {exercise.reps} {unit === 'bodyweight' ? 'reps' : unit}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditingExerciseId(isEditing ? null : exercise.id)}>
                    {isEditing ? <Save className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <Label>Edit Logging Method</Label>
                    <Select value={unit} onValueChange={(newUnit) => handleUnitChange(exercise.id, newUnit as WorkoutExercise['unit'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reps">Weight & Reps</SelectItem>
                        <SelectItem value="reps-only">Reps Only</SelectItem>
                        <SelectItem value="seconds">Seconds</SelectItem>
                        <SelectItem value="bodyweight">Bodyweight</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : !isExerciseComplete && (
                  <>
                    {unit === 'reps' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 relative">
                          <div className="flex justify-between items-center">
                            <Label htmlFor={`weight-${exercise.id}`} className="text-base">Weight (lbs)</Label>
                            <PlateCalculator initialWeight={state.weight ? parseFloat(state.weight) : undefined} />
                          </div>
                          <Input id={`weight-${exercise.id}`} type="number" placeholder="135" value={state.weight} onChange={e => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, weight: e.target.value } })} className="h-14 text-2xl text-center" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`reps-${exercise.id}`} className="text-base">Reps</Label>
                          <Input id={`reps-${exercise.id}`} type="number" placeholder="8" value={state.reps} onChange={e => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, reps: e.target.value } })} className="h-14 text-2xl text-center" />
                        </div>
                      </div>
                    )}
                    {unit === 'reps-only' && (
                      <div className="space-y-2">
                        <Label htmlFor={`reps-${exercise.id}`} className="text-base">Reps</Label>
                        <Input id={`reps-${exercise.id}`} type="number" placeholder="15" value={state.reps} onChange={e => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, reps: e.target.value } })} className="h-14 text-2xl text-center" />
                      </div>
                    )}
                    {unit === 'bodyweight' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`weight-${exercise.id}`} className="text-base">Additional Weight</Label>
                            <Input id={`weight-${exercise.id}`} type="number" placeholder="0" value={state.weight} onChange={e => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, weight: e.target.value } })} className="h-14 text-2xl text-center" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`reps-${exercise.id}`} className="text-base">Reps</Label>
                            <Input id={`reps-${exercise.id}`} type="number" placeholder="10" value={state.reps} onChange={e => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, reps: e.target.value } })} className="h-14 text-2xl text-center" />
                          </div>
                        </div>
                      </div>
                        </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`include-bodyweight-${exercise.id}`}
                    checked={state.includeBodyweight}
                    onCheckedChange={(checked) => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, includeBodyweight: !!checked } })}
                  />
                  <Label htmlFor={`include-bodyweight-${exercise.id}`}>Include Bodyweight ({latestWeight} lbs)</Label>
                </div>
              </div>
                    )}
            </>
          )
        }

                {!isExerciseComplete && !isEditing && (
          <div className="flex justify-end mb-2">
            <Select value={state.setType} onValueChange={(val: any) => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, setType: val } })}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal Set</SelectItem>
                <SelectItem value="warmup">Warm-up</SelectItem>
                <SelectItem value="drop">Drop Set</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!isExerciseComplete && (
          <div className="flex gap-4">
            onCheckedChange={(checked) => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, includeBodyweight: !!checked } })}
                          />
            <Label htmlFor={`include-bodyweight-${exercise.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Include Bodyweight ({latestWeight} lbs)
            </Label>
          </div>
                      </div>
                    )}
      {unit === 'seconds' && (
        <div className="space-y-2">
          <Label htmlFor={`duration-${exercise.id}`} className="text-base">Duration (seconds)</Label>
          <Input id={`duration-${exercise.id}`} type="number" placeholder="60" value={state.duration} onChange={e => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, duration: e.target.value } })} className="h-14 text-2xl text-center" />
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={() => handleLogSet(exercise)} className="w-full h-14 text-lg">
          Log Set
        </Button>
        <Button onClick={() => handleLogSet(exercise, true)} variant="outline" size="icon" className="h-14 w-14 flex-shrink-0">
          <SkipForward />
          <span className="sr-only">Skip Set</span>
        </Button>
      </div>
    </>
  )
}
{
  state.logs.length > 0 && (
    <div className="mt-4">
      <p className="text-base font-medium mb-2">Logged Sets</p>
      <ul className="space-y-2">
        {state.logs.map((set, index) => (
          <li key={index} className="flex justify-between items-center text-base p-3 bg-secondary rounded-md">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium text-secondary-foreground">Set {index + 1}</span>
            </div>
            {unit === 'seconds' ? (
              <span className="text-muted-foreground">{set.duration} seconds</span>
            ) : (
              <span className="text-muted-foreground">{set.weight} lbs &times; {set.reps} reps</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
              </CardContent >
  <CardContent>
    <Collapsible>
      <div className="flex gap-2">
        {videoId && (
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Video className="mr-2 h-4 w-4" />
              Show/Hide Video
            </Button>
          </CollapsibleTrigger>
        )}
        <Button
          variant="outline" size="sm" className="w-full"
          onClick={() => handleFindVideo(exercise.exerciseId, exercise.exerciseName)}
          disabled={findingVideoFor === exercise.id}
        >
          {findingVideoFor === exercise.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
          <span className="ml-2">Find Video</span>
        </Button>
      </div>
      <CollapsibleContent>
        {videoId ? <YouTubeEmbed videoId={videoId} /> : <p className="text-sm text-muted-foreground text-center mt-4">No video linked. Use "Find Video" to add one.</p>}
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
            </Card >
          );
        })}
<Button onClick={handleNextGroup} className="w-full h-14 text-lg" disabled={!isGroupFinished || isFinishing}>
  {isFinishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
  {isLastGroup ? 'Finish Workout' : 'Next Exercise Group'}
  <ChevronRight className="ml-2 h-4 w-4" />
</Button>
      </div >

  { restTimer && restTimeRemaining > 0 && (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-50 flex items-center justify-between gap-4 shadow-lg animate-in slide-in-from-bottom">
      <div className="flex items-center gap-4">
        <Timer className="w-8 h-8 text-primary animate-pulse" />
        <div>
          <p className="text-sm text-muted-foreground font-semibold">Resting...</p>
          <h3 className="text-2xl font-bold font-mono">{formatTime(restTimeRemaining)}</h3>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => addRestTime(30)}>+30s</Button>
        <Button onClick={skipRest} size="sm">Skip Rest</Button>
      </div>
    </div>
  )}
    </>
  );
}
