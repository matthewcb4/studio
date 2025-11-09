"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Trash2, Edit, Video, Loader2 } from "lucide-react";
import { customWorkouts as initialWorkouts, exercises } from "@/lib/data";
import type { CustomWorkout, WorkoutExercise } from "@/lib/types";
import { findExerciseVideo } from "@/ai/flows/find-exercise-video-flow";


export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<CustomWorkout[]>(initialWorkouts);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(null);

  const handleCreateNew = () => {
    setEditingWorkout(null);
    setIsSheetOpen(true);
  };
  
  const handleEdit = (workout: CustomWorkout) => {
    setEditingWorkout(workout);
    setIsSheetOpen(true);
  }

  const handleDelete = (workoutId: string) => {
    setWorkouts(workouts.filter(w => w.id !== workoutId));
  }
  
  const handleSaveWorkout = (workout: CustomWorkout) => {
    if(editingWorkout) {
      setWorkouts(workouts.map(w => w.id === workout.id ? workout : w));
    } else {
      setWorkouts([...workouts, {...workout, id: (workouts.length + 1).toString()}]);
    }
    setIsSheetOpen(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Workouts</h1>
          <p className="text-muted-foreground">
            Create and manage your custom training routines.
          </p>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button onClick={handleCreateNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Workout
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-2xl w-full flex flex-col">
              <WorkoutForm 
                workout={editingWorkout} 
                onSave={handleSaveWorkout}
                onCancel={() => setIsSheetOpen(false)}
              />
          </SheetContent>
        </Sheet>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workouts.map((workout) => (
          <Card key={workout.id}>
            <CardHeader>
              <CardTitle>{workout.name}</CardTitle>
              <CardDescription>
                {workout.exercises.length} exercises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workout.exercises.map((ex, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{ex.exerciseName}</span>
                    <span className="text-muted-foreground">{ex.sets} sets of {ex.reps}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(workout)}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(workout.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WorkoutForm({ workout, onSave, onCancel }: { workout: CustomWorkout | null, onSave: (workout: CustomWorkout) => void, onCancel: () => void }) {
    const [name, setName] = useState(workout?.name || "");
    const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(workout?.exercises || []);
    const [selectedVideoExercise, setSelectedVideoExercise] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isVideoLoading, setIsVideoLoading] = useState(false);

    const addExercise = () => {
        if(exercises.length > 0) {
            const firstExercise = exercises[0];
            setWorkoutExercises([...workoutExercises, { exerciseId: firstExercise.id, exerciseName: firstExercise.name, sets: 3, reps: '8-12' }]);
        }
    }

    const updateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
        const newExercises = [...workoutExercises];
        const exercise = newExercises[index];
        if (field === 'exerciseId') {
            const selectedExercise = exercises.find(e => e.id === value);
            if(selectedExercise) {
                exercise.exerciseId = selectedExercise.id;
                exercise.exerciseName = selectedExercise.name;
            }
        } else {
            (exercise[field] as any) = value;
        }
        setWorkoutExercises(newExercises);
    }

    const removeExercise = (index: number) => {
        setWorkoutExercises(workoutExercises.filter((_, i) => i !== index));
    }

    const handleSave = () => {
        const newWorkout: CustomWorkout = {
            id: workout?.id || Date.now().toString(),
            name,
            exercises: workoutExercises,
        };
        onSave(newWorkout);
    }

    const handleVideoClick = async (exerciseName: string) => {
        setSelectedVideoExercise(exerciseName);
        setIsVideoLoading(true);
        setVideoUrl(null);
        try {
          const result = await findExerciseVideo({ exerciseName });
          if (result.videoId) {
            setVideoUrl(`https://www.youtube.com/embed/${result.videoId}`);
          }
        } catch (error) {
          console.error('Failed to find video:', error);
        } finally {
          setIsVideoLoading(false);
        }
      };
    
    return (
        <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedVideoExercise(null)}>
            <SheetHeader>
              <SheetTitle>{workout ? "Edit Workout" : "Create New Workout"}</SheetTitle>
              <SheetDescription>
                {workout ? "Modify your existing routine." : "Build a new workout plan from scratch."}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-1 -mx-1">
                <div className="grid gap-4 py-4 px-1">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                        Name
                        </Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    
                    <h3 className="font-semibold mt-4">Exercises</h3>
                    <div className="space-y-4">
                        {workoutExercises.map((ex, index) => (
                            <div key={index} className="flex flex-col gap-2 p-4 border rounded-lg">
                                <div className="flex justify-between items-center">
                                    <Label>Exercise {index + 1}</Label>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => handleVideoClick(ex.exerciseName)}>
                                            <Video className="h-4 w-4 mr-2"/>
                                            View Video
                                        </Button>
                                    </DialogTrigger>
                                </div>
                               <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                         <Select value={ex.exerciseId} onValueChange={(value) => updateExercise(index, 'exerciseId', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select exercise" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {exercises.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Input type="number" value={ex.sets} onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))} placeholder="Sets"/>
                                    </div>
                               </div>
                                <div className="grid grid-cols-2 gap-2">
                                     <div className="space-y-1">
                                        <Input value={ex.reps} onChange={(e) => updateExercise(index, 'reps', e.target.value)} placeholder="e.g. 8-12 Reps"/>
                                    </div>
                                    <div className="flex items-end">
                                        <Button variant="destructive" size="sm" onClick={() => removeExercise(index)} className="w-full">
                                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" onClick={addExercise} className="mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise
                    </Button>
                </div>
            </div>
            <SheetFooter>
                <SheetClose asChild>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                </SheetClose>
                <Button onClick={handleSave}>Save Workout</Button>
            </SheetFooter>
            
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedVideoExercise || 'Exercise Video'}</DialogTitle>
                    <DialogDescription>
                        Watch the video below to ensure proper form.
                    </DialogDescription>
                </DialogHeader>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    {isVideoLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : videoUrl ? (
                        <iframe
                        width="100%"
                        height="100%"
                        src={videoUrl}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg"
                        ></iframe>
                    ) : (
                        <p className="text-muted-foreground">No video found for this exercise.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}