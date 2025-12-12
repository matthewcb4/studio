

'use client';

import React, { useState, useMemo, Suspense, useEffect } from 'react';
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
import { PlusCircle, Trash2, Edit, Layers, Youtube, ArrowUp, ArrowDown, Loader2, Video, Search, MapPin } from 'lucide-react';
import type {
  CustomWorkout,
  WorkoutExercise,
  Exercise as MasterExercise,
  UserExercisePreference,
  WorkoutLocation,
} from '@/lib/types';
import {
  useCollection,
  useUser,
  useFirestore,
  addDoc,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, orderBy, type Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { findExerciseVideo, type FindExerciseVideoOutput } from '@/ai/flows/find-exercise-video-flow';
import Image from 'next/image';

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

  const originalOrder: Record<string, number> = {};
  exercises.forEach((ex, index) => {
    if (!(ex.supersetId in originalOrder)) {
      originalOrder[ex.supersetId] = index;
    }
  });

  return Object.values(grouped).sort((a, b) => {
    const orderA = originalOrder[a[0].supersetId];
    const orderB = originalOrder[b[0].supersetId];
    return orderA - orderB;
  });
};


function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      ></iframe>
    </div>
  );
}


function WorkoutForm({
  workout,
  masterExercises,
  exercisePreferences,
  locations,
  onSave,
  onCancel,
}: {
  workout: CustomWorkout | null;
  masterExercises: MasterExercise[];
  exercisePreferences: UserExercisePreference[] | null;
  locations: WorkoutLocation[] | null;
  onSave: (workout: Partial<CustomWorkout>, isNew: boolean) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(workout?.name || '');
  const [description, setDescription] = useState(workout?.description || '');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(workout?.locationId);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    workout?.exercises?.map(ex => ({ ...ex, unit: ex.unit || 'reps' })) || []
  );
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [videoResults, setVideoResults] = useState<{ exerciseId: string; videos: FindExerciseVideoOutput['videos'] }>({ exerciseId: '', videos: [] });
  const [findingVideoFor, setFindingVideoFor] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<FindExerciseVideoOutput['videos'][0] | null>(null);
  const [viewingVideoId, setViewingVideoId] = useState<string | null>(null);


  const addExerciseGroup = () => {
    const newSupersetId = generateUniqueId();
    const newExercise: WorkoutExercise = {
      id: generateUniqueId(),
      exerciseId: '',
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
      exerciseId: '',
      exerciseName: '',
      sets: 3,
      reps: '8-12',
      unit: 'reps',
      supersetId: supersetId,
    };
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
            if (selectedExercise.defaultUnit) {
              updatedEx.unit = selectedExercise.defaultUnit;
            }
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

  const handleSelectVideo = (firestore: Firestore, masterExerciseId: string, videoId: string) => {
    if (!user) return;
    const preferenceDocRef = doc(firestore, `users/${user.uid}/exercisePreferences`, masterExerciseId);
    setDocumentNonBlocking(preferenceDocRef, { videoId: videoId, userId: user.uid }, { merge: true });
    toast({
      title: "Video Preference Saved",
      description: `Video linked for this exercise.`
    });
    setVideoResults({ exerciseId: '', videos: [] }); // Close dialog
    setSelectedVideo(null);
  };

  const handleFindVideo = async (exerciseId: string, exerciseName: string) => {
    if (!exerciseName) return;
    setFindingVideoFor(exerciseId);
    try {
      const result = await findExerciseVideo({ exerciseName });
      if (result.error) {
        toast({ variant: "destructive", title: "Video Search Failed", description: result.error });
      } else if (result.videos && result.videos.length > 0) {
        setVideoResults({ exerciseId, videos: result.videos });
        setSelectedVideo(result.videos[0]);
      } else {
        toast({ variant: "destructive", title: "No Videos Found", description: "The AI couldn't find any suitable videos for this exercise." });
      }
    } catch (error) {
      console.error("Error finding video:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Could not find videos at this time." });
    } finally {
      setFindingVideoFor(null);
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

    const isNew = !workout;

    // Get location name for the selected location
    const selectedLocation = locations?.find(l => l.id === selectedLocationId);

    const newWorkout: Partial<CustomWorkout> = {
      name,
      description,
      exercises: finalizedExercises,
      locationId: selectedLocationId,
      locationName: selectedLocation?.name,
    };
    onSave(newWorkout, isNew);
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 -mx-1">
        <Dialog open={videoResults.videos.length > 0} onOpenChange={() => { setVideoResults({ exerciseId: '', videos: [] }); setSelectedVideo(null); }}>
          <DialogContent className="sm:max-w-lg w-full max-w-[95vw]">
            <DialogHeader>
              <DialogTitle>Select a Video</DialogTitle>
              <DialogDescription>
                Click a video on the right to preview it, then link it to this exercise.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {selectedVideo ? (
                  <>
                    <YouTubeEmbed videoId={selectedVideo.videoId} />
                    <h3 className="font-semibold">{selectedVideo.title}</h3>
                    <Button className="w-full" onClick={() => handleSelectVideo(firestore, videoResults.exerciseId, selectedVideo.videoId)}>
                      Link this Video
                    </Button>
                  </>
                ) : (
                  <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Select a video to preview</p>
                  </div>
                )}
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {videoResults.videos.map(video => (
                  <button key={video.videoId} onClick={() => setSelectedVideo(video)} className="w-full text-left space-y-2 hover:bg-secondary p-2 rounded-lg transition-colors">
                    <div className="flex gap-4">
                      <Image src={video.thumbnailUrl} alt={video.title} width={120} height={67} className="rounded-md bg-muted" />
                      <p className="text-sm font-medium line-clamp-3">{video.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingVideoId} onOpenChange={() => setViewingVideoId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exercise Video</DialogTitle>
            </DialogHeader>
            {viewingVideoId && <YouTubeEmbed videoId={viewingVideoId} />}
          </DialogContent>
        </Dialog>


        <div className="grid gap-4 py-4 px-1">
          <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="name" className="sm:text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:col-span-3 w-full"
            />
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="description" className="sm:text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="sm:col-span-3 w-full"
            />
          </div>
          {locations && locations.length > 0 && (
            <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="location" className="sm:text-right">
                Location
              </Label>
              <Select value={selectedLocationId || 'none'} onValueChange={(value) => setSelectedLocationId(value === 'none' ? undefined : value)}>
                <SelectTrigger className="sm:col-span-3 w-full">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No location</span>
                  </SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <span className="flex items-center gap-2">
                        <span>{location.icon || '📍'}</span>
                        {location.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                  const preference = exercisePreferences?.find(p => p.id === ex.exerciseId);

                  return (
                    <div
                      key={ex.id}
                      className="flex flex-col gap-4 p-3 border rounded-lg bg-background"
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
                      <div className="flex flex-col gap-4">
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
                        <div className="flex flex-col sm:grid sm:grid-cols-2 items-start sm:items-center gap-4">
                          <div className="flex items-center gap-2 flex-1 w-full">
                            <Label htmlFor={`sets-${ex.id}`} className="min-w-fit">Sets</Label>
                            <Input
                              id={`sets-${ex.id}`}
                              type="number"
                              value={ex.sets}
                              onChange={(e) =>
                                updateExercise(
                                  ex.id,
                                  'sets',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="3"
                            />
                          </div>
                          <div className="flex items-center gap-2 flex-1 w-full">
                            <Label htmlFor={`reps-${ex.id}`} className="min-w-fit">Reps</Label>
                            <Input
                              id={`reps-${ex.id}`}
                              value={ex.reps}
                              onChange={(e) =>
                                updateExercise(ex.id, 'reps', e.target.value)
                              }
                              placeholder={ex.unit === 'reps' ? "8-12" : "30"}
                            />
                          </div>
                        </div>

                        <Select value={ex.unit || 'reps'} onValueChange={(value) => updateExercise(ex.id, 'unit', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reps">Weight & Reps</SelectItem>
                            <SelectItem value="reps-only">Reps Only</SelectItem>
                            <SelectItem value="seconds">Seconds</SelectItem>
                            <SelectItem value="bodyweight">Bodyweight</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {preference?.videoId && (
                            <Button variant="outline" size="sm" className="w-full" onClick={() => setViewingVideoId(preference.videoId!)}>
                              <Video className="h-4 w-4 mr-2" />
                              View Linked Video
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={!ex.exerciseName || findingVideoFor === ex.id}
                            onClick={() => handleFindVideo(ex.exerciseId, ex.exerciseName)}
                          >
                            {findingVideoFor === ex.id ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Searching...</> : <><Youtube className="h-4 w-4 mr-2" /> Find Video</>}
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
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('date_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');


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
  const { data: exercisePreferences } = useCollection<UserExercisePreference>(exercisePreferencesQuery);

  // Locations for filtering
  const locationsCollection = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/locations`) : null
    , [firestore, user]);
  const { data: locations } = useCollection<WorkoutLocation>(locationsCollection);

  const editingWorkout = useMemo(() => {
    if (!editingWorkoutId || !workouts) return null;
    return workouts.find(w => w.id === editingWorkoutId) || null;
  }, [editingWorkoutId, workouts])

  // Effect to open sheet if `edit` param is present
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      if (workouts && workouts.some(w => w.id === editId)) {
        setTimeout(() => {
          setEditingWorkoutId(editId);
          setIsSheetOpen(true);
        }, 0);
      }
    }
  }, [searchParams, workouts]);


  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingWorkoutId(null);
      router.replace(pathname, { scroll: false });
    }
  };


  const handleCreateNew = () => {
    setEditingWorkoutId(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (workout: CustomWorkout) => {
    setEditingWorkoutId(workout.id);
    setIsSheetOpen(true);
  };

  const handleDelete = (workoutId: string) => {
    if (!user || !workoutsCollection) return;
    const workoutDoc = doc(workoutsCollection, workoutId);
    deleteDocumentNonBlocking(workoutDoc);
  };

  const handleSaveWorkout = async (
    workoutData: Partial<CustomWorkout>,
    isNew: boolean
  ) => {
    if (!user || !workoutsCollection) return;

    if (isNew) {
      const dataToSave = { ...workoutData, userId: user.uid, createdAt: new Date().toISOString() };
      await addDoc(workoutsCollection, dataToSave);
    } else {
      const originalWorkout = workouts?.find(w => w.id === editingWorkoutId);
      const dataToSave: Partial<CustomWorkout> & { userId: string } = {
        ...workoutData,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };

      if (!originalWorkout?.createdAt) {
        dataToSave.createdAt = new Date().toISOString();
      } else {
        dataToSave.createdAt = originalWorkout.createdAt;
      }

      const workoutDoc = doc(workoutsCollection, editingWorkoutId!);
      await updateDocumentNonBlocking(workoutDoc, dataToSave);
    }
    handleSheetOpenChange(false);
  };

  const sortedWorkouts = useMemo(() => {
    if (!workouts) return [];
    const sorted = [...workouts];
    if (sortOrder === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'date_desc') {
      sorted.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (a.createdAt) return -1; // a comes first
        if (b.createdAt) return 1;  // b comes first
        return 0; // no dates, keep original order
      });
    }

    // Apply location filter
    let filtered = sorted;
    if (locationFilter === 'unassigned') {
      filtered = sorted.filter(w => !w.locationId);
    } else if (locationFilter !== 'all') {
      filtered = sorted.filter(w => w.locationId === locationFilter);
    }

    // Apply search filter
    filtered = filtered.filter(w =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return filtered;
  }, [workouts, sortOrder, searchQuery, locationFilter]);

  const groupedWorkouts = useMemo(() => {
    return sortedWorkouts?.map(w => ({ ...w, groupedExercises: groupExercises(w.exercises || []) })) || [];
  }, [sortedWorkouts]);

  const isLoading = isLoadingWorkouts || isLoadingExercises;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold">My Workouts</h1>
          <p className="text-muted-foreground max-w-md">
            Create and manage your custom training routines.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button onClick={handleCreateNew} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Workout
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full max-w-[95vw] sm:max-w-2xl flex flex-col">
              <Suspense fallback={<div className="p-6">Loading form...</div>}>
                {isSheetOpen && (isLoading ? <div>Loading workout data...</div> :
                  <WorkoutForm
                    workout={editingWorkout}
                    masterExercises={masterExercises || []}
                    exercisePreferences={exercisePreferences || []}
                    locations={locations || []}
                    onSave={handleSaveWorkout}
                    onCancel={() => handleSheetOpenChange(false)}
                  />
                )}
              </Suspense>
            </SheetContent>
          </Sheet>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Date Created (Newest)</SelectItem>
              <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
            </SelectContent>
          </Select>
          {locations && locations.length > 0 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    All Locations
                  </span>
                </SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <span className="flex items-center gap-2">
                      <span>{location.icon || '📍'}</span>
                      {location.name}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="unassigned">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
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
                    {workout.locationName && (
                      <span className="inline-flex items-center gap-1 mr-2">
                        <MapPin className="h-3 w-3" />
                        {workout.locationName}
                      </span>
                    )}
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
