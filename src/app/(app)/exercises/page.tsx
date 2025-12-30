

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    DialogFooter,
    DialogClose,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Trash2, Youtube, Video, Loader2, List, Check, Edit } from 'lucide-react';
import type {
    Exercise as MasterExercise,
    UserExercisePreference,
    LoggedSet
} from '@/lib/types';
import {
    useCollection,
    useUser,
    useFirestore,
    setDocumentNonBlocking,
    deleteDocumentNonBlocking,
    useMemoFirebase,
    addDoc,
    updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { findExerciseVideo, FindExerciseVideoOutput } from '@/ai/flows/find-exercise-video-flow';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { seedExercises } from '@/lib/seed-data';
import { QuickLogForm } from '@/components/quick-log-form';
import { MergeExercisesDialog } from '@/components/merge-exercises-dialog';

const exerciseFormSchema = z.object({
    name: z.string().min(2, { message: 'Exercise name must be at least 2 characters.' }),
    category: z.string().optional(), // Auto-derived from targetMuscles
    targetMuscles: z.array(z.string()).min(1, { message: 'Please select at least one muscle group.' }),
    defaultUnit: z.enum(['reps', 'seconds', 'bodyweight', 'reps-only']).optional(),
});

// All available muscle groups (flat list matching AI workout generator)
const allMuscleOptions = {
    'Muscle Groups': ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'],
    'Back Muscles': ['Lats', 'Traps', 'Lower Back', 'Rhomboids'],
    'Shoulder Muscles': ['Front Delts', 'Side Delts', 'Rear Delts'],
    'Leg Muscles': ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors'],
    'Arm Muscles': ['Biceps', 'Triceps', 'Forearms'],
    'Core Muscles': ['Abs', 'Obliques'],
};

// Mapping from specific muscles to their parent category
const muscleToCategory: Record<string, string> = {
    'Chest': 'Chest',
    'Back': 'Back', 'Lats': 'Back', 'Traps': 'Back', 'Lower Back': 'Back', 'Rhomboids': 'Back',
    'Shoulders': 'Shoulders', 'Front Delts': 'Shoulders', 'Side Delts': 'Shoulders', 'Rear Delts': 'Shoulders',
    'Arms': 'Arms', 'Biceps': 'Arms', 'Triceps': 'Arms', 'Forearms': 'Arms',
    'Legs': 'Legs', 'Quads': 'Legs', 'Hamstrings': 'Legs', 'Glutes': 'Legs', 'Calves': 'Legs', 'Hip Flexors': 'Legs',
    'Core': 'Core', 'Abs': 'Core', 'Obliques': 'Core',
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

function ExerciseForm({ exercise, categories, onSave, onCancel }: { exercise?: MasterExercise | null, categories: string[], onSave: (data: z.infer<typeof exerciseFormSchema>) => void, onCancel: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof exerciseFormSchema>>({
        resolver: zodResolver(exerciseFormSchema),
        defaultValues: {
            name: exercise?.name || '',
            category: exercise?.category || '',
            targetMuscles: exercise?.targetMuscles || [],
            defaultUnit: exercise?.defaultUnit || 'reps',
        },
    });


    useEffect(() => {
        if (exercise) {
            form.reset({
                name: exercise.name,
                category: exercise.category,
                targetMuscles: exercise.targetMuscles || [],
                defaultUnit: exercise.defaultUnit || 'reps',
            });
        } else {
            form.reset({
                name: '',
                category: '',
                targetMuscles: [],
                defaultUnit: 'reps',
            });
        }
    }, [exercise, form]);

    const onSubmit = (data: z.infer<typeof exerciseFormSchema>) => {
        setIsSubmitting(true);
        // Auto-derive category from the first selected muscle
        const derivedCategory = data.targetMuscles.length > 0
            ? muscleToCategory[data.targetMuscles[0]] || 'Other'
            : 'Other';
        onSave({ ...data, category: derivedCategory });
    };

    const isEditing = !!exercise;

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Exercise' : 'Add New Exercise'}</DialogTitle>
                <DialogDescription>
                    {isEditing ? `Update the details for ${exercise.name}.` : 'Add a new exercise to your master list.'}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Exercise Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Barbell Curl" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="targetMuscles"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Target Muscles</FormLabel>
                                <div className="max-h-[250px] overflow-y-auto border rounded-lg p-3 bg-muted/20 space-y-4">
                                    {Object.entries(allMuscleOptions).map(([groupName, muscles]) => (
                                        <div key={groupName}>
                                            <p className="text-xs font-semibold text-muted-foreground mb-2">{groupName}</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {muscles.map(muscle => (
                                                    <label key={muscle} className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300"
                                                            checked={field.value?.includes(muscle) || false}
                                                            onChange={(e) => {
                                                                const current = field.value || [];
                                                                if (e.target.checked) {
                                                                    field.onChange([...current, muscle]);
                                                                } else {
                                                                    field.onChange(current.filter(m => m !== muscle));
                                                                }
                                                            }}
                                                        />
                                                        {muscle}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="defaultUnit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Default Unit</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a default unit" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="reps">Weight & Reps</SelectItem>
                                        <SelectItem value="reps-only">Reps Only</SelectItem>
                                        <SelectItem value="seconds">Seconds</SelectItem>
                                        <SelectItem value="bodyweight">Bodyweight</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            {isEditing ? 'Save Changes' : 'Add Exercise'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default function ExercisesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [isSeeding, setIsSeeding] = useState(false);
    const [exerciseFilter, setExerciseFilter] = useState('');
    const [videoResults, setVideoResults] = useState<{ exerciseId: string; videos: FindExerciseVideoOutput['videos'] }>({ exerciseId: '', videos: [] });
    const [findingVideoFor, setFindingVideoFor] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<FindExerciseVideoOutput['videos'][0] | null>(null);
    const [loggingExercise, setLoggingExercise] = useState<MasterExercise | null>(null);
    const [editingExercise, setEditingExercise] = useState<MasterExercise | null>(null);
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    // Open merge dialog if coming from Settings with ?merge=true
    useEffect(() => {
        if (searchParams.get('merge') === 'true') {
            setIsMergeDialogOpen(true);
        }
    }, [searchParams]);

    const exercisesCollectionQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'exercises'), orderBy('name')) : null
        , [firestore]);
    const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<MasterExercise>(exercisesCollectionQuery);

    const exercisePreferencesQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/exercisePreferences`) : null
        , [firestore, user]);
    const { data: exercisePreferences } = useCollection<UserExercisePreference>(exercisePreferencesQuery);

    const exerciseCategories = useMemo(() => {
        if (!masterExercises) return [];
        const categories = masterExercises.map(ex => ex.category).filter(Boolean) as string[];
        return [...new Set(categories)].sort();
    }, [masterExercises]);

    const filteredExercises = useMemo(() => {
        if (!masterExercises) return [];
        if (!exerciseFilter) return masterExercises;
        return masterExercises.filter(ex =>
            ex.name.toLowerCase().includes(exerciseFilter.toLowerCase())
        );
    }, [masterExercises, exerciseFilter]);

    const handleExerciseSave = async (values: z.infer<typeof exerciseFormSchema>) => {
        if (!firestore) return;
        try {
            if (editingExercise) {
                // Update
                const exerciseDocRef = doc(firestore, 'exercises', editingExercise.id);
                await updateDocumentNonBlocking(exerciseDocRef, values);
                toast({ title: 'Success', description: `${values.name} has been updated.` });
            } else {
                // Create
                const exerciseCollectionRef = collection(firestore, 'exercises');
                await addDoc(exerciseCollectionRef, values);
                toast({ title: 'Success', description: `${values.name} added to exercises.` });
                setIsAddDialogOpen(false);
            }
            setEditingExercise(null);
        } catch (error) {
            console.error("Error saving exercise:", error);
            toast({ title: 'Error', description: 'Failed to save exercise.', variant: 'destructive' });
        }
    };

    const handleQuickLog = async (exercise: MasterExercise, sets: LoggedSet[]) => {
        if (!user) return;

        const totalVolume = sets.reduce((acc, set) => acc + (set.weight || 0) * (set.reps || 0), 0);

        const workoutLog = {
            userId: user.uid,
            workoutName: `Quick Log: ${exercise.name}`,
            date: new Date().toISOString(),
            duration: "00:00", // Not tracked for quick logs
            exercises: [{
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                sets: sets
            }],
            volume: totalVolume,
        };
        const logsCollection = collection(firestore, `users/${user.uid}/workoutLogs`);
        await addDoc(logsCollection, workoutLog);
        toast({
            title: "Exercise Logged!",
            description: `${exercise.name} has been added to your history.`
        });
        setLoggingExercise(null);
    };

    const handleSeedDatabase = async () => {
        if (!firestore) return;
        setIsSeeding(true);
        try {
            const exercisesRef = collection(firestore, 'exercises');

            // Get existing exercises to check for duplicates
            const existingSnapshot = await getDocs(exercisesRef);
            const existingByName = new Map<string, string>(); // name -> docId
            existingSnapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.name) {
                    existingByName.set(data.name, docSnap.id);
                }
            });

            const batch = writeBatch(firestore);
            let updated = 0;
            let added = 0;

            seedExercises.forEach(exercise => {
                const existingId = existingByName.get(exercise.name);
                if (existingId) {
                    // Update existing exercise with targetMuscles (merge)
                    const docRef = doc(exercisesRef, existingId);
                    batch.set(docRef, exercise, { merge: true });
                    updated++;
                } else {
                    // Add new exercise
                    const docRef = doc(exercisesRef);
                    batch.set(docRef, exercise);
                    added++;
                }
            });

            await batch.commit();

            toast({
                title: 'Database Updated!',
                description: `${updated} exercises updated, ${added} new exercises added.`,
            });

        } catch (error) {
            console.error("Error seeding database:", error);
            toast({ title: 'Error', description: 'Failed to seed the database.', variant: 'destructive' });
        } finally {
            setIsSeeding(false);
        }
    }

    const handleDeleteExercise = (exerciseId: string) => {
        if (!firestore) return;
        const exerciseDoc = doc(firestore, 'exercises', exerciseId);
        deleteDocumentNonBlocking(exerciseDoc);
        toast({ title: 'Exercise Removed' });
    };

    const handleSelectVideo = (masterExerciseId: string, videoId: string) => {
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
            if (result.videos && result.videos.length > 0) {
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

    const showSeedButton = !isLoadingExercises && masterExercises?.length === 0;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <List className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold">Exercises</h1>
                        <p className="text-muted-foreground">Manage your exercise library and perform quick logs.</p>
                    </div>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New
                        </Button>
                    </DialogTrigger>
                    <ExerciseForm exercise={null} categories={exerciseCategories} onSave={handleExerciseSave} onCancel={() => setIsAddDialogOpen(false)} />
                </Dialog>
            </div>

            <Dialog open={!!editingExercise} onOpenChange={(isOpen) => { if (!isOpen) setEditingExercise(null) }}>
                <ExerciseForm exercise={editingExercise} categories={exerciseCategories} onSave={handleExerciseSave} onCancel={() => setEditingExercise(null)} />
            </Dialog>

            <MergeExercisesDialog
                open={isMergeDialogOpen}
                onOpenChange={setIsMergeDialogOpen}
                userId={user?.uid}
            />

            <Separator />

            <Dialog open={!!loggingExercise} onOpenChange={(open) => !open && setLoggingExercise(null)}>
                <DialogContent>
                    {loggingExercise && <QuickLogForm exercise={loggingExercise} onLog={(sets) => handleQuickLog(loggingExercise, sets)} onCancel={() => setLoggingExercise(null)} />}
                </DialogContent>
            </Dialog>


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
                                    <Button className="w-full" onClick={() => handleSelectVideo(videoResults.exerciseId, selectedVideo.videoId)}>
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


            <div className="space-y-4">
                <h4 className="font-medium mb-2">Exercise List</h4>
                <Input
                    placeholder="Filter exercises..."
                    value={exerciseFilter}
                    onChange={(e) => setExerciseFilter(e.target.value)}
                    className="mb-4"
                />
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {isLoadingExercises && <p>Loading exercises...</p>}
                    {filteredExercises && filteredExercises.length > 0 ? (
                        filteredExercises.map((item) => {
                            const preference = exercisePreferences?.find(p => p.id === item.id);
                            return (
                                <Dialog key={item.id}>
                                    <div className="p-3 bg-secondary rounded-md space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.category}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Button variant="default" size="sm" className="h-8 w-20" onClick={() => setLoggingExercise(item)}>Log</Button>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingExercise(item)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    {preference?.videoId && (
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="icon" className="h-8 w-8">
                                                                <Video className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleFindVideo(item.id, item.name)}
                                                        disabled={findingVideoFor === item.id}
                                                    >
                                                        {findingVideoFor === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the exercise "{item.name}".
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteExercise(item.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{item.name}</DialogTitle>
                                        </DialogHeader>
                                        {preference?.videoId ? <YouTubeEmbed videoId={preference.videoId} /> : <p>No video linked.</p>}
                                    </DialogContent>
                                </Dialog>
                            );
                        })
                    ) : (
                        !isLoadingExercises && !showSeedButton && <p className="text-sm text-muted-foreground text-center py-4">No exercises found.</p>
                    )}
                </div>
            </div>

            {showSeedButton && (
                <>
                    <Separator className="my-6" />
                    <div className="text-center p-4 border-2 border-dashed rounded-lg">
                        <h4 className="font-medium mb-2">Your Exercise Library is Empty</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            Get started by populating your library with a starter set of common exercises.
                        </p>
                        <Button onClick={handleSeedDatabase} disabled={isSeeding}>
                            {isSeeding ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Seeding...</>
                            ) : (
                                "Seed Exercise Database"
                            )}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
