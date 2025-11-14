
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bot, Wand2, Loader2, Dumbbell, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, doc, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserEquipment, Exercise, WorkoutLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const focusAreas = ["Full Body", "Upper Body", "Lower Body", "Arms", "Back", "Biceps", "Chest", "Core", "Obliques", "Legs", "Shoulders", "Triceps"];

const formSchema = z.object({
  availableEquipment: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one piece of equipment.",
  }),
  fitnessGoals: z.string().min(1, { message: 'Goal cannot be empty.' }),
  fitnessLevel: z.string().min(1, { message: 'Please select a fitness level.' }),
  workoutDuration: z.coerce.number().min(10, { message: 'Duration must be at least 10 minutes.' }),
  focusArea: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one muscle group.",
  }),
  focusOnSupersets: z.boolean().default(false),
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const equipmentCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/equipment`) : null
  , [firestore, user]);

  const { data: userEquipment, isLoading: isLoadingEquipment } = useCollection<UserEquipment>(equipmentCollection);

  const workoutLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc"));
  }, [firestore, user]);
  
  const { data: workoutLogs } = useCollection<WorkoutLog>(workoutLogsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      availableEquipment: [],
      fitnessGoals: 'Build Muscle',
      fitnessLevel: 'intermediate',
      workoutDuration: 40,
      focusArea: ["Full Body"],
      focusOnSupersets: false,
    },
  });
  
  useEffect(() => {
    if (userEquipment && userEquipment.length > 0) {
      const tonal = userEquipment.find(e => e.name.toLowerCase() === 'tonal');
      if (tonal) {
        form.setValue('availableEquipment', [tonal.name]);
      } else if (form.getValues('availableEquipment').length === 0) {
         form.setValue('availableEquipment', [userEquipment[0].name]);
      }
    }
  }, [userEquipment, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedWorkout(null);

    const history = workoutLogs?.map(log => ({
      date: format(parseISO(log.date), 'PPP'),
      name: log.workoutName,
      exercises: log.exercises.map(ex => ex.exerciseName).join(', ')
    }));

    try {
      const result = await generateWorkout({
        ...values,
        fitnessGoals: [values.fitnessGoals], 
        workoutHistory: history,
      });
      setGeneratedWorkout(result);
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

      const processedExercises = await Promise.all(
        generatedWorkout.exercises.map(async (ex) => {
          const q = query(masterExercisesRef, where("name", "==", ex.name));
          const querySnapshot = await getDocs(q);

          let masterExerciseId: string;

          if (querySnapshot.empty) {
            const newExerciseDocRef = doc(masterExercisesRef); // Auto-generate ID
            // Use the category from the AI, not a generic one.
            const newExercise: Omit<Exercise, 'id' | 'videoId'> = {
              name: ex.name,
              category: ex.category,
            };
            await setDocumentNonBlocking(newExerciseDocRef, newExercise, { merge: false });
            masterExerciseId = newExerciseDocRef.id;
          } else {
            masterExerciseId = querySnapshot.docs[0].id;
          }
          
          return {
            id: generateUniqueId(),
            exerciseId: masterExerciseId,
            exerciseName: ex.name,
            sets: parseInt(ex.sets.split('-')[0]),
            reps: ex.reps,
            videoId: null,
            supersetId: ex.supersetId,
          };
        })
      );
      
      const workoutData = {
        userId: user.uid,
        name: generatedWorkout.workoutName,
        exercises: processedExercises,
      };

      const workoutsCollection = collection(firestore, `users/${user.uid}/customWorkouts`);
      const newDocRef = await addDocumentNonBlocking(workoutsCollection, workoutData);

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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Bot className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Fitness Guide</h1>
          <p className="text-muted-foreground">
            Let our AI craft the perfect workout for you.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                           Select one or more muscle groups to target.
                          </FormDescription>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                      {focusAreas.map((item) => (
                          <FormField
                          key={item}
                          control={form.control}
                          name="focusArea"
                          render={({ field }) => {
                              return (
                              <FormItem
                                  key={item}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                  <FormControl>
                                  <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                      return checked
                                          ? field.onChange([...(field.value || []), item])
                                          : field.onChange(
                                              field.value?.filter(
                                              (value) => value !== item
                                              )
                                          )
                                      }}
                                  />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                      {item}
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
                      name="fitnessGoals"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Primary Fitness Goal</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your main goal" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Build Muscle">Build Muscle</SelectItem>
                                <SelectItem value="Lose Fat">Lose Fat</SelectItem>
                                <SelectItem value="Improve Endurance">Improve Endurance</SelectItem>
                                <SelectItem value="Increase Strength">Increase Strength</SelectItem>
                                <SelectItem value="General Fitness">General Fitness</SelectItem>
                            </SelectContent>
                          </Select>
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

                <FormField
                  control={form.control}
                  name="focusOnSupersets"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Create supersets for focus area
                        </FormLabel>
                        <FormDescription>
                           Group exercises for the selected muscle group into supersets.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </>
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

        <div className="lg:col-span-2">
            {isLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 border-2 border-dashed rounded-lg">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <h2 className="text-xl font-semibold">Crafting your workout...</h2>
                    <p className="text-muted-foreground text-center">The AI is warming up and building your personalized plan.</p>
                </div>
            )}

            {!isLoading && !generatedWorkout && (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 border-2 border-dashed rounded-lg">
                    <Dumbbell className="w-12 h-12 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Your Workout Plan Awaits</h2>
                    <p className="text-muted-foreground text-center">Fill out your preferences and the AI will generate a plan here.</p>
                </div>
            )}

            {generatedWorkout && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{generatedWorkout.workoutName}</CardTitle>
                        <CardDescription>{generatedWorkout.description}</CardDescription>
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
                                  Save this workout
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

    