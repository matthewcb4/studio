'use client';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bot, PlusCircle, Trash2, Wand2, Loader2, Dumbbell, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { generateWorkout, type GenerateWorkoutOutput } from '@/ai/flows/workout-guide-flow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const formSchema = z.object({
  availableEquipment: z.array(z.object({ value: z.string().min(1, { message: 'Equipment name cannot be empty.' }) })),
  fitnessGoals: z.array(z.object({ value: z.string().min(1, { message: 'Goal cannot be empty.' }) })),
  fitnessLevel: z.string().min(1, { message: 'Please select a fitness level.' }),
  workoutDuration: z.coerce.number().min(10, { message: 'Duration must be at least 10 minutes.' }),
  focusArea: z.string().min(1, { message: 'Please select a focus area.' }),
});

export default function GuidePage() {
  const [generatedWorkout, setGeneratedWorkout] = useState<GenerateWorkoutOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideoExercise, setSelectedVideoExercise] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      availableEquipment: [{ value: 'Tonal' }],
      fitnessGoals: [{ value: 'Build Muscle' }],
      fitnessLevel: 'intermediate',
      workoutDuration: 45,
      focusArea: 'Full Body',
    },
  });

  const { fields: equipmentFields, append: appendEquipment, remove: removeEquipment } = useFieldArray({
    control: form.control,
    name: 'availableEquipment',
  });

  const { fields: goalFields, append: appendGoal, remove: removeGoal } = useFieldArray({
    control: form.control,
    name: 'fitnessGoals',
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedWorkout(null);
    try {
      const result = await generateWorkout({
        ...values,
        availableEquipment: values.availableEquipment.map(item => item.value),
        fitnessGoals: values.fitnessGoals.map(item => item.value),
      });
      setGeneratedWorkout(result);
    } catch (error) {
      console.error('Failed to generate workout:', error);
      // You could show a toast notification here
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedVideoExercise(null)}>
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
                  
                  {/* Available Equipment */}
                  <div className="space-y-2">
                      <FormLabel>Available Equipment</FormLabel>
                      {equipmentFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                          <FormField
                          control={form.control}
                          name={`availableEquipment.${index}.value`}
                          render={({ field }) => (
                              <FormItem className="flex-1">
                              <FormControl>
                                  <Input placeholder="e.g., Kettlebell" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <Button type="button" variant="destructive" size="icon" onClick={() => removeEquipment(index)} disabled={equipmentFields.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendEquipment({ value: '' })} className="w-full">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Equipment
                      </Button>
                  </div>
                  
                  {/* Fitness Goals */}
                  <div className="space-y-2">
                      <FormLabel>Fitness Goals</FormLabel>
                      {goalFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                          <FormField
                          control={form.control}
                          name={`fitnessGoals.${index}.value`}
                          render={({ field }) => (
                              <FormItem className="flex-1">
                              <FormControl>
                                  <Input placeholder="e.g., Improve Endurance" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <Button type="button" variant="destructive" size="icon" onClick={() => removeGoal(index)} disabled={goalFields.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendGoal({ value: '' })} className="w-full">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
                      </Button>
                  </div>

                  {/* Fitness Level, Duration, Focus Area */}
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
                          <FormControl>
                          <Input type="number" placeholder="e.g., 45" {...field} />
                          </FormControl>
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
                      <p className="text-muted-foreground text-center">Fill out your preferences on the left and let the AI generate a custom workout for you.</p>
                  </div>
              )}

              {generatedWorkout && (
                   <Card>
                      <CardHeader>
                          <CardTitle className="text-2xl">{generatedWorkout.workoutName}</CardTitle>
                          <CardDescription>{generatedWorkout.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {generatedWorkout.exercises.map((ex, index) => (
                              <div key={index} className="p-4 border rounded-lg bg-secondary/50">
                                  <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-lg text-primary">{ex.name}</h4>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" onClick={() => setSelectedVideoExercise(ex.name)}>
                                        <Video className="mr-2 h-4 w-4" />
                                        View Video
                                      </Button>
                                    </DialogTrigger>
                                  </div>
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
                      </CardContent>
                      <CardFooter>
                          <Button className="w-full">
                              <PlusCircle className="mr-2 h-4 w-4" /> Save this workout
                          </Button>
                      </CardFooter>
                   </Card>
              )}
          </div>
        </div>
      </div>
      {selectedVideoExercise && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVideoExercise}</DialogTitle>
            <DialogDescription>
              Watch the video below to ensure proper form.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Video player will be here.</p>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
