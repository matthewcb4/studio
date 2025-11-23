
'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
  UserExercisePreference,
} from '@/lib/types';
import {
  useCollection,
  useUser,
  useFirestore,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useMemoFirebase,
  setDocumentNonBlocking,
  useFirebase,
} from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const generateUniqueId = (): string => {
    return `_${Math.random().toString(36).substr(2, 9)}`;
};

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
  exercisePreferences,
  onSave,
  onCancel,
}: {
  workout: CustomWorkout | null;
  masterExercises: MasterExercise[];
  exercisePreferences: UserExercisePreference[] | null;
  onSave: (workout: Omit<CustomWorkout, 'id' | 'userId'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const { user, firestore } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (workout) {
      // Use setTimeout to avoid synchronous state updates during rendering
      const t = setTimeout(() => {
        setName(workout.name);
        setDescription(workout.description || '');
        // Deep copy exercises to avoid direct mutation of props
        const initializedExercises = workout.exercises?.map(ex => ({ ...ex, unit: ex.unit || 'reps' })) || [];
        setExercises(JSON.parse(JSON.stringify(initializedExercises)));
      }, 0);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setName('');
        setDescription('');
        setExercises([]);
      }, 0);
      return () => clearTimeout(t);
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
      unit: 'reps',
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
      unit: 'reps',
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
    value: string | number
  ) => {
    const newExercises = exercises.map(ex => {
      if (ex.id === exerciseIdToUpdate) {
        const updatedEx = { ...ex };
        if (field === 'exerciseId') {
          const selectedExercise = masterExercises.find(e => e.id === value);
          if (selectedExercise) {
            updatedEx.exerciseId = selectedExercise.id;
            updatedEx.exerciseName = selectedExercise.name;
          } else {
            updatedEx.exerciseId = value as string; 
            updatedEx.exerciseName = value as string;
          }
        } else if (field === 'sets') {
          updatedEx.sets = Number(value);
        } else if (field === 'reps' || field === 'unit' || field === 'exerciseName' || field === 'supersetId' || field === 'id') {
          // @ts-expect-error - we know these are strings and match the type
          updatedEx[field] = String(value);
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

  const handleVideoIdChange = (masterExerciseId: string, urlOrId: string) => {
    if (!masterExerciseId || !user || !firestore) return;

    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|shorts\/|v\/|)([\w-]{11})/;
    const match = urlOrId.match(youtubeRegex);
    const videoId = match ? match[1] : (urlOrId.length === 11 ? urlOrId : null);

    const preferenceDocRef = doc(firestore, `users/${user.uid}/exercisePreferences`, masterExerciseId);

    if (videoId) {
        setDocumentNonBlocking(preferenceDocRef, { videoId, userId: user.uid }, { merge: true });
        toast({
            title: "Video Preference Saved",
            description: `Video linked for this exercise.`
        });
    } else if (urlOrId === '') { // Allow clearing the video
        setDocumentNonBlocking(preferenceDocRef, { videoId: null, userId: user.uid }, { merge: true });
        toast({ title: "Video Preference Cleared" });
    } else {
        toast({
            variant: "destructive",
            title: "Invalid YouTube ID",
            description: "Please paste a valid 11-character YouTube video ID or a full URL."
        });
    }
  };


  const handleSave = () => {
    const finalizedExercises = exercises.map(ex => {
        const matched = masterExercises.find(me => me.name === ex.exerciseName || me.id === ex.exerciseId);
        if (matched) {
            return { ...ex, exerciseId: matched.id, exerciseName: matched.name, unit: ex.unit || 'reps' };
        }
        return { ...ex, unit: ex.unit || 'reps' };
    });

    const newWorkout: Omit<CustomWorkout, 'id' | 'userId'> = {
      name,
      description,
      exercises: finalizedExercises,
    };
    onSave(newWorkout);
  };

  const handleMoveGroup = (groupIndex: number, direction: 'up' | 'down') => {
    const currentGroups = groupExercises(exercises);
    if (!currentGroups) return;
    if (direction === 'up' && groupIndex === 0) return;
    if (direction === 'down' && groupIndex === currentGroups.length - 1) return;
  
    const otherGroupIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
    
    const newGroups = [...currentGroups];
    const [movedGroup] = newGroups.splice(groupIndex, 1);
    newGroups.splice(otherGroupIndex, 0, movedGroup);
  
    const newExercises = newGroups.flat();
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>

          <h3 className="font-semibold mt-4">Exercise Groups</h3>
          <div className="space-y-4">
            {exerciseGroups?.map((group, groupIndex) => (
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
                            disabled={!exerciseGroups || groupIndex === exerciseGroups.length - 1}
                            className="h-7 w-7"
                        >
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                {group.map((ex, exIndex) => {
                  const matchedExercise = masterExercises.find(masterEx => masterEx.id === ex.exerciseId);
                  const selectValue = matchedExercise ? matchedExercise.id : ex.exerciseId;
                  const currentVideoId = exercisePreferences?.find(p => p.id === ex.exerciseId)?.videoId;

                  return (
                    <div
                      key={ex.id}
                      className="flex flex-col gap-2 p-3 border rounded-lg bg-background"
                    >
                          <div className="flex justify-between items-center">
                            <Label className="text-xs">Exercise {exIndex + 1}</Label>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeExercise(ex.id)}
                              className='h-7'
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Remove
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
                           placeholder={ex.unit === 'reps' ? "e.g. 8-12" : "e.g. 30"}
                         />
                         <Select value={ex.unit || 'reps'} onValueChange={(value) => updateExercise(ex.id, 'unit', value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="reps">Reps</SelectItem>
                                <SelectItem value="seconds">Seconds</SelectItem>
                                <SelectItem value="bodyweight">Bodyweight</SelectItem>
                            </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-1">
                          <Label htmlFor={`video-id-${ex.id}`} className="text-xs">Linked Video ID</Label>
                           <div className="flex items-center gap-2">
                                <Input
                                    id={`video-id-${ex.id}`}
                                    className="mt-1 h-8 text-sm"
                                    placeholder="Paste YouTube URL or ID"
                                    defaultValue={currentVideoId || ''}
                                    onBlur={(e) => handleVideoIdChange(ex.exerciseId, e.target.value)}
                                    disabled={!ex.exerciseId}
                                />
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!ex.exerciseName} onClick={() => handleFindVideo(ex.exerciseName)}>
                                    <Youtube className="h-4 w-4" />
                                </Button>
                           </div>
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // Initialize state based on the URL parameter
  const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(null);
  const [sortOrder, setSortOrder] = useState('alphabetical');

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
  
  const exercisePreferencesQuery = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/exercisePreferences`) : null
  , [firestore, user]);
  const { data: exercisePreferences, isLoading: isLoadingPreferences } = useCollection<UserExercisePreference>(exercisePreferencesQuery);

  // This effect handles opening the sheet when the ?edit=... param is present
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && workouts) {
      const workoutToEdit = workouts.find(w => w.id === editId);
      if (workoutToEdit && (!editingWorkout || editingWorkout.id !== workoutToEdit.id)) {
        setTimeout(() => {
            setEditingWorkout(workoutToEdit);
            setIsSheetOpen(true);
        }, 0);
      }
    }
  }, [searchParams, workouts, editingWorkout]);

  // This function handles closing the sheet and clearing the URL param
  const handleSheetClose = (open: boolean) => {
    if (!open) {
      setIsSheetOpen(false);
      setEditingWorkout(null);
      // Clear the edit parameter from the URL without reloading the page
      router.replace(pathname, { scroll: false });
    } else {
      setIsSheetOpen(true);
    }
  };


  const handleCreateNew = () => {
    setEditingWorkout(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (workout: CustomWorkout) => {
    // Navigate to URL with edit param, which will trigger the useEffect
    router.push(`${pathname}?edit=${workout.id}`, { scroll: false });
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
    // Let the onOpenChange handler do the closing and URL clearing
    handleSheetClose(false);
  };
  
  const sortedWorkouts = useMemo(() => {
    if (!workouts) return [];
    const sorted = [...workouts];
    if (sortOrder === 'alphabetical') {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Add logic for 'date' when available
    return sorted;
  }, [workouts, sortOrder]);
  
  const groupedWorkouts = useMemo(() => {
    return sortedWorkouts?.map(w => ({ ...w, groupedExercises: groupExercises(w.exercises || [])})) || [];
  }, [sortedWorkouts]);

  const isLoading = isLoadingWorkouts || isLoadingExercises || isLoadingPreferences;
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold">My Workouts</h1>
          <p className="text-muted-foreground">
            Create and manage your custom training routines.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
            <Sheet open={isSheetOpen} onOpenChange={handleSheetClose}>
            <SheetTrigger asChild>
                <Button onClick={handleCreateNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Workout
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full max-w-[95vw] sm:max-w-2xl flex flex-col">
                <Suspense fallback={<div className="p-6">Loading form...</div>}>
                <WorkoutForm
                    workout={editingWorkout}
                    masterExercises={masterExercises || []}
                    exercisePreferences={exercisePreferences || null}
                    onSave={handleSaveWorkout}
                    onCancel={() => handleSheetClose(false)}
                />
                </Suspense>
            </SheetContent>
            </Sheet>
            <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
                    <SelectItem value="date_desc" disabled>Date Created (Newest)</SelectItem>
                </SelectContent>
            </Select>
        </div>
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
      <Accordion type="single" collapsible className="w-full space-y-4">
        {groupedWorkouts?.map((workout) => (
          <AccordionItem value={workout.id} key={workout.id} className="border-none">
            <Card>
              <AccordionTrigger className="p-0 border-none hover:no-underline">
                <CardHeader className="flex-1 text-left">
                  <CardTitle>{workout.name}</CardTitle>
                  <CardDescription>
                    {workout.description || `${(workout.exercises?.length || 0)} exercises in ${(workout.groupedExercises || []).length} groups`}
                  </CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="pt-0">
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
                              {ex.sets} sets of {ex.reps} {ex.unit || 'reps'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button asChild>
                    <Link href={`/workout/${workout.id}`}>Start Workout</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(workout)}
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
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
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

    