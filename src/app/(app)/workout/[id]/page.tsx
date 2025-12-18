
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
  Music2,
  Mic,
  Plus,
  Undo2,
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
import type { CustomWorkout, LoggedSet, WorkoutExercise, UserExercisePreference, ProgressLog, LoggedExercise, WorkoutLog, UserProfile, PRResult, Exercise } from '@/lib/types';
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
  DialogFooter,
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
import { checkPersonalRecord } from '@/lib/analytics';
import { PlateCalculator } from '@/components/plate-calculator';
import { VoiceLogModal } from '@/components/voice-log-modal';
import { Combobox } from '@/components/ui/combobox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

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

  // Track session PRs
  const [sessionPRs, setSessionPRs] = useState<(PRResult & { exerciseId: string })[]>([]);

  // Auto-Rest Timer State
  const [restTimer, setRestTimer] = useState<{ endTime: number; originalDuration: number } | null>(null);
  const [restTimeRemaining, setRestTimeRemaining] = useState<number>(0);

  // Exit Dialog State
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  // Voice Logging State
  const [voiceLoggingExercise, setVoiceLoggingExercise] = useState<WorkoutExercise | null>(null);

  // Quick Add Exercise State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddExerciseId, setQuickAddExerciseId] = useState<string | null>(null);
  const [quickAddPlacement, setQuickAddPlacement] = useState<'current' | 'standalone'>('current');
  const [quickAddSets, setQuickAddSets] = useState('3');

  // Master exercises for quick add
  const masterExercisesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'exercises'), orderBy('name', 'asc')) : null
    , [firestore]);
  const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<Exercise>(masterExercisesQuery);

  // Exercise options for combobox
  const exerciseOptions = useMemo(() => {
    if (!masterExercises) return [];
    return masterExercises.map(ex => ({ value: ex.id, label: ex.name }));
  }, [masterExercises]);

  // Prevent accidental back navigation
  useEffect(() => {
    if (isFinished) return; // Allow exit if finished

    const handlePopState = (event: PopStateEvent) => {
      // Prevent the back action
      event.preventDefault();
      // Push the state back so we stay on the page
      window.history.pushState(null, '', window.location.href);
      // Show confirmation
      setIsExitDialogOpen(true);
    };

    // Push initial state so we have something to pop
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFinished]);

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

  // Build a lookup map of last logged weight/reps for each exercise from workout history
  const lastExerciseValues = useMemo(() => {
    const values: Record<string, { weight: string; reps: string }> = {};
    if (!workoutHistory) return values;

    // Sort logs by date descending to get most recent first
    const sortedLogs = [...workoutHistory].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // For each logged workout, extract the last set of each exercise
    for (const log of sortedLogs) {
      for (const exercise of (log.exercises || [])) {
        // Skip if we already have a more recent value for this exercise
        if (values[exercise.exerciseId]) continue;

        // Get the last completed set (not warmup, with actual values)
        const completedSets = exercise.sets.filter(
          set => set.reps && set.reps > 0 && set.type !== 'warmup'
        );
        const lastSet = completedSets[completedSets.length - 1];

        if (lastSet) {
          values[exercise.exerciseId] = {
            weight: lastSet.weight?.toString() || '',
            reps: lastSet.reps?.toString() || '',
          };
        }
      }
    }
    return values;
  }, [workoutHistory]);

  // Initialize/reset exercise states when workout or group changes
  useEffect(() => {
    if (exerciseGroups[currentGroupIndex]) {
      const newStates: Record<string, ExerciseState> = {};
      exerciseGroups[currentGroupIndex].forEach(ex => {
        // Get last logged values for this exercise (by exerciseId)
        const lastValues = lastExerciseValues[ex.exerciseId || ''] || { weight: '', reps: '' };

        newStates[ex.id] = {
          currentSet: 1,
          logs: [],
          weight: lastValues.weight,
          reps: lastValues.reps,
          duration: '',
          includeBodyweight: false, // Default to NOT including bodyweight
          setType: 'normal',
        };
      });
      setExerciseStates(newStates);
    }
  }, [exerciseGroups, currentGroupIndex, lastExerciseValues]);


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
      if (result.error) {
        toast({ variant: "destructive", title: "Video Search Failed", description: result.error });
      } else if (result.videos && result.videos.length > 0) {
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
          // Add unique PRs to session tracking
          setSessionPRs(prev => {
            // Avoid duplicates if user logs same set multiple times (simplified check)
            const exists = prev.some(p => p.type === pr.type && p.newValue === pr.newValue && p.exerciseId === exercise.exerciseId);
            if (exists) return prev;
            return [...prev, { ...pr, exerciseId: exercise.exerciseId }]; // Add exerciseId to distinguishing PRs
          });

          toast({
            title: "🏆 New Personal Record!",
            description: pr.type === 'max_weight'
              ? `Heaviest Weight: ${pr.newValue} lbs (Prev: ${pr.oldValue} lbs)`
              : `Best 1RM: ${pr.newValue} lbs (Prev: ${pr.oldValue} lbs)`,
            // Styling for "gold" effect - Opaque background for better readability
            className: "bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-900 dark:border-amber-600 dark:text-amber-100 shadow-lg",
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

  // Handler to undo the last logged set
  const handleUndoLastSet = (exercise: WorkoutExercise) => {
    const currentLogs = sessionLog[exercise.id] || [];
    if (currentLogs.length === 0) return;

    // Remove last set from session log
    const updatedLogs = currentLogs.slice(0, -1);
    setSessionLog({ ...sessionLog, [exercise.id]: updatedLogs });

    // Decrement current set counter and remove from exercise state logs
    setExerciseStates(prev => ({
      ...prev,
      [exercise.id]: {
        ...prev[exercise.id],
        currentSet: Math.max(1, prev[exercise.id].currentSet - 1),
        logs: prev[exercise.id].logs.slice(0, -1)
      }
    }));

    toast({ title: 'Set Removed', description: 'Last set has been undone.' });
  };

  // Handler for voice logging completion
  const handleVoiceLogComplete = (exercise: WorkoutExercise, data: { weight: number; reps: number }) => {
    const state = exerciseStates[exercise.id];
    const unit = exercise.unit || 'reps';

    let newLog: LoggedSet;

    if (unit === 'reps-only' || unit === 'bodyweight') {
      newLog = { weight: data.weight, reps: data.reps };
    } else {
      newLog = { weight: data.weight, reps: data.reps };
    }

    newLog.type = state.setType;

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
    if (workoutHistory) {
      const prs = checkPersonalRecord(exercise.exerciseId, newLog, workoutHistory);
      if (prs) {
        prs.forEach(pr => {
          setSessionPRs(prev => {
            const exists = prev.some(p => p.type === pr.type && p.newValue === pr.newValue && p.exerciseId === exercise.exerciseId);
            if (exists) return prev;
            return [...prev, { ...pr, exerciseId: exercise.exerciseId }];
          });

          toast({
            title: "🏆 New Personal Record!",
            description: pr.type === 'max_weight'
              ? `Heaviest Weight: ${pr.newValue} lbs (Prev: ${pr.oldValue} lbs)`
              : `Best 1RM: ${pr.newValue} lbs (Prev: ${pr.oldValue} lbs)`,
            className: "bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-900 dark:border-amber-600 dark:text-amber-100 shadow-lg",
            duration: 5000,
          });
        });
      }
    }

    // Auto-Rest Timer
    if (state.currentSet < exercise.sets) {
      const REST_DURATION = 90;
      setRestTimer({
        endTime: Date.now() + REST_DURATION * 1000,
        originalDuration: REST_DURATION
      });
      setRestTimeRemaining(REST_DURATION);
    }

    toast({ title: 'Set Logged!', description: `${data.weight} lbs × ${data.reps} reps` });
  };

  const isGroupFinished = currentGroup.every(ex => {
    const state = exerciseStates[ex.id];
    return state && state.currentSet >= ex.sets && state.logs.length >= ex.sets;
  });

  // Helper to get status of any group
  const getGroupStatus = (groupIndex: number): 'pending' | 'in-progress' | 'completed' => {
    const group = exerciseGroups[groupIndex];
    if (!group) return 'pending';

    const hasAnyLogs = group.some(ex => {
      const logs = sessionLog[ex.id];
      return logs && logs.length > 0;
    });

    const allComplete = group.every(ex => {
      const logs = sessionLog[ex.id];
      return logs && logs.length >= ex.sets;
    });

    if (allComplete) return 'completed';
    if (hasAnyLogs || groupIndex === currentGroupIndex) return 'in-progress';
    return 'pending';
  };

  // Handler to jump to a specific group
  const handleJumpToGroup = (groupIndex: number) => {
    setCurrentGroupIndex(groupIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle adding an exercise mid-workout
  const handleQuickAddExercise = () => {
    if (!quickAddExerciseId || !masterExercises) return;

    const selectedExercise = masterExercises.find(ex => ex.id === quickAddExerciseId);
    if (!selectedExercise) return;

    const uniqueId = `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine the supersetId based on placement choice
    let supersetId: string;
    if (quickAddPlacement === 'current' && currentGroup.length > 0) {
      // Add to the current group's superset
      supersetId = currentGroup[0].supersetId;
    } else {
      // Create a new standalone group
      supersetId = `quick_group_${Date.now()}`;
    }

    // Determine default unit based on exercise
    let unit: WorkoutExercise['unit'] = 'reps';
    const nameLower = selectedExercise.name.toLowerCase();
    if (nameLower.includes('plank') || nameLower.includes('hold') || nameLower.includes('wall sit')) {
      unit = 'seconds';
    } else if (nameLower.includes('push-up') || nameLower.includes('pull-up') || nameLower.includes('dip') ||
      nameLower.includes('chin-up') || nameLower.includes('burpee') || nameLower.includes('lunge')) {
      unit = 'bodyweight';
    }

    const newExercise: WorkoutExercise = {
      id: uniqueId,
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      sets: parseInt(quickAddSets) || 3,
      reps: unit === 'seconds' ? '30' : '8-12',
      unit,
      supersetId,
    };

    // Add to session exercises
    if (quickAddPlacement === 'current') {
      // Insert into the current group position
      const currentGroupFirstIndex = sessionExercises.findIndex(ex => ex.supersetId === supersetId);
      const newExercises = [...sessionExercises];
      // Insert after the last exercise in the current group
      const lastIndexInGroup = sessionExercises.reduce((lastIdx, ex, idx) =>
        ex.supersetId === supersetId ? idx : lastIdx, currentGroupFirstIndex);
      newExercises.splice(lastIndexInGroup + 1, 0, newExercise);
      setSessionExercises(newExercises);

      // Initialize state for this exercise immediately
      setExerciseStates(prev => ({
        ...prev,
        [uniqueId]: {
          currentSet: 1,
          logs: [],
          weight: '',
          reps: '',
          duration: '',
          includeBodyweight: false,
          setType: 'normal',
        }
      }));
    } else {
      // Add as a new group at the end
      setSessionExercises([...sessionExercises, newExercise]);
    }

    toast({
      title: '💪 Exercise Added!',
      description: `${selectedExercise.name} added ${quickAddPlacement === 'current' ? 'to current group' : 'as new group'}.`,
    });

    // Reset and close
    setQuickAddExerciseId(null);
    setQuickAddPlacement('current');
    setQuickAddSets('3');
    setIsQuickAddOpen(false);
  };

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
            prs={sessionPRs}
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
          </div >
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
                  {(finishedLog.volume || 0).toLocaleString()} lbs
                </span>
              </div>
              <div className="space-y-2">
                {(finishedLog.exercises || []).map((exercise) => {
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
        </div >
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
      {/* Voice Logging Modal */}
      {voiceLoggingExercise && (
        <VoiceLogModal
          open={!!voiceLoggingExercise}
          onOpenChange={(open) => !open && setVoiceLoggingExercise(null)}
          exerciseName={voiceLoggingExercise.exerciseName}
          unit={voiceLoggingExercise.unit}
          currentSet={exerciseStates[voiceLoggingExercise.id]?.currentSet || 1}
          totalSets={voiceLoggingExercise.sets}
          onComplete={(data) => {
            handleVoiceLogComplete(voiceLoggingExercise, data);
            setVoiceLoggingExercise(null);
          }}
        />
      )}

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
          <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-lg font-medium text-muted-foreground">
              <Timer className="h-5 w-5" />
              <span>{formatTime(elapsedTime)}</span>
            </div>
            {userProfile?.preferredMusicApp && userProfile.preferredMusicApp !== 'none' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  const musicUrls: Record<string, string> = {
                    'spotify': 'https://open.spotify.com',
                    'apple-music': 'https://music.apple.com',
                    'youtube-music': 'https://music.youtube.com',
                    'amazon-music': 'https://music.amazon.com',
                    'pandora': 'https://www.pandora.com',
                  };
                  const url = musicUrls[userProfile.preferredMusicApp!];
                  if (url) window.open(url, '_blank');
                }}
                title="Open Music App"
              >
                <Music2 className="h-5 w-5" />
              </Button>
            )}
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

        {/* Exercise Group Navigator */}
        <Accordion type="single" collapsible className="border rounded-lg">
          <AccordionItem value="groups" className="border-0">
            <AccordionTrigger className="px-4 py-2 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Jump to Exercise Group</span>
                <div className="flex gap-1">
                  {exerciseGroups.map((_, idx) => {
                    const status = getGroupStatus(idx);
                    return (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-green-500' :
                            status === 'in-progress' ? 'bg-yellow-500' :
                              'bg-muted-foreground/30'
                          }`}
                      />
                    );
                  })}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                {exerciseGroups.map((group, idx) => {
                  const status = getGroupStatus(idx);
                  const isCurrentGroup = idx === currentGroupIndex;
                  const exerciseNames = group.map(ex => ex.exerciseName).join(' + ');

                  return (
                    <button
                      key={idx}
                      onClick={() => handleJumpToGroup(idx)}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${isCurrentGroup
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-secondary/50 hover:bg-secondary'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            Group {idx + 1}
                          </span>
                          {group.length > 1 && (
                            <Badge variant="outline" className="text-xs">
                              Superset
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {exerciseNames}
                        </p>
                      </div>
                      <Badge
                        variant={status === 'completed' ? 'default' : 'secondary'}
                        className={`ml-2 text-xs ${status === 'completed' ? 'bg-green-500' :
                            status === 'in-progress' ? 'bg-yellow-500 text-yellow-900' :
                              ''
                          }`}
                      >
                        {status === 'completed' ? '✓ Done' :
                          status === 'in-progress' ? 'Active' :
                            'Pending'}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {currentGroup.map((exercise) => {
          const state = exerciseStates[exercise.id];
          if (!state) return <div key={exercise.id}>Loading exercise...</div>;

          const isEditing = editingExerciseId === exercise.id;
          const hasReachedTarget = state.currentSet > exercise.sets;
          const unit = exercise.unit || 'reps';

          const videoId = exercisePreferences?.find(p => p.id === exercise.exerciseId)?.videoId;

          return (
            <Card key={exercise.id} className={hasReachedTarget ? 'border-green-500/50 border-2' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{exercise.exerciseName}</CardTitle>
                    <CardDescription>
                      Set {state.currentSet} {hasReachedTarget ? `(Target: ${exercise.sets})` : `of ${exercise.sets}`} &bull; Goal: {exercise.reps} {unit === 'bodyweight' ? 'reps' : unit}
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
                ) : (
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
                    {unit === 'seconds' && (
                      <div className="space-y-2">
                        <Label htmlFor={`duration-${exercise.id}`} className="text-base">Duration (seconds)</Label>
                        <Input id={`duration-${exercise.id}`} type="number" placeholder="60" value={state.duration} onChange={e => setExerciseStates({ ...exerciseStates, [exercise.id]: { ...state, duration: e.target.value } })} className="h-14 text-2xl text-center" />
                      </div>
                    )}
                  </>
                )
                }

                {!isEditing && (
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

                {(
                  <div className="flex gap-2">
                    <Button className="flex-1 h-12 text-lg" onClick={() => handleLogSet(exercise)}>
                      Log Set <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                      onClick={() => setVoiceLoggingExercise(exercise)}
                      variant="secondary"
                      size="icon"
                      className="h-12 w-12 flex-shrink-0"
                      title="Voice Log"
                    >
                      <Mic className="h-5 w-5" />
                      <span className="sr-only">Voice Log</span>
                    </Button>
                    <Button onClick={() => handleLogSet(exercise, true)} variant="outline" size="icon" className="h-12 w-12 flex-shrink-0">
                      <SkipForward />
                      <span className="sr-only">Skip Set</span>
                    </Button>
                  </div>
                )}

                {state.logs.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-base font-medium">Logged Sets</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndoLastSet(exercise)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Undo2 className="h-4 w-4 mr-1" /> Undo Last
                      </Button>
                    </div>
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
                )}
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

      {restTimer && restTimeRemaining > 0 && (
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

      {/* Floating Quick Add Button */}
      {!isFinished && (
        <Button
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90"
          size="icon"
          onClick={() => setIsQuickAddOpen(true)}
          title="Add Exercise"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Quick Add Exercise Dialog */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Add Exercise
            </DialogTitle>
            <DialogDescription>
              Add an exercise on the fly. It will appear in your current workout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Exercise Selection */}
            <div className="space-y-2">
              <Label>Exercise</Label>
              <Combobox
                options={exerciseOptions}
                value={quickAddExerciseId || ''}
                onSelect={(value) => setQuickAddExerciseId(value || null)}
                placeholder="Search exercises..."
                searchPlaceholder="Type to search..."
              />
            </div>

            {/* Placement Option */}
            <div className="space-y-2">
              <Label>Add to</Label>
              <Select value={quickAddPlacement} onValueChange={(value: 'current' | 'standalone') => setQuickAddPlacement(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    <div className="flex flex-col items-start">
                      <span>Current Group</span>
                      <span className="text-xs text-muted-foreground">Superset with {currentGroup[0]?.exerciseName || 'current exercise'}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="standalone">
                    <div className="flex flex-col items-start">
                      <span>New Group (After Current)</span>
                      <span className="text-xs text-muted-foreground">Do it after finishing this group</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Number of Sets */}
            <div className="space-y-2">
              <Label>Number of Sets</Label>
              <Select value={quickAddSets} onValueChange={setQuickAddSets}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 set</SelectItem>
                  <SelectItem value="2">2 sets</SelectItem>
                  <SelectItem value="3">3 sets</SelectItem>
                  <SelectItem value="4">4 sets</SelectItem>
                  <SelectItem value="5">5 sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuickAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddExercise} disabled={!quickAddExerciseId}>
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
