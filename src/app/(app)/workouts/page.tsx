
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
  DialogClose,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PlusCircle, Trash2, Edit, Layers, Youtube } from 'lucide-react';
import { exercises as masterExercises } from '@/lib/data';
import type {
  CustomWorkout,
  WorkoutExercise,
} from '@/lib/types';
import {
  useCollection,
  useUser,
  useFirestore,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';

const generateUniqueId = () => `_${Math.random().toString(36).substr(2, 9)}`;

// Group exercises by supersetId for display
const groupExercises = (exercises: WorkoutExercise[] = []) => {
    if (!exercises || exercises.length === 0) return [];
    const grouped = exercises.reduce((acc, ex) => {
        (acc[ex.supersetId] = acc[ex.supersetId] || []).push(ex);
        return acc;
    }, {} as Record<string, WorkoutExercise[]>);
    
    // Sort outer groups, a bit tricky without a dedicated order field.
    // Let's assume the first exercise's original index gives a hint.
    const originalOrder: Record<string, number> = {};
    exercises.forEach((ex, index) => {
        if(!(ex.supersetId in originalOrder)) {
            originalOrder[ex.supersetId] = index;
        }
    });

    return Object.values(grouped).sort((a,b) => {
        const orderA = originalOrder[a[0].supersetId];
        const orderB = originalOrder[b[0].supersetId];
        return orderA - orderB;
    });
};


function WorkoutForm({
  workout,
  onSave,
  onCancel,
}: {
  workout: CustomWorkout | null;
  onSave: (workout: Omit<CustomWorkout, 'id' | 'userId'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(workout?.name || '');
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    workout?.exercises || []
  );

  const addExerciseGroup = () => {
    const newSupersetId = generateUniqueId();
    const newExercise: WorkoutExercise = {
      id: generateUniqueId(),
      exerciseId: '',
      exerciseName: '',
      sets: 3,
      reps: '8-12',
      videoId: null,
      supersetId: newSupersetId,
    };
    setExercises([...exercises, newExercise]);
  };

  const addExerciseToGroup = (supersetId: string) => {
    const newExercise: WorkoutExercise = {
      id: generateUniqueId(),
      exerciseId: '',
      exerciseName: '',
      sets: 3,
      reps: '8-12',
      videoId: null,
      supersetId: supersetId,
    };
    // To maintain order, find the last index of an exercise with the same supersetId
    const lastIndex = exercises.map(e => e.supersetId).lastIndexOf(supersetId);
    const newExercises = [...exercises];
    newExercises.splice(lastIndex + 1, 0, newExercise);
    setExercises(newExercises);
  };

  const updateExercise = (
    exerciseIdToUpdate: string,
    field: keyof WorkoutExercise,
    value: any
  ) => {
    const newExercises = exercises.map(ex => {
      if (ex.id === exerciseIdToUpdate) {
        const updatedEx = { ...ex };
        if (field === 'exerciseId') {
          const selectedExercise = masterExercises.find((e) => e.id === value);
          if (selectedExercise) {
            updatedEx.exerciseId = selectedExercise.id;
            updatedEx.exerciseName = selectedExercise.name;
          }
        } else {
          (updatedEx[field] as any) = value;
        }
        return updatedEx;
      }
      return ex;
    });
    setExercises(newExercises);
  };

  const removeExercise = (exerciseIdToRemove: string) => {
    const exerciseToRemove = exercises.find(ex => ex.id === exerciseIdToRemove);
    if (!exerciseToRemove) return;
  
    const remainingExercises = exercises.filter(ex => ex.id !== exerciseIdToRemove);
  
    // Check if any other exercises share the same supersetId
    const isGroupEmpty = !remainingExercises.some(ex => ex.supersetId === exerciseToRemove.supersetId);
  
    // If the group is now empty and it's not the only group, we could remove the group.
    // However, the current logic re-creates groups dynamically, so just removing the exercise is sufficient.
    setExercises(remainingExercises);
  };

  const handleSave = () => {
    const newWorkout: Omit<CustomWorkout, 'id' | 'userId'> = {
      name,
      exercises,
    };
    onSave(newWorkout);
  };

  const createYouTubeSearchUrl = (exerciseName: string) => {
    if (!exerciseName) return 'https://www.youtube.com';
    const query = `how to do a ${exerciseName} #shorts`;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  };
  
  const exerciseGroups = useMemo(() => groupExercises(exercises), [exercises]);

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {workout ? 'Edit Workout' : 'Create New Workout'}
        </SheetTitle>
        <SheetDescription>
          Build a workout plan. Group exercises together to create supersets.
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

          <h3 className="font-semibold mt-4">Exercise Groups</h3>
          <div className="space-y-4">
            {exerciseGroups.map((group, groupIndex) => (
              <div
                key={group[0]?.supersetId || groupIndex}
                className="p-4 border rounded-lg bg-secondary/30 space-y-4"
              >
                <Label>Group {groupIndex + 1} {group.length > 1 && '(Superset)'}</Label>
                {group.map((ex, exIndex) => (
                  <div
                    key={ex.id}
                    className="flex flex-col gap-2 p-3 border rounded-lg bg-background"
                  >
                    <div className="flex justify-between items-center">
                       <Label className="text-xs">Exercise {exIndex + 1}</Label>
                       <Button variant="outline" size="sm" asChild>
                         <Link href={createYouTubeSearchUrl(ex.exerciseName)} target="_blank" rel="noopener noreferrer">
                           <Youtube className="h-4 w-4 mr-2" />
                           Find Video
                         </Link>
                       </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <Select
                         value={ex.exerciseId}
                         onValueChange={(value) =>
                           updateExercise(ex.id, 'exerciseId', value)
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
                       <Input
                         type="number"
                         value={ex.sets}
                         onChange={(e) =>
                           updateExercise(
                             ex.id,
                             'sets',
                             parseInt(e.target.value) || 0
                           )
                         }
                         placeholder="Sets"
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                       <Input
                         value={ex.reps}
                         onChange={(e) =>
                           updateExercise(ex.id, 'reps', e.target.value)
                         }
                         placeholder="e.g. 8-12 Reps"
                       />
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => removeExercise(ex.id)}
                       >
                         <Trash2 className="h-4 w-4 mr-1" /> Remove
                       </Button>
                     </div>
                     <div className="text-xs text-muted-foreground pt-2">
                       <Label className="text-xs">Linked Video ID (11 characters)</Label>
                       <Input
                         className="mt-1 h-7 text-xs"
                         placeholder="Paste YouTube ID here"
                         value={ex.videoId || ''}
                         onChange={(e) =>
                           updateExercise(ex.id, 'videoId', e.target.value)
                         }
                         maxLength={11}
                       />
                     </div>
                  </div>
                ))}
                 <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addExerciseToGroup(group[0].supersetId)}
                >
                  <Layers className="mr-2 h-4 w-4" /> Add Exercise to Superset
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addExerciseGroup} className="mt-2">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise Group
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

  const handleSaveWorkout = (
    workoutData: Omit<CustomWorkout, 'id' | 'userId'>
  ) => {
    if (!user || !workoutsCollection) return;
    
    const dataToSave = { ...workoutData, userId: user.uid };

    if (editingWorkout) {
      const workoutDoc = doc(workoutsCollection, editingWorkout.id);
      updateDocumentNonBlocking(workoutDoc, dataToSave);
    } else {
      addDocumentNonBlocking(workoutsCollection, dataToSave);
    }
    setIsSheetOpen(false);
  };
  
  const groupedWorkouts = useMemo(() => {
    return workouts?.map(w => ({ ...w, groupedExercises: groupExercises(w.exercises || [])})) || [];
  }, [workouts]);


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
        <Card className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-xl font-semibold">No Workouts Yet</h3>
            <p className="text-muted-foreground">
              Click "Create New Workout" to get started.
            </p>
          </div>
        </Card>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groupedWorkouts?.map((workout) => (
          <Card key={workout.id}>
            <CardHeader>
              <CardTitle>{workout.name}</CardTitle>
               <CardDescription>
                {(workout.exercises?.length || 0)} exercises in {workout.groupedExercises?.length || 0} groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workout.groupedExercises?.map((group, groupIndex) => (
                  <div key={`${workout.id}-${group[0]?.supersetId || groupIndex}`} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {group.length > 1 ? `Superset ${groupIndex + 1}` : `Group ${groupIndex + 1}`}
                    </p>
                    {group.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex justify-between items-center text-sm pl-2"
                      >
                        <span className="font-medium">{ex.exerciseName}</span>
                        <span className="text-muted-foreground">
                          {ex.sets} sets of {ex.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
               <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(workouts.find(w => w.id === workout.id)!)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete
                      the workout "{workout.name}".
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(workout.id)}
                      >
                        Delete
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
