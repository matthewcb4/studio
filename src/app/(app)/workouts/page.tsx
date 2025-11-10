
'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { PlusCircle, Trash2, Edit, Layers, Youtube, ArrowUp, ArrowDown } from 'lucide-react';
import type {
  CustomWorkout,
  WorkoutExercise,
  Exercise as MasterExercise,
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
import { collection, doc, query, orderBy } from 'firebase/firestore';

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
  masterExercises,
  onSave,
  onCancel,
}: {
  workout: CustomWorkout | null;
  masterExercises: MasterExercise[];
  onSave: (workout: Omit<CustomWorkout, 'id' | 'userId'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  useEffect(() => {
    if (workout) {
      setName(workout.name);
      // Deep copy exercises to avoid direct mutation of props
      setExercises(JSON.parse(JSON.stringify(workout.exercises || [])));
    } else {
      setName('');
      setExercises([]);
    }
  }, [workout]);

  const addExerciseGroup = () => {
    const newSupersetId = generateUniqueId();
    const newExercise: WorkoutExercise = {
      id: generateUniqueId(),
      exerciseId: '', // Default to empty
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
      exerciseId: '', // Default to empty
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
          // The `exerciseId` can come from the master list (e.g., '1') or be a name (e.g., from AI).
          // We find the master exercise by either `id` or `name`.
          const selectedExercise = masterExercises.find(e => e.id === value);
          if (selectedExercise) {
            updatedEx.exerciseId = selectedExercise.id;
            updatedEx.exerciseName = selectedExercise.name;
          } else {
            updatedEx.exerciseId = value; 
            updatedEx.exerciseName = value;
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
    setExercises(remainingExercises);
  };
  
  const handleFindVideo = (exerciseName: string) => {
    if (!exerciseName) return;
    const query = encodeURIComponent(`how to do ${exerciseName} #shorts`);
    const url = `https://www.youtube.com/results?search_query=${query}`;
    window.open(url, '_blank');
  };


  const handleSave = () => {
    // Before saving, ensure any exercise that has a name but not an ID gets the ID from the master list
    const finalizedExercises = exercises.map(ex => {
        const matched = masterExercises.find(me => me.name === ex.exerciseName || me.id === ex.exerciseId);
        if (matched) {
            return { ...ex, exerciseId: matched.id, exerciseName: matched.name };
        }
        // If not found (should be rare if list is up to date), save as is
        return ex;
    });

    const newWorkout: Omit<CustomWorkout, 'id' | 'userId'> = {
      name,
      exercises: finalizedExercises,
    };
    onSave(newWorkout);
  };

  const handleMoveGroup = (groupIndex: number, direction: 'up' | 'down') => {
    const currentGroups = groupExercises(exercises);
    if (direction === 'up' && groupIndex === 0) return;
    if (direction === 'down' && groupIndex === currentGroups.length - 1) return;

    const otherGroupIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
    const groupToMove = currentGroups[groupIndex];
    const otherGroup = currentGroups[otherGroupIndex];

    const groupToMoveId = groupToMove[0].supersetId;
    const otherGroupId = otherGroup[0].supersetId;
    
    // Find the indices in the flat `exercises` array
    const firstIndexOfGroupToMove = exercises.findIndex(e => e.supersetId === groupToMoveId);
    const lastIndexOfGroupToMove = exercises.map(e => e.supersetId).lastIndexOf(groupToMoveId);
    const groupToMoveExercises = exercises.slice(firstIndexOfGroupToMove, lastIndexOfGroupToMove + 1);
    
    const firstIndexOfOtherGroup = exercises.findIndex(e => e.supersetId === otherGroupId);
    const lastIndexOfOtherGroup = exercises.map(e => e.supersetId).lastIndexOf(otherGroupId);
    const otherGroupExercises = exercises.slice(firstIndexOfOtherGroup, lastIndexOfOtherGroup + 1);

    const newExercises = [...exercises];

    if (direction === 'up') {
        // Replace other group with the group to move
        newExercises.splice(firstIndexOfOtherGroup, otherGroup.length, ...groupToMoveExercises);
        // Replace group to move with the other group
        newExercises.splice(firstIndexOfGroupToMove, groupToMove.length, ...otherGroupExercises);
    } else { // down
        // Replace group to move with the other group
        newExercises.splice(firstIndexOfGroupToMove, groupToMove.length, ...otherGroupExercises);
        // Replace other group with the group to move
        newExercises.splice(firstIndexOfOtherGroup, otherGroup.length, ...groupToMoveExercises);
    }

    setExercises(newExercises);
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
                <div className="flex justify-between items-center">
                    <Label>Group {groupIndex + 1} {group.length > 1 && '(Superset)'}</Label>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveGroup(groupIndex, 'up')}
                            disabled={groupIndex === 0}
                            className="h-7 w-7"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveGroup(groupIndex, 'down')}
                            disabled={groupIndex === exerciseGroups.length - 1}
                            className="h-7 w-7"
                        >
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                {group.map((ex, exIndex) => {
                  const matchedExercise = masterExercises.find(masterEx => masterEx.id === ex.exerciseId || masterEx.name === ex.exerciseName);
                  const selectValue = matchedExercise ? matchedExercise.id : ex.exerciseId;

                  return (
                    <div
                      key={ex.id}
                      className="flex flex-col gap-2 p-3 border rounded-lg bg-background"
                    >
                          <div className="flex justify-between items-center">
                            <Label className="text-xs">Exercise {exIndex + 1}</Label>
                            <Button variant="outline" size="sm" disabled={!ex.exerciseName} onClick={() => handleFindVideo(ex.exerciseName)}>
                                <Youtube className="h-4 w-4 mr-2" />
                                Find Video
                            </Button>
                          </div>
                      <div className="grid grid-cols-2 gap-2">
                         <Select
                           value={selectValue}
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
                         <Label className="text-xs">Linked Video ID</Label>
                         <Input
                           className="mt-1 h-8 text-sm"
                           placeholder="Paste 11-character ID from YouTube URL"
                           value={ex.videoId || ''}
                           onChange={(e) =>
                             updateExercise(ex.id, 'videoId', e.target.value)
                           }
                           maxLength={11}
                         />
                       </div>
                    </div>
                  )
                })}
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


function WorkoutsPageContent() {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(
    null
  );

  const workoutsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/customWorkouts`);
  }, [firestore, user]);

  const { data: workouts, isLoading: isLoadingWorkouts } =
    useCollection<CustomWorkout>(workoutsCollection);

  const masterExercisesQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'exercises'), orderBy('name', 'asc'));
  }, [firestore]);
  const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<MasterExercise>(masterExercisesQuery);


  useEffect(() => {
    if (isLoadingWorkouts || isLoadingExercises) return;

    const editId = searchParams.get('edit');
    if (editId && workouts) {
      const workoutToEdit = workouts.find(w => w.id === editId);
      if (workoutToEdit) {
        setEditingWorkout(workoutToEdit);
        setIsSheetOpen(true);
      }
    }
  }, [searchParams, workouts, isLoadingWorkouts, isLoadingExercises]);


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
    setEditingWorkout(null);
  };
  
  const groupedWorkouts = useMemo(() => {
    return workouts?.map(w => ({ ...w, groupedExercises: groupExercises(w.exercises || [])})) || [];
  }, [workouts]);

  const isLoading = isLoadingWorkouts || isLoadingExercises;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Workouts</h1>
          <p className="text-muted-foreground">
            Create and manage your custom training routines.
          </p>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setEditingWorkout(null);
        }}>
          <SheetTrigger asChild>
            <Button onClick={handleCreateNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Workout
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-2xl w-full flex flex-col">
            <WorkoutForm
              workout={editingWorkout}
              masterExercises={masterExercises || []}
              onSave={handleSaveWorkout}
              onCancel={() => {
                setIsSheetOpen(false)
                setEditingWorkout(null)
              }}
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
                {(workout.exercises?.length || 0)} exercises in {(workout.groupedExercises || []).length} groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workout.groupedExercises?.map((group, groupIndex) => (
                  <div key={group[0]?.supersetId || groupIndex} className="space-y-2">
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


export default function WorkoutsPage() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <WorkoutsPageContent />
    </Suspense>
  )
}
