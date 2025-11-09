'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bot, Wand2, Loader2, Dumbbell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from "@/components/ui/checkbox";
import { generateWorkout, type GenerateWorkoutOutput } from '@/ai/flows/workout-guide-flow';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserEquipment } from '@/lib/types';

const formSchema = z.object({
  availableEquipment: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one piece of equipment.",
  }),
  fitnessGoals: z.string().min(1, { message: 'Goal cannot be empty.' }),
  fitnessLevel: z.string().min(1, { message: 'Please select a fitness level.' }),
  workoutDuration: z.coerce.number().min(10, { message: 'Duration must be at least 10 minutes.' }),
  focusArea: z.string().min(1, { message: 'Please select a focus area.' }),
});

export default function GuidePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [generatedWorkout, setGeneratedWorkout] = useState<GenerateWorkoutOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const equipmentCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/equipment`) : null
  , [firestore, user]);

  const { data: userEquipment, isLoading: isLoadingEquipment } = useCollection<UserEquipment>(equipmentCollection);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      availableEquipment: [],
      fitnessGoals: 'Build Muscle',
      fitnessLevel: 'intermediate',
      workoutDuration: 45,
      focusArea: 'Full Body',
    },
  });
  
  useEffect(() => {
    if (userEquipment && userEquipment.length > 0) {
      // Pre-select 'Tonal' if it exists, otherwise select the first item.
      const tonal = userEquipment.find(e => e.name.toLowerCase() === 'tonal');
      if (tonal) {
        form.setValue('availableEquipment', [tonal.name]);
      } else {
         form.setValue('availableEquipment', [userEquipment[0].name]);
      }
    }
  }, [userEquipment, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedWorkout(null);
    try {
      const result = await generateWorkout({
        ...values,
        fitnessGoals: [values.fitnessGoals], 
      });
      // We will add the display for this in the next step.
      setGeneratedWorkout(result); 
      toast({
          title: "Workout Generated!",
          description: "Your new workout plan is ready.",
      });
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
                        name="focusArea"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Focus Area</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select focus" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Full Body">Full Body</SelectItem>
                                <SelectItem value="Upper Body">Upper Body</SelectItem>
                                <SelectItem value="Lower Body">Lower Body</SelectItem>
                                <SelectItem value="Core">Core</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="workoutDuration"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Workout Duration (minutes)</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                            <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="45">45</SelectItem>
                                <SelectItem value="60">60</SelectItem>
                                <SelectItem value="75">75</SelectItem>
                                <SelectItem value="90">90</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
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
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 border-2 border-dashed rounded-lg">
                <Dumbbell className="w-12 h-12 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Your Workout Plan Awaits</h2>
                <p className="text-muted-foreground text-center">Fill out your preferences and the AI will generate a plan here.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
