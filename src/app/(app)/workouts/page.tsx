'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { PlusCircle, Trash2, Edit, Video, Loader2, Search } from 'lucide-react';
import { exercises as masterExercises } from '@/lib/data';
import type { CustomWorkout, WorkoutExercise } from '@/lib/types';
import { findExerciseVideo, FindExerciseVideoOutput } from '@/ai/flows/find-exercise-video-flow';
import {
  useCollection,
  useUser,
  useFirestore,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';


function VideoSearchDialog({
  exerciseName,
  onSelectVideo,
}: {
  exerciseName: string;
  onSelectVideo: (videoId: string) => void;
}) {
  const [searchResults, setSearchResults] = useState<FindExerciseVideoOutput['videos']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(exerciseName);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setIsLoading(true);
    setSearchResults([]);
    try {
      const result = await findExerciseVideo({ exerciseName: searchTerm });
      setSearchResults(result.videos || []);
    } catch (error) {
      console.error('Failed to find video:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  React.useEffect(() => {
    handleSearch();
  }, []);

  return (
    <DialogContent className="max-w-md md:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Find Video for {exerciseName}</DialogTitle>
        <DialogDescription>
          Search for a YouTube Short and select the best one.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search query..."
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
             <div key={i} className="w-full aspect-[9/16] overflow-hidden rounded-lg">
                <Skeleton className="h-full w-full" />
            </div>
          ))}
        {searchResults.map((video) => (
          <DialogClose key={video.videoId} asChild>
            <div 
              className="w-full aspect-[9/16] overflow-hidden rounded-lg group relative cursor-pointer"
              onClick={() => onSelectVideo(video.videoId)}
            >
                <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="absolute top-0 left-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/50 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    <p className="text-white text-center text-xs">{video.title}</p>
                </div>
            </div>
          </DialogClose>
        ))}
      </div>
    </DialogContent>
  );
}


function WorkoutForm({
  workout,
  onSave,
  onCancel,
}: {
  workout: CustomWorkout | null;
  onSave: (workout: Omit<CustomWorkout, 'id'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(workout?.name || '');
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(
    workout?.exercises || []
  );

  const addExercise = () => {
    setWorkoutExercises([
      ...workoutExercises,
      { exerciseId: '', exerciseName: '', sets: 3, reps: '8-12', videoId: null },
    ]);
  };

  const updateExercise = (
    index: number,
    field: keyof WorkoutExercise,
    value: any
  ) => {
    const newExercises = [...workoutExercises];
    const exercise = newExercises[index];
    if (field === 'exerciseId') {
      const selectedExercise = masterExercises.find((e) => e.id === value);
      if (selectedExercise) {
        exercise.exerciseId = selectedExercise.id;
        exercise.exerciseName = selectedExercise.name;
        exercise.videoId = selectedExercise.videoId || null;
      }
    } else {
      (exercise[field] as any) = value;
    }
    setWorkoutExercises(newExercises);
  };
  
  const handleVideoIdUpdate = (index: number, videoId: string) => {
     const newExercises = [...workoutExercises];
     newExercises[index].videoId = videoId;
     setWorkoutExercises(newExercises);
  }

  const removeExercise = (index: number) => {
    setWorkoutExercises(workoutExercises.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const newWorkout: Omit<CustomWorkout, 'id'> = {
      name,
      exercises: workoutExercises,
    };
    onSave(newWorkout);
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {workout ? 'Edit Workout' : 'Create New Workout'}
        </SheetTitle>
        <SheetDescription>
          {workout
            ? 'Modify your existing routine.'
            : 'Build a new workout plan from scratch.'}
        </SheetDescription>
      </SheetHeader>
      
      <div className="flex-1 overflow-y-auto p-1 -mx-1">
        <div className="grid gap-4 py-4 px-1">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>

          <h3 className="font-semibold mt-4">Exercises</h3>
          <div className="space-y-4">
            {workoutExercises.map((ex, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 p-4 border rounded-lg"
              >
                <div className="flex justify-between items-center">
                  <Label>Exercise {index + 1}</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                       <Button variant="outline" size="sm" disabled={!ex.exerciseName}>
                          <Video className="h-4 w-4 mr-2"/>
                          {ex.videoId ? 'Change Video' : 'Find Video'}
                       </Button>
                    </DialogTrigger>
                    <VideoSearchDialog exerciseName={ex.exerciseName} onSelectVideo={(videoId) => handleVideoIdUpdate(index, videoId)}/>
                  </Dialog>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Select
                      value={ex.exerciseId}
                      onValueChange={(value) =>
                        updateExercise(index, 'exerciseId', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        {masterExercises.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      value={ex.sets}
                      onChange={(e) =>
                        updateExercise(index, 'sets', parseInt(e.target.value))
                      }
                      placeholder="Sets"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Input
                      value={ex.reps}
                      onChange={(e) =>
                        updateExercise(index, 'reps', e.target.value)
                      }
                      placeholder="e.g. 8-12 Reps"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeExercise(index)}
                      className="w-full"
                    >
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
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </SheetClose>
        <Button onClick={handleSave}>Save Workout</Button>
      </SheetFooter>
    </>
  );
}

export default function WorkoutsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(
    null
  );

  const workoutsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/customWorkouts`);
  }, [firestore, user]);

  const { data: workouts, isLoading } =
    useCollection<CustomWorkout>(workoutsCollection);

  const handleCreateNew = () => {
    setEditingWorkout(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (workout: CustomWorkout) => {
    setEditingWorkout(workout);
    setIsSheetOpen(true);
  };

  const handleDelete = (workoutId: string) => {
    if (!user || !workoutsCollection) return;
    const workoutDoc = doc(workoutsCollection, workoutId);
    deleteDocumentNonBlocking(workoutDoc);
  };

  const handleSaveWorkout = (workoutData: Omit<CustomWorkout, 'id'>) => {
    if (!user || !workoutsCollection) return;
  
    // Update the master exercise list with new video IDs
    workoutData.exercises.forEach(exercise => {
      if (exercise.videoId) {
        const masterExDocRef = doc(firestore, `exercises/${exercise.exerciseId}`);
        // We use set with merge to not overwrite the whole document
        setDocumentNonBlocking(masterExDocRef, { videoId: exercise.videoId }, { merge: true });
      }
    });

    const dataToSave = { ...workoutData, userId: user.uid };

    if (editingWorkout) {
      const workoutDoc = doc(workoutsCollection, editingWorkout.id);
      updateDocumentNonBlocking(workoutDoc, dataToSave);
    } else {
      addDocumentNonBlocking(workoutsCollection, dataToSave);
    }
    setIsSheetOpen(false);
  };

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
      {isLoading && <div className="text-center">Loading workouts...</div>}
      {!isLoading && workouts?.length === 0 && (
        <div className="text-center text-muted-foreground">
          No custom workouts created yet.
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workouts?.map((workout) => (
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
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="font-medium">{ex.exerciseName}</span>
                    <span className="text-muted-foreground">
                      {ex.sets} sets of {ex.reps}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(workout)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(workout.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

    