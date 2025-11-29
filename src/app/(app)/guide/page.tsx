
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bot, Wand2, Loader2, Dumbbell, PlusCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isToday, parseISO, subDays } from 'date-fns';

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
import { generateWorkout, type GenerateWorkoutOutput } from '@/ai/flows/workout-guide-flow';
import { suggestWorkoutSetup } from '@/ai/flows/suggest-workout-flow';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, useDoc, addDoc } from '@/firebase';
import { collection, query, where, getDocs, doc, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserEquipment, Exercise, WorkoutLog, UserProfile, WorkoutExercise } from '@/lib/types';
import { format, isWithinInterval } from 'date-fns';


const PastWorkoutSchema = z.object({
  date: z.string().describe("The date of the workout."),
  name: z.string().describe("The name of the workout."),
  volume: z.number().describe("The total volume in lbs for the workout."),
  muscleGroups: z.array(z.string()).describe("A list of primary muscle groups hit in this workout."),
});

export const SuggestWorkoutSetupInputSchema = z.object({
  fitnessGoals: z.array(z.string()).describe("A list of the user's fitness goals."),
  workoutHistory: z.array(PastWorkoutSchema).describe("The user's workout history for the last 7 days."),
});
export type SuggestWorkoutSetupInput = z.infer<typeof SuggestWorkoutSetupInputSchema>;

export const SuggestWorkoutSetupOutputSchema = z.object({
  summary: z.string().describe("A short (2-3 sentences), encouraging summary of the user's recent performance and a recommendation for today's focus."),
  focusArea: z.array(z.string()).describe("The suggested primary muscle group(s) to focus on for the next workout."),
  supersetStrategy: z.enum(['focused', 'mixed']).describe("The suggested superset strategy."),
  workoutDuration: z.number().describe("The suggested workout duration in minutes."),
});
export type SuggestWorkoutSetupOutput = z.infer<typeof SuggestWorkoutSetupOutputSchema>;


const muscleGroupHierarchy: Record<string, string[]> = {
  "Full Body": ["Upper Body", "Lower Body", "Core"],
  "Upper Body": ["Chest", "Back", "Shoulders", "Arms"],
  "Lower Body": ["Quads", "Hamstrings", "Glutes", "Calves"],
  "Core": ["Abs", "Obliques"],
  "Arms": ["Biceps", "Triceps"],
};

const topLevelGroups = ["Full Body", "Upper Body", "Lower Body", "Core"];
const subGroups: Record<string, string[]> = {
    "Upper Body": ["Chest", "Back", "Shoulders", "Arms"],
    "Lower Body": ["Quads", "Hamstrings", "Glutes", "Calves"],
    "Core": ["Abs", "Obliques"],
    "Arms": ["Biceps", "Triceps"],
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
  const { toast } = useToast();
  const [generatedWorkout, setGeneratedWorkout] = useState<GenerateWorkoutOutput | null>(null);
  const [workoutSuggestion, setWorkoutSuggestion] = useState<SuggestWorkoutSetupOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(true);
  const [hasUsedAiToday, setHasUsedAiToday] = useState(false);

  const equipmentCollection = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/equipment`) : null
  , [firestore, user]);

  const { data: userEquipment, isLoading: isLoadingEquipment } = useCollection<UserEquipment>(equipmentCollection);

  const userProfileRef = useMemoFirebase(() =>
    user ? doc(firestore, `users/${user.uid}/profile/main`) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const allWorkoutLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc"));
  }, [firestore, user]);
  
  const { data: allWorkoutLogs } = useCollection<WorkoutLog>(allWorkoutLogsQuery);
  
  const masterExercisesQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'exercises') : null
  , [firestore]);
  const { data: masterExercises } = useCollection<Exercise>(masterExercisesQuery);
  
  const categoryToMuscleGroup: Record<string, string[]> = {
    'Chest': ['Chest'], 'Back': ['Back'], 'Shoulders': ['Shoulders'],
    'Legs': ['Legs'], 'Arms': ['Arms'], 'Biceps': ['Arms'],
    'Triceps': ['Arms'], 'Core': ['Core'],
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      availableEquipment: [],
      fitnessLevel: 'intermediate',
      workoutDuration: 40,
      focusArea: ["Full Body"],
      supersetStrategy: "focused",
    },
  });

  const dailySuggestionsCount = userProfile?.dailySuggestionsCount || 0;
  const suggestionLimitReached = dailySuggestionsCount >= 3;

  useEffect(() => {
    if (userProfile) {
      if (userProfile.lastAiWorkoutDate && isToday(parseISO(userProfile.lastAiWorkoutDate))) {
        setHasUsedAiToday(true);
        if (userProfile.todaysAiWorkout) {
          setGeneratedWorkout(userProfile.todaysAiWorkout as GenerateWorkoutOutput);
        }
        setIsLoadingSuggestion(false);
      } else {
        setHasUsedAiToday(false);
        setGeneratedWorkout(null);

        const fetchSuggestion = async () => {
          if (!allWorkoutLogs || !masterExercises || !userProfile || suggestionLimitReached) {
            setIsLoadingSuggestion(false);
            return;
          };
          setIsLoadingSuggestion(true);
          
          const sevenDaysAgo = subDays(new Date(), 7);
          const recentLogs = allWorkoutLogs.filter(log => isWithinInterval(parseISO(log.date), { start: sevenDaysAgo, end: new Date() }));
          
          const history = recentLogs.map(log => {
              const muscleGroups = new Set<string>();
              log.exercises.forEach(ex => {
                  const masterEx = masterExercises.find(me => me.id === ex.exerciseId);
                  if(masterEx?.category) {
                      const groups = categoryToMuscleGroup[masterEx.category] || [];
                      groups.forEach(g => muscleGroups.add(g));
                  }
              });
              return {
                  date: format(parseISO(log.date), 'PPP'),
                  name: log.workoutName,
                  volume: log.volume,
                  muscleGroups: Array.from(muscleGroups)
              }
          });

          const goals = [userProfile?.strengthGoal, userProfile?.muscleGoal, userProfile?.fatLossGoal].filter(Boolean) as string[];

          try {
            const suggestion = await suggestWorkoutSetup({
              fitnessGoals: goals.length > 0 ? goals : ["General Fitness"],
              workoutHistory: history,
            });
            setWorkoutSuggestion(suggestion);

            if(userProfileRef) {
                const currentCount = userProfile.dailySuggestionsCount || 0;
                setDocumentNonBlocking(userProfileRef, { dailySuggestionsCount: currentCount + 1 }, { merge: true });
            }

          } catch(error) {
              console.error("Failed to get workout suggestion:", error);
          } finally {
            setIsLoadingSuggestion(false);
          }
        };

        fetchSuggestion();
      }
    }
  }, [userProfile, allWorkoutLogs, masterExercises, suggestionLimitReached, userProfileRef]);
  
    useEffect(() => {
    if (userEquipment && userEquipment.length > 0 && form.getValues('availableEquipment').length === 0) {
      const defaultEquipment = userEquipment.map(e => e.name);
      form.setValue('availableEquipment', defaultEquipment);
    }
  }, [userEquipment, form]);

  const handleFocusAreaChange = (group: string, checked: boolean) => {
    const currentValues = form.getValues('focusArea');
    let newValues = [...currentValues];

    const getChildren = (parent: string): string[] => {
        let children: string[] = [];
        const directChildren = (muscleGroupHierarchy)[parent];
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

  const applySuggestion = () => {
      if (!workoutSuggestion) return;
      
      const newFocusArea: string[] = [];
      const suggestedAreas = workoutSuggestion.focusArea.map(area => area === 'Legs' ? 'Lower Body' : area);
      
      suggestedAreas.forEach(area => {
        newFocusArea.push(area);
        const children = muscleGroupHierarchy[area as keyof typeof muscleGroupHierarchy];
        if (children) {
          newFocusArea.push(...children);
        }
      });
      
      form.setValue('focusArea', [...new Set(newFocusArea)]);
      form.setValue('supersetStrategy', workoutSuggestion.supersetStrategy);
      form.setValue('workoutDuration', workoutSuggestion.workoutDuration);
      toast({
          title: "Suggestions Applied!",
          description: "Workout preferences have been updated."
      })
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedWorkout(null);

    const history = allWorkoutLogs?.map(log => ({
      date: format(parseISO(log.date), 'PPP'),
      name: log.workoutName,
      exercises: log.exercises.map(ex => ex.exerciseName).join(', ')
    }));
    
    const goals = [userProfile?.strengthGoal, userProfile?.muscleGoal, userProfile?.fatLossGoal].filter(Boolean) as string[];

    try {
      const result = await generateWorkout({
        ...values,
        fitnessGoals: goals.length > 0 ? goals : ["General Fitness"], 
        workoutHistory: history,
      });
      setGeneratedWorkout(result);
      if (userProfileRef) {
        setDocumentNonBlocking(userProfileRef, { 
            lastAiWorkoutDate: new Date().toISOString(),
            todaysAiWorkout: result 
        }, { merge: true });
      }
      setHasUsedAiToday(true);
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
            const newExercise: Omit<Exercise, 'id' > = {
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
      };

      const workoutsCollection = collection(firestore, `users/${user.uid}/customWorkouts`);
      const newDocRef = await addDoc(workoutsCollection, workoutData);

      toast({
        title: "Workout Saved!",
        description: `"${generatedWorkout.workoutName}" has been added. Now navigating to edit.`,
      });
      
      if (newDocRef) {
        router.push(`/workouts?edit=${newDocRef.id}`);
      } else {
        router.push('/workouts');
      }

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

  const displayWorkout = hasUsedAiToday && generatedWorkout;
  const showSuggestion = !hasUsedAiToday && workoutSuggestion && !suggestionLimitReached;

  const renderCheckboxes = (groupNames: string[], isSubGroup = false) => (
    <div className={isSubGroup ? "space-y-3 pl-6" : "space-y-3"}>
      {groupNames.map(group => {
        const subGroupItems = (subGroups)[group];
        const currentFocusArea = form.watch('focusArea');
        const isParentChecked = currentFocusArea?.includes(group);

        return (
          <div key={group} className="space-y-2">
            <FormField
              control={form.control}
              name="focusArea"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value?.includes(group)}
                      onCheckedChange={(checked) => {
                        handleFocusAreaChange(group, !!checked);
                      }}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">{group}</FormLabel>
                </FormItem>
              )}
            />
            {subGroupItems && isParentChecked && renderCheckboxes(subGroupItems, true)}
          </div>
        );
      })}
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
      
      {isLoadingSuggestion && !hasUsedAiToday && !suggestionLimitReached &&(
        <Card className="lg:col-span-3">
          <CardContent className="p-6 flex items-center justify-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground">fRepo Coach is analyzing your progress...</p>
          </CardContent>
        </Card>
      )}

      {showSuggestion && (
        <Card className="lg:col-span-3 border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-primary" />
                    <CardTitle>Coach's Corner</CardTitle>
                </div>
                <div className="text-xs text-muted-foreground">
                    {3-dailySuggestionsCount} suggestions left today
                </div>
            </div>
            <CardDescription>{workoutSuggestion.summary}</CardDescription>
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
            <Button onClick={applySuggestion} className="w-full sm:w-auto">Apply Suggestions</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!displayWorkout && !isLoading && (
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>Workout Preferences</CardTitle>
                    <CardDescription>Tell us what you're working with.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    <FormField
                      control={form.control}
                      name="availableEquipment"
                      render={() => (
                          <FormItem>
                          <div className="mb-4">
                              <FormLabel className="text-base">Available Equipment</FormLabel>
                              <FormDescription>
                              Select the equipment you have access to.
                              </FormDescription>
                          </div>
                          <div className="space-y-2">
                          {isLoadingEquipment ? <p>Loading equipment...</p> : userEquipment?.map((item) => (
                              <FormField
                              key={item.id}
                              control={form.control}
                              name="availableEquipment"
                              render={({ field }) => {
                                  return (
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
                                  )
                              }}
                              />
                          ))}
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
                          {renderCheckboxes(topLevelGroups)}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="supersetStrategy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Superset Strategy</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
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
                    
                    <Button type="submit" className="w-full" disabled={isLoading || hasUsedAiToday}>
                      {isLoading ? (
                          <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                          </>
                      ) : hasUsedAiToday ? (
                          'Daily Limit Reached'
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
                                <CardTitle className="text-2xl">{generatedWorkout.workoutName}</CardTitle>
                                <CardDescription>{generatedWorkout.description}</CardDescription>
                            </div>
                            <div className="text-xs font-bold uppercase text-primary bg-primary/10 px-2 py-1 rounded-md">
                                Today's AI Workout
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

