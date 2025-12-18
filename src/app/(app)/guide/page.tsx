
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bot, Wand2, Loader2, Dumbbell, PlusCircle, Sparkles, MapPin } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isToday, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { generateWorkout, type GenerateWorkoutOutput } from '@/ai/flows/workout-guide-flow';
import { suggestWorkoutSetup } from '@/ai/flows/suggest-workout-flow';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, useDoc, addDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, doc, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { MuscleHeatmap } from '@/components/muscle-heatmap';
import { categoryToMuscleGroup } from '@/lib/muscle-mapping';
import type { UserEquipment, Exercise, WorkoutLog, UserProfile, WorkoutExercise, WorkoutLocation } from '@/lib/types';
import { format, subDays, startOfWeek, parseISO as parseISODateFns } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type SuggestWorkoutSetupInput = {
  fitnessGoals: string[];
  workoutHistory: {
    date: string;
    name: string;
    volume: number;
    muscleGroups: string[];
    activityType?: 'resistance' | 'calisthenics' | 'run' | 'walk' | 'cycle' | 'hiit';
    duration?: string;
  }[];
  weeklyWorkoutGoal: number;
  workoutsThisWeek: number;
};

export type SuggestWorkoutSetupOutput = {
  summary: string;
  focusArea: string[];
  supersetStrategy: 'focused' | 'mixed';
  workoutDuration: number;
  intensityLevel?: 'standard' | 'high' | 'brutal';
  cardioRecommendation?: string;
  coachingTip?: string;
};


const formSchema = z.object({
  availableEquipment: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one piece of equipment.",
  }),
  fitnessLevel: z.string().min(1, { message: 'Please select a fitness level.' }),
  workoutDuration: z.coerce.number().min(10, { message: 'Duration must be at least 10 minutes.' }),
  focusArea: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one muscle group.",
  }),
  supersetStrategy: z.string().min(1, { message: "Please select a superset strategy." }),
  workoutType: z.enum(['resistance', 'calisthenics']).optional(),
  allowSupersets: z.boolean().optional(),
});

const generateUniqueId = () => `_${Math.random().toString(36).substr(2, 9)}`;

// Helper to group AI-generated exercises by supersetId for display
const groupAiExercises = (exercises: GenerateWorkoutOutput['exercises'] = []) => {
  if (!exercises) return [];
  const grouped = exercises.reduce((acc, ex) => {
    (acc[ex.supersetId] = acc[ex.supersetId] || []).push(ex);
    return acc;
  }, {} as Record<string, GenerateWorkoutOutput['exercises']>);

  return Object.values(grouped);
};


export default function GuidePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstWorkout = searchParams.get('firstWorkout') === 'true';
  const { toast } = useToast();
  const [generatedWorkout, setGeneratedWorkout] = useState<GenerateWorkoutOutput | null>(null);
  const [workoutSuggestion, setWorkoutSuggestion] = useState<SuggestWorkoutSetupOutput | null>(null);
  const [currentIntensity, setCurrentIntensity] = useState<'standard' | 'high' | 'brutal'>('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Separate loading state for initial data fetch vs AI generation
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  const equipmentCollection = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/equipment`) : null
    , [firestore, user]);

  const { data: userEquipment, isLoading: isLoadingEquipment } = useCollection<UserEquipment>(equipmentCollection);

  // Locations collection
  const locationsCollection = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/locations`) : null
    , [firestore, user]);
  const { data: locations, isLoading: isLoadingLocations } = useCollection<WorkoutLocation>(locationsCollection);

  // Selected location state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);

  const openConfirmation = (values: z.infer<typeof formSchema>) => {
    setPendingValues(values);
    setShowConfirmation(true);
  };

  const handleConfirmGenerate = () => {
    if (pendingValues) {
      setShowConfirmation(false);
      onSubmit(pendingValues);
    }
  };

  const userProfileRef = useMemoFirebase(() =>
    user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [firestore, user]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const allWorkoutLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), where("date", ">=", sevenDaysAgo), orderBy("date", "desc"));
  }, [firestore, user]);

  const { data: recentLogs, isLoading: isLoadingLogs } = useCollection<WorkoutLog>(allWorkoutLogsQuery);

  const masterExercisesQuery = useMemoFirebase(() =>
    firestore ? collection(firestore, 'exercises') : null
    , [firestore]);
  const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<Exercise>(masterExercisesQuery);

  const categoryToMuscleGroup: Record<string, string[]> = {
    'Chest': ['Chest'], 'Back': ['Back'], 'Shoulders': ['Shoulders'],
    'Legs': ['Lower Body'], 'Arms': ['Arms'], 'Biceps': ['Arms'],
    'Triceps': ['Arms'], 'Core': ['Core'],
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      availableEquipment: [],
      fitnessLevel: 'intermediate',
      workoutDuration: 40,
      focusArea: [],
      supersetStrategy: "focused",
      workoutType: 'resistance',
      allowSupersets: true,
    },
  });

  const muscleGroupHierarchy: Record<string, string[]> = {
    "Full Body": ["Upper Body", "Lower Body", "Core"],
    "Upper Body": ["Chest", "Back", "Shoulders", "Arms"],
    "Lower Body": ["Legs", "Glutes", "Calves"],
    "Core": ["Abs", "Obliques"],
    "Arms": ["Biceps", "Triceps"],
  };

  const topLevelGroups = ["Full Body", "Upper Body", "Lower Body", "Core"];

  // Helper function to calculate workouts completed this week (Monday to today)
  const getWorkoutsThisWeek = (logs: WorkoutLog[] | null): number => {
    if (!logs) return 0;
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 }); // Start week on Monday
    return logs.filter(log => {
      const logDate = parseISODateFns(log.date);
      return logDate >= monday && logDate <= now;
    }).length;
  };

  // UI Display Groups
  const workoutTypes = ["Full Body", "Upper Body", "Lower Body", "Core"];
  const muscleGroups = ["Chest", "Back", "Shoulders", "Arms", "Legs"];
  const specificMuscles = ["Biceps", "Triceps", "Glutes", "Calves", "Abs", "Obliques"];


  useEffect(() => {
    // This effect's sole job is to decide whether to fetch a new suggestion or use an existing one.
    const runSuggestionLogic = async () => {
      // Step 1: Wait until all necessary data is loaded.
      if (isLoadingProfile || isLoadingLogs || isLoadingExercises || !user || !userProfile?.id) {
        return;
      }

      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const hasTodaysSuggestion = userProfile?.lastAiSuggestionDate === todayStr && userProfile.todaysSuggestion;

      if (hasTodaysSuggestion) {
        // A valid suggestion for today already exists. Display it.
        setIsGeneratingSuggestion(false);
        setWorkoutSuggestion(userProfile.todaysSuggestion as SuggestWorkoutSetupOutput);
        // Check if there's also a workout generated for today
        if (userProfile.lastAiWorkoutDate === todayStr && userProfile.todaysAiWorkout) {
          setGeneratedWorkout(userProfile.todaysAiWorkout as GenerateWorkoutOutput);
        }
      } else {
        // Short-circuit for new users with no history to prevent errors/delays
        if (!recentLogs || recentLogs.length === 0) {
          const defaultSuggestion: SuggestWorkoutSetupOutput = {
            summary: "Welcome to your first session! We've designed a balanced Full Body routine to help you learn the movements and establish a baseline.",
            focusArea: ["Full Body"],
            supersetStrategy: "mixed",
            workoutDuration: 40
          };

          if (userProfileRef) {
            // Save it so it persists for the day
            await setDocumentNonBlocking(userProfileRef, {
              todaysSuggestion: defaultSuggestion,
              lastAiSuggestionDate: format(new Date(), 'yyyy-MM-dd'),
            }, { merge: true });
          }
          setWorkoutSuggestion(defaultSuggestion);
          setIsGeneratingSuggestion(false);
          return;
        }

        setIsGeneratingSuggestion(true);
        // No suggestion for today. Generate one.
        const history: SuggestWorkoutSetupInput['workoutHistory'] = (recentLogs || []).map(log => {
          const muscleGroups = new Set<string>();

          // For resistance/calisthenics, get muscle groups from exercises
          if (log.exercises && log.exercises.length > 0) {
            log.exercises.forEach(ex => {
              const masterEx = masterExercises?.find(me => me.id === ex.exerciseId);
              if (masterEx?.category) {
                const groups = categoryToMuscleGroup[masterEx.category] || [];
                groups.forEach(g => muscleGroups.add(g));
              }
            });
          }

          // For cardio, use the activity type to infer muscle groups
          const activityType = log.activityType || 'resistance';
          if (['run', 'walk', 'cycle', 'hiit'].includes(activityType)) {
            const cardioMuscles = categoryToMuscleGroup[activityType.charAt(0).toUpperCase() + activityType.slice(1)] || [];
            cardioMuscles.forEach(g => muscleGroups.add(g));
          }

          return {
            date: format(parseISO(log.date), 'PPP'),
            name: log.workoutName,
            volume: log.volume || 0,
            muscleGroups: Array.from(muscleGroups),
            activityType: activityType as SuggestWorkoutSetupInput['workoutHistory'][0]['activityType'],
            duration: log.duration,
          };
        });

        const goals = [userProfile?.strengthGoal, userProfile?.muscleGoal, userProfile?.fatLossGoal].filter(Boolean) as string[];

        try {
          const suggestion = await suggestWorkoutSetup({
            fitnessGoals: goals.length > 0 ? goals : ["General Fitness"],
            workoutHistory: history,
            weeklyWorkoutGoal: userProfile?.weeklyWorkoutGoal || 3,
            workoutsThisWeek: getWorkoutsThisWeek(recentLogs),
          });

          if (userProfileRef) {
            await setDocumentNonBlocking(userProfileRef, {
              todaysSuggestion: suggestion,
              lastAiSuggestionDate: format(new Date(), 'yyyy-MM-dd'),
              // Do NOT clear todaysAiWorkout here, as they are independent
            }, { merge: true });
          }

          setWorkoutSuggestion(suggestion);
        } catch (error) {
          console.error("Failed to get workout suggestion:", error);
          toast({ variant: 'destructive', title: "Suggestion Failed", description: "Could not generate a suggestion at this time." });
        } finally {
          setIsGeneratingSuggestion(false);
        }
      }
    };

    runSuggestionLogic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, isLoadingProfile, isLoadingLogs, isLoadingExercises]);

  // Set selected location from profile or default
  useEffect(() => {
    if (!isLoadingLocations && locations && locations.length > 0 && !selectedLocationId) {
      // Try to use the active location from profile, or fall back to default
      const activeLocation = userProfile?.activeLocationId
        ? locations.find(l => l.id === userProfile.activeLocationId)
        : locations.find(l => l.isDefault);

      if (activeLocation) {
        setSelectedLocationId(activeLocation.id);
      } else {
        setSelectedLocationId(locations[0].id);
      }
    }
  }, [locations, isLoadingLocations, userProfile?.activeLocationId, selectedLocationId]);

  // Get the currently selected location
  const selectedLocation = useMemo(() => {
    if (!locations || !selectedLocationId) return null;
    return locations.find(l => l.id === selectedLocationId) || null;
  }, [locations, selectedLocationId]);

  // Load equipment from selected location into form
  useEffect(() => {
    if (selectedLocation && selectedLocation.equipment.length > 0) {
      form.setValue('availableEquipment', selectedLocation.equipment);
    } else if (userEquipment && userEquipment.length > 0 && form.getValues('availableEquipment').length === 0) {
      // Fallback to old equipment collection if no locations exist
      const defaultEquipment = userEquipment.map(e => e.name);
      form.setValue('availableEquipment', defaultEquipment);
    }
  }, [selectedLocation, userEquipment, form]);

  // Handle location change
  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    const newLocation = locations?.find(l => l.id === locationId);
    if (newLocation) {
      form.setValue('availableEquipment', newLocation.equipment);
    }
  };

  // Migration: Create "Home" location from existing equipment for users without locations
  useEffect(() => {
    const migrateEquipment = async () => {
      // Wait for all data to load
      if (isLoadingLocations || isLoadingEquipment || !user || !locationsCollection) return;

      // Only migrate if user has no locations but has old equipment
      if (locations && locations.length > 0) return;
      if (!userEquipment || userEquipment.length === 0) return;

      console.log('Guide: Migrating equipment to Home location...');

      const homeLocation: Omit<WorkoutLocation, 'id'> = {
        userId: user.uid,
        name: "Home",
        equipment: userEquipment.map(e => e.name),
        icon: "🏠",
        type: 'home',
        isDefault: true,
        createdAt: new Date().toISOString(),
      };

      try {
        const newLocationDoc = await addDocumentNonBlocking(locationsCollection, homeLocation);

        // Update profile with active location
        if (userProfileRef && newLocationDoc) {
          await setDocumentNonBlocking(userProfileRef, {
            activeLocationId: newLocationDoc.id,
          }, { merge: true });
        }

        console.log('Guide: Equipment migration complete!');
      } catch (error) {
        console.error('Guide: Error migrating equipment:', error);
      }
    };

    migrateEquipment();
  }, [user, locations, userEquipment, isLoadingLocations, isLoadingEquipment, locationsCollection, userProfileRef]);

  const handleFocusAreaChange = (group: string, checked: boolean) => {
    const currentValues = form.getValues('focusArea');
    let newValues = [...currentValues];

    const getChildren = (parent: string): string[] => {
      let children: string[] = [];
      const directChildren = (muscleGroupHierarchy)[parent as keyof typeof muscleGroupHierarchy];
      if (directChildren) {
        children.push(...directChildren);
        directChildren.forEach((child: string) => {
          children.push(...getChildren(child));
        });
      }
      return children;
    };

    const allChildren = getChildren(group);

    if (checked) {
      newValues.push(group, ...allChildren);
    } else {
      newValues = newValues.filter(val => val !== group && !allChildren.includes(val));
    }

    form.setValue('focusArea', [...new Set(newValues)]);
  };

  const applySuggestion = (suggestion: SuggestWorkoutSetupOutput | null) => {
    if (!suggestion) return;

    const newFocusArea: string[] = [];
    const suggestedAreas = suggestion.focusArea.map(area => area === 'Legs' ? 'Lower Body' : area);

    suggestedAreas.forEach(area => {
      if (topLevelGroups.includes(area)) {
        newFocusArea.push(area);
        const getChildrenAndGrandchildren = (parent: string): string[] => {
          let allChildren: string[] = [];
          const directChildren = muscleGroupHierarchy[parent as keyof typeof muscleGroupHierarchy];
          if (directChildren) {
            allChildren.push(...directChildren);
            directChildren.forEach(child => {
              allChildren.push(...getChildrenAndGrandchildren(child));
            });
          }
          return allChildren;
        };
        newFocusArea.push(...getChildrenAndGrandchildren(area));
      }
    });

    form.setValue('focusArea', [...new Set(newFocusArea)]);
    form.setValue('supersetStrategy', suggestion.supersetStrategy);
    form.setValue('workoutDuration', suggestion.workoutDuration);

    // Set the intensity level from the suggestion
    if (suggestion.intensityLevel) {
      setCurrentIntensity(suggestion.intensityLevel);
    }

    toast({
      title: "Suggestions Applied!",
      description: `Workout preferences updated. Intensity: ${suggestion.intensityLevel?.toUpperCase() || 'STANDARD'}`
    })
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedWorkout(null);

    const history = recentLogs?.map(log => ({
      date: format(parseISO(log.date), 'PPP'),
      name: log.workoutName,
      exercises: (log.exercises || []).map(ex => ex.exerciseName).join(', ')
    }));

    const goals = [userProfile?.strengthGoal, userProfile?.muscleGoal, userProfile?.fatLossGoal].filter(Boolean) as string[];

    try {
      const result = await generateWorkout({
        ...values,
        fitnessGoals: goals.length > 0 ? goals : ["General Fitness"],
        workoutHistory: history,
        intensityLevel: currentIntensity,
      });
      setGeneratedWorkout(result);
      if (userProfileRef) {
        setDocumentNonBlocking(userProfileRef, {
          todaysAiWorkout: result,
          lastAiWorkoutDate: format(new Date(), 'yyyy-MM-dd')
        }, { merge: true });
      }
    } catch (error) {
      console.error('Failed to generate workout:', error);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: "Failed to generate workout. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveWorkout = async () => {
    if (!generatedWorkout || !user || !firestore) return;
    setIsSaving(true);

    try {
      const masterExercisesRef = collection(firestore, 'exercises');

      const processedExercises: WorkoutExercise[] = await Promise.all(
        generatedWorkout.exercises.map(async (ex) => {
          const q = query(masterExercisesRef, where("name", "==", ex.name));
          const querySnapshot = await getDocs(q);

          let masterExerciseId: string;

          if (querySnapshot.empty) {
            const newExerciseDocRef = doc(masterExercisesRef); // Auto-generate ID
            const newExercise: Omit<Exercise, 'id'> = {
              name: ex.name,
              category: ex.category,
            };
            await setDocumentNonBlocking(newExerciseDocRef, newExercise, { merge: false });
            masterExerciseId = newExerciseDocRef.id;
          } else {
            masterExerciseId = querySnapshot.docs[0].id;
          }

          let unit: WorkoutExercise['unit'] = 'reps';
          if (ex.rest.includes('sec')) unit = 'seconds';
          if (ex.name.toLowerCase().includes('plank') || ex.name.toLowerCase().includes('hold')) unit = 'seconds';
          if (ex.name.toLowerCase().includes('push-up') || ex.name.toLowerCase().includes('pull-up') || ex.name.toLowerCase().includes('dip')) unit = 'bodyweight';

          return {
            id: generateUniqueId(),
            exerciseId: masterExerciseId,
            exerciseName: ex.name,
            sets: parseInt(ex.sets.split('-')[0]),
            reps: ex.reps,
            unit: unit,
            supersetId: ex.supersetId,
          };
        })
      );

      const workoutData = {
        userId: user.uid,
        name: generatedWorkout.workoutName,
        description: generatedWorkout.description,
        exercises: processedExercises,
        createdAt: new Date().toISOString(),
        locationId: selectedLocation?.id || undefined,
        locationName: selectedLocation?.name || undefined,
      };

      const workoutsCollection = collection(firestore, `users/${user.uid}/customWorkouts`);
      const newDocRef = await addDoc(workoutsCollection, workoutData);

      toast({
        title: "Workout Saved!",
        description: `"${generatedWorkout.workoutName}" has been added to your workouts.`,
      });

      // Navigate to workouts list (not edit mode to avoid double-save confusion)
      router.push('/workouts');

    } catch (error) {
      console.error("Failed to save workout:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "There was a problem saving your workout. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const groupedAiExercises = useMemo(() => {
    if (!generatedWorkout) return [];
    return groupAiExercises(generatedWorkout.exercises);
  }, [generatedWorkout]);

  const hasTodaysWorkout = userProfile?.lastAiWorkoutDate === format(new Date(), 'yyyy-MM-dd') && !!userProfile.todaysAiWorkout;
  const displayWorkout = !!generatedWorkout || hasTodaysWorkout;

  const renderCheckboxGroup = (items: string[]) => (
    <div className="grid grid-cols-2 gap-4">
      {items.map(group => (
        <FormField
          key={group}
          control={form.control}
          name="focusArea"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value?.includes(group)}
                  onCheckedChange={(checked) => {
                    handleFocusAreaChange(group, !!checked);
                  }}
                />
              </FormControl>
              <FormLabel className="font-normal cursor-pointer text-sm">
                {group}
              </FormLabel>
            </FormItem>
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Bot className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Workout Generator</h1>
          <p className="text-muted-foreground">
            Your daily workout, crafted by AI.
          </p>
        </div>
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Equipment</DialogTitle>
            <DialogDescription>
              We'll build your workout using only these items. Is this correct?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg max-h-[200px] overflow-y-auto">
              <h4 className="font-semibold mb-2 text-sm text-primary">Selected Equipment:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {pendingValues?.availableEquipment.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">One workout per day</p>
                <p className="text-xs text-muted-foreground">This will be your AI-generated workout for today. You can still create manual workouts anytime.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>Cancel</Button>
            <Button onClick={handleConfirmGenerate}>Confirm & Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {/* First Workout Welcome Banner */}
        {isFirstWorkout && (
          <Card className="border-2 border-green-500/50 bg-gradient-to-r from-green-500/10 to-primary/10">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="text-5xl">🎉</div>
              <div>
                <h2 className="text-xl font-bold mb-1">Welcome to fRepo!</h2>
                <p className="text-muted-foreground">
                  Let's create your first personalized workout. Our AI coach will generate a routine based on your goals and equipment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoadingProfile && (
          <Card className="lg:col-span-3">
            <CardContent className="p-6 flex items-center justify-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your profile...</p>
            </CardContent>
          </Card>
        )}

        {isGeneratingSuggestion && (
          <Card className="lg:col-span-3">
            <CardContent className="p-6 flex items-center justify-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Coach is analyzing your progress...</p>
            </CardContent>
          </Card>
        )}

        {!isLoadingProfile && !isGeneratingSuggestion && workoutSuggestion && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <CardTitle>Coach's Daily Suggestion</CardTitle>
                {workoutSuggestion.intensityLevel && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${workoutSuggestion.intensityLevel === 'brutal'
                    ? 'bg-red-500/20 text-red-500'
                    : workoutSuggestion.intensityLevel === 'high'
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'bg-green-500/20 text-green-500'
                    }`}>
                    {workoutSuggestion.intensityLevel === 'brutal' ? '🔥 BRUTAL'
                      : workoutSuggestion.intensityLevel === 'high' ? '💪 HIGH'
                        : '✓ STANDARD'}
                  </span>
                )}
              </div>
              <CardDescription>{workoutSuggestion.summary}</CardDescription>
              {workoutSuggestion.coachingTip && (
                <p className="text-sm italic text-primary/80 mt-2 border-l-2 border-primary/30 pl-3">
                  💡 {workoutSuggestion.coachingTip}
                </p>
              )}
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg bg-background p-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Focus</p>
                  <p className="font-medium">{workoutSuggestion.focusArea.join(', ')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{workoutSuggestion.workoutDuration} min</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Strategy</p>
                  <p className="font-medium capitalize">{workoutSuggestion.supersetStrategy}</p>
                </div>
              </div>
              {!displayWorkout && <Button onClick={() => applySuggestion(workoutSuggestion)} className="w-full sm:w-auto">Apply Suggestion</Button>}
            </CardContent>
          </Card>
        )}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!displayWorkout && (
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Workout Preferences</CardTitle>
              <CardDescription>Tell us what you're working with.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  {/* Location Selector */}
                  {locations && locations.length > 0 && (
                    <div className="space-y-2 pb-4 border-b">
                      <label className="text-base font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Workout Location
                      </label>
                      <Select value={selectedLocationId || ''} onValueChange={handleLocationChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              <span className="flex items-center gap-2">
                                <span>{location.icon || '📍'}</span>
                                <span>{location.name}</span>
                                {location.isDefault && <span className="text-xs text-muted-foreground">(Default)</span>}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Equipment from this location will be used.
                      </p>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="availableEquipment"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Available Equipment</FormLabel>
                          <FormDescription>
                            {selectedLocation
                              ? `Equipment from ${selectedLocation.name}`
                              : 'Select the equipment you have access to.'
                            }
                          </FormDescription>
                        </div>
                        <div className="space-y-2">
                          {isLoadingLocations || isLoadingEquipment ? (
                            <p>Loading equipment...</p>
                          ) : selectedLocation ? (
                            // Render equipment from selected location
                            selectedLocation.equipment.map((equipmentName) => (
                              <FormField
                                key={equipmentName}
                                control={form.control}
                                name="availableEquipment"
                                render={({ field }) => (
                                  <FormItem
                                    key={equipmentName}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(equipmentName)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), equipmentName])
                                            : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== equipmentName
                                              )
                                            )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {equipmentName}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))
                          ) : userEquipment?.map((item) => (
                            // Fallback to old equipment if no locations
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="availableEquipment"
                              render={({ field }) => (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.name)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item.name])
                                          : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.name
                                            )
                                          )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {item.name}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                          {!isLoadingLocations && !isLoadingEquipment && !selectedLocation && (!userEquipment || userEquipment.length === 0) && (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                              No equipment found. Add a workout location in Settings.
                            </p>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="focusArea"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Muscle Group Focus</FormLabel>
                          <FormDescription>
                            Select the main muscle groups to target.
                          </FormDescription>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <h3 className="text-sm font-medium mb-3 text-primary">Workout Types</h3>
                            {renderCheckboxGroup(workoutTypes)}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-3 text-primary">Group Focused</h3>
                            {renderCheckboxGroup(muscleGroups)}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium mb-3 text-primary">Muscle Focused</h3>
                            {renderCheckboxGroup(specificMuscles)}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Workout Type Selector */}
                  <FormField
                    control={form.control}
                    name="workoutType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">Workout Type</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => field.onChange('resistance')}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${field.value === 'resistance' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                            >
                              <div className="text-2xl mb-1">🏋️</div>
                              <div className="font-medium">Resistance</div>
                              <div className="text-xs text-muted-foreground">Weights + machines</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange('calisthenics')}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${field.value === 'calisthenics' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                            >
                              <div className="text-2xl mb-1">🤸</div>
                              <div className="font-medium">Calisthenics</div>
                              <div className="text-xs text-muted-foreground">Bodyweight only</div>
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Allow Supersets Toggle */}
                  <FormField
                    control={form.control}
                    name="allowSupersets"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow Supersets</FormLabel>
                          <FormDescription>
                            Group exercises into supersets and tri-sets
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('allowSupersets') && (
                    <FormField
                      control={form.control}
                      name="supersetStrategy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Superset Strategy</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a strategy" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="focused">Focused (Same Muscle Group)</SelectItem>
                              <SelectItem value="mixed">Mixed (Across Muscle Groups)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose how to pair exercises in supersets.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fitnessLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fitness Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workoutDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (min)</FormLabel>
                          <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="40">40</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="60">60</SelectItem>
                              <SelectItem value="70">70</SelectItem>
                              <SelectItem value="80">80</SelectItem>
                              <SelectItem value="90">90</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="button" onClick={form.handleSubmit(openConfirmation)} className="w-full" disabled={isLoading || !!displayWorkout}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : displayWorkout ? (
                      'Workout Already Generated for Today'
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate Workout
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <div className={displayWorkout ? "lg:col-span-3" : "lg:col-span-2"}>
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 border-2 border-dashed rounded-lg">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <h2 className="text-xl font-semibold">Crafting your workout...</h2>
              <p className="text-muted-foreground text-center">The AI is warming up and building your personalized plan.</p>
            </div>
          )}

          {!isLoading && !displayWorkout && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 border-2 border-dashed rounded-lg">
              <Dumbbell className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Your Workout Plan Awaits</h2>
              <p className="text-muted-foreground text-center">Fill out your preferences and the AI will generate a plan here.</p>
            </div>
          )}

          {displayWorkout && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{generatedWorkout?.workoutName}</CardTitle>
                    <CardDescription>{generatedWorkout?.description}</CardDescription>
                  </div>
                  <div className="text-xs font-bold uppercase text-primary bg-primary/10 px-2 py-1 rounded-md">
                    Today's AI Workout
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Muscle Heatmap Preview */}
                {generatedWorkout && (() => {
                  // Calculate muscle intensities from AI-generated exercises
                  const muscleEffort: Record<string, number> = {};
                  generatedWorkout.exercises.forEach(ex => {
                    console.log('[HEATMAP DEBUG] Exercise:', ex.name, 'Category:', ex.category, 'Type:', typeof ex.category);
                    const muscles = categoryToMuscleGroup[ex.category] || [];
                    console.log('[HEATMAP DEBUG] Mapped muscles:', muscles);

                    if (muscles.length > 0) {
                      muscles.forEach(muscle => {
                        muscleEffort[muscle] = (muscleEffort[muscle] || 0) + 1;
                      });
                    } else {
                      // Fallback: use lowercase category name as muscle group
                      const fallbackMuscle = ex.category?.toLowerCase() || 'unknown';
                      muscleEffort[fallbackMuscle] = (muscleEffort[fallbackMuscle] || 0) + 1;
                    }
                  });

                  // Normalize to 0-1 scale for musclesWorked
                  const maxEffort = Math.max(...Object.values(muscleEffort), 1);
                  const musclesWorked: Record<string, number> = {};
                  for (const [muscle, effort] of Object.entries(muscleEffort)) {
                    musclesWorked[muscle] = effort / maxEffort;
                  }

                  // Create mock workout log with musclesWorked (same as cardio uses)
                  console.log('[HEATMAP DEBUG] Final muscleEffort:', muscleEffort);
                  console.log('[HEATMAP DEBUG] Final musclesWorked:', musclesWorked);

                  const mockWorkoutLog: WorkoutLog = {
                    id: 'preview',
                    userId: '',
                    workoutName: generatedWorkout.workoutName,
                    date: new Date().toISOString(),
                    duration: '30 min', // Used to scale effort in heatmap
                    exercises: [],
                    musclesWorked: musclesWorked,
                  };

                  return (
                    <div className="p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-secondary/50">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        🎯 Muscles Targeted
                      </h4>
                      <div className="flex justify-center">
                        <div className="w-full max-w-[280px]">
                          <MuscleHeatmap
                            userProfile={userProfile}
                            thisWeeksLogs={[mockWorkoutLog]}
                            isLoading={false}
                            dateRangeLabel=""
                            isCard={false}
                            isSingleWorkout={true}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3 justify-center">
                        {Object.entries(muscleEffort)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 6)
                          .map(([muscle, count]) => (
                            <span
                              key={muscle}
                              className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
                            >
                              {muscle.replace('_', ' ')}
                            </span>
                          ))}
                      </div>
                    </div>
                  );
                })()}
                {groupedAiExercises.map((group, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-secondary/50 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {group.length > 1 ? `Superset ${index + 1}` : `Group ${index + 1}`}
                    </p>
                    {group.map((ex, exIndex) => (
                      <div key={exIndex} className="p-3 bg-background rounded-md">
                        <h4 className="font-semibold text-lg text-primary">{ex.name}</h4>
                        <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Sets</p>
                            <p className="font-medium">{ex.sets}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reps</p>
                            <p className="font-medium">{ex.reps}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Rest</p>
                            <p className="font-medium">{ex.rest}s</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleSaveWorkout} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Save and Edit Workout
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
