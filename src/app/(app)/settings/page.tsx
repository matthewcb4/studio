
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Settings, Target, Database, User as UserIcon, Dumbbell, Youtube, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useCollection, useUser, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, useDoc, setDocumentNonBlocking, deleteUser } from '@/firebase';
import { collection, doc, writeBatch, query, orderBy } from 'firebase/firestore';
import type { UserEquipment, UserProfile, Exercise, UserExercisePreference } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { seedExercises } from '@/lib/seed-data';
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
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { findExerciseVideo } from '@/ai/flows/find-exercise-video-flow';
import Image from 'next/image';

const equipmentFormSchema = z.object({
  name: z.string().min(2, { message: 'Equipment name must be at least 2 characters.' }),
});

const exerciseFormSchema = z.object({
  name: z.string().min(2, { message: 'Exercise name must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Please select a category.' }),
});

const goalsFormSchema = z.object({
    targetWeight: z.coerce.number().optional(),
    strengthGoal: z.string().optional(),
    muscleGoal: z.string().optional(),
    fatLossGoal: z.string().optional(),
    biologicalSex: z.enum(['Male', 'Female']).optional(),
});


export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmittingEquipment, setIsSubmittingEquipment] = useState(false);
  const [isSubmittingExercise, setIsSubmittingExercise] = useState(false);
  const [isSubmittingGoals, setIsSubmittingGoals] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [videoResults, setVideoResults] = useState<{ exerciseId: string; videos: any[] }>({ exerciseId: '', videos: [] });
  const [isFindingVideo, setIsFindingVideo] = useState(false);


  const equipmentCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/equipment`) : null
  , [firestore, user]);
  const { data: equipment, isLoading: isLoadingEquipment } = useCollection<UserEquipment>(equipmentCollection);

  const exercisesCollectionQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'exercises'), orderBy('name')) : null
  , [firestore]);
  const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesCollectionQuery);

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

  const userProfileRef = useMemoFirebase(() =>
    user ? doc(firestore, `users/${user.uid}/profile/main`) : null
  , [firestore, user]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const equipmentForm = useForm<z.infer<typeof equipmentFormSchema>>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const exerciseForm = useForm<z.infer<typeof exerciseFormSchema>>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: '',
      category: '',
    },
  });

  const goalsForm = useForm<z.infer<typeof goalsFormSchema>>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: {
        targetWeight: undefined,
        strengthGoal: '',
        muscleGoal: '',
        fatLossGoal: '',
        biologicalSex: undefined,
    },
  });

  useEffect(() => {
    if (userProfile) {
        goalsForm.reset({
            targetWeight: userProfile.targetWeight,
            strengthGoal: userProfile.strengthGoal,
            muscleGoal: userProfile.muscleGoal,
            fatLossGoal: userProfile.fatLossGoal,
            biologicalSex: userProfile.biologicalSex,
        });
    }
  }, [userProfile, goalsForm]);

  const onEquipmentSubmit = async (values: z.infer<typeof equipmentFormSchema>) => {
    if (!equipmentCollection) return;
    setIsSubmittingEquipment(true);
    try {
      await addDocumentNonBlocking(equipmentCollection, { name: values.name, userId: user?.uid });
      toast({ title: 'Success', description: `${values.name} added to your equipment.` });
      equipmentForm.reset();
    } catch (error) {
      console.error("Error adding equipment:", error);
      toast({ title: 'Error', description: 'Failed to add equipment.', variant: 'destructive' });
    } finally {
      setIsSubmittingEquipment(false);
    }
  };

  const onExerciseSubmit = async (values: z.infer<typeof exerciseFormSchema>) => {
    setIsSubmittingExercise(true);
    try {
      const exerciseCollectionRef = collection(firestore, 'exercises');
      await addDocumentNonBlocking(exerciseCollectionRef, values);
      toast({ title: 'Success', description: `${values.name} added to exercises.` });
      exerciseForm.reset();
    } catch (error) {
      console.error("Error adding exercise:", error);
      toast({ title: 'Error', description: 'Failed to add exercise.', variant: 'destructive' });
    } finally {
        setIsSubmittingExercise(false);
    }
  };

  const onGoalsSubmit = async (values: z.infer<typeof goalsFormSchema>) => {
    if (!userProfileRef) return;
    setIsSubmittingGoals(true);

    const dataToSave: Partial<z.infer<typeof goalsFormSchema>> = {};
    Object.keys(values).forEach(key => {
        const formKey = key as keyof typeof values;
        if (values[formKey] !== undefined && values[formKey] !== '') {
            (dataToSave as any)[formKey] = values[formKey];
        }
    });

    try {
      await setDocumentNonBlocking(userProfileRef, { ...dataToSave, id: user?.uid }, { merge: true });
      toast({ title: 'Success', description: 'Your profile has been updated.' });
    } catch (error) {
        console.error("Error updating goals:", error);
        toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
        setIsSubmittingGoals(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
      const exercisesRef = collection(firestore, 'exercises');
      const batch = writeBatch(firestore);

      seedExercises.forEach(exercise => {
        const docRef = doc(exercisesRef); 
        batch.set(docRef, exercise);
      });
      
      await batch.commit();

      toast({
        title: 'Database Seeded!',
        description: `${seedExercises.length} starter exercises have been added.`,
      });

    } catch (error) {
      console.error("Error seeding database:", error);
      toast({ title: 'Error', description: 'Failed to seed the database.', variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  }


  const handleDeleteEquipment = (equipmentId: string) => {
    if (!equipmentCollection) return;
    const equipmentDoc = doc(equipmentCollection, equipmentId);
    deleteDocumentNonBlocking(equipmentDoc);
    toast({ title: 'Equipment Removed' });
  };
  
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
  };

  const handleFindVideo = async (exerciseId: string, exerciseName: string) => {
    if (!exerciseName) return;
    setIsFindingVideo(true);
    setVideoResults({ exerciseId, videos: [] });
    try {
        const result = await findExerciseVideo({ exerciseName });
        if (result.videos && result.videos.length > 0) {
            setVideoResults({ exerciseId, videos: result.videos });
        } else {
            toast({ variant: "destructive", title: "No Videos Found", description: "The AI couldn't find any suitable videos for this exercise." });
        }
    } catch (error) {
        console.error("Error finding video:", error);
        toast({ variant: "destructive", title: "AI Error", description: "Could not find videos at this time." });
    } finally {
        setIsFindingVideo(false);
    }
  };

  const handleAccountDelete = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
        await deleteUser(user);
        toast({
            title: "Account Deleted",
            description: "Your account and all associated data have been deleted."
        });
        router.push('/');
    } catch (error: any) {
        console.error("Error deleting account:", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: error.message || "An error occurred. You may need to sign in again to delete your account.",
        });
    } finally {
        setIsDeletingAccount(false);
    }
  };


  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Settings className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your application settings.</p>
        </div>
      </div>
      
      <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
        <AccordionItem value="fitness-goals" className="border-none">
            <Card>
            <AccordionTrigger className="p-6 text-left">
                <div className="flex items-center gap-3">
                    <Target className="w-6 h-6 text-primary" />
                    <div>
                        <CardTitle>Fitness Goals</CardTitle>
                        <CardDescription className="mt-1.5 text-left">Set your targets to help personalize your experience.</CardDescription>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <Form {...goalsForm}>
                    <form onSubmit={goalsForm.handleSubmit(onGoalsSubmit)}>
                        <CardContent className="space-y-4">
                            {isLoadingProfile && <p>Loading goals...</p>}
                            {!isLoadingProfile && (
                                <>
                                <FormField
                                    control={goalsForm.control}
                                    name="targetWeight"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Body Weight (lbs)</FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="e.g. 185" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={goalsForm.control}
                                    name="strengthGoal"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Strength Goal</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a goal" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="increase_max_lift">Increase Max Lift</SelectItem>
                                                <SelectItem value="improve_endurance">Improve Muscular Endurance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={goalsForm.control}
                                    name="muscleGoal"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Muscle Gain Goal</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a goal" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="gain_overall_mass">Gain Overall Mass</SelectItem>
                                                <SelectItem value="define_muscle_tone">Define Muscle Tone</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={goalsForm.control}
                                    name="fatLossGoal"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fat Loss Goal</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a goal" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="reduce_body_fat">Reduce Body Fat %</SelectItem>
                                                <SelectItem value="lose_weight">Lose Weight</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSubmittingGoals}>
                                {isSubmittingGoals ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Goals
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </AccordionContent>
            </Card>
        </AccordionItem>
        <AccordionItem value="profile" className="border-none">
            <Card>
            <AccordionTrigger className="p-6 text-left">
                <div className="flex items-center gap-3">
                    <UserIcon className="w-6 h-6 text-primary" />
                    <div>
                        <CardTitle>User Profile</CardTitle>
                        <CardDescription className="mt-1.5 text-left">Set your user-specific information.</CardDescription>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <Form {...goalsForm}>
                    <form onSubmit={goalsForm.handleSubmit(onGoalsSubmit)}>
                        <CardContent className="space-y-4">
                            {isLoadingProfile && <p>Loading profile...</p>}
                            {!isLoadingProfile && (
                                <FormField
                                    control={goalsForm.control}
                                    name="biologicalSex"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Body Type for Heatmap</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a body type" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSubmittingGoals}>
                                {isSubmittingGoals ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Profile
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </AccordionContent>
            </Card>
        </AccordionItem>
        <AccordionItem value="my-equipment" className="border-none">
            <Card>
            <AccordionTrigger className="p-6 text-left">
                <div className="flex items-center gap-3">
                    <Dumbbell className="w-6 h-6 text-primary" />
                    <div>
                        <CardTitle>My Equipment</CardTitle>
                        <CardDescription className="mt-1.5 text-left">
                            Add or remove the gym equipment you have access to.
                        </CardDescription>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <CardContent className="space-y-6">
                <Form {...equipmentForm}>
                    <form onSubmit={equipmentForm.handleSubmit(onEquipmentSubmit)} className="flex gap-2">
                    <FormField
                        control={equipmentForm.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormControl>
                            <Input placeholder="e.g., Barbell, Dumbbells, Tonal" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmittingEquipment}>
                        {isSubmittingEquipment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                        <PlusCircle className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">Add</span>
                    </Button>
                    </form>
                </Form>

                <div className="space-y-2">
                    {isLoadingEquipment && <p>Loading your equipment...</p>}
                    {equipment && equipment.length > 0 ? (
                    equipment.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                        <p className="font-medium">{item.name}</p>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteEquipment(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </div>
                    ))
                    ) : (
                    !isLoadingEquipment && <p className="text-sm text-muted-foreground text-center py-4">No equipment added yet.</p>
                    )}
                </div>
                </CardContent>
            </AccordionContent>
            </Card>
        </AccordionItem>
        <AccordionItem value="manage-exercises" className="border-none">
            <Card>
            <AccordionTrigger className="p-6 text-left">
                <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-primary" />
                    <div>
                        <CardTitle>Manage Exercises</CardTitle>
                        <CardDescription className="mt-1.5 text-left">
                            Add, remove, or link videos to exercises from the master list.
                        </CardDescription>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <CardContent className="space-y-6">
                <Form {...exerciseForm}>
                    <form onSubmit={exerciseForm.handleSubmit(onExerciseSubmit)} className="space-y-4">
                        <FormField
                            control={exerciseForm.control}
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
                            control={exerciseForm.control}
                            name="category"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {exerciseCategories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmittingExercise}>
                            {isSubmittingExercise ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                            <PlusCircle className="h-4 w-4" />
                            )}
                            <span className="ml-2">Add Exercise</span>
                        </Button>
                    </form>
                </Form>

                <Separator />

                 <AlertDialog open={videoResults.videos.length > 0} onOpenChange={() => setVideoResults({ exerciseId: '', videos: [] })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Select a Video</AlertDialogTitle>
                            <AlertDialogDescription>
                                Choose a video to link to this exercise.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                            {videoResults.videos.map(video => (
                                <button key={video.videoId} onClick={() => handleSelectVideo(videoResults.exerciseId, video.videoId)} className="text-left space-y-2 hover:bg-secondary p-2 rounded-lg">
                                    <Image src={video.thumbnailUrl} alt={video.title} width={170} height={94} className="rounded-md w-full" />
                                    <p className="text-xs font-medium line-clamp-2">{video.title}</p>
                                </button>
                            ))}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>


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
                            <div key={item.id} className="p-3 bg-secondary rounded-md space-y-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{item.category}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mr-2"
                                          onClick={() => handleFindVideo(item.id, item.name)}
                                          disabled={isFindingVideo && videoResults.exerciseId === item.id}
                                        >
                                          {isFindingVideo && videoResults.exerciseId === item.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Youtube className="h-4 w-4" />}
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
                                <div>
                                    <Label htmlFor={`video-id-${item.id}`} className="text-xs">Linked Video ID</Label>
                                    <Input
                                        id={`video-id-${item.id}`}
                                        className="mt-1 h-8 text-sm"
                                        placeholder="Paste YouTube URL or ID"
                                        defaultValue={preference?.videoId || ''}
                                        onBlur={(e) => handleSelectVideo(item.id, e.target.value)}
                                    />
                                </div>
                            </div>
                          );
                        })
                        ) : (
                        !isLoadingExercises && <p className="text-sm text-muted-foreground text-center py-4">No exercises found.</p>
                        )}
                    </div>
                </div>
                
                <Separator className="my-6" />

                <div>
                    <h4 className="font-medium mb-2">Seed Database</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                    If the exercise list is empty, you can populate it with a starter set of common exercises. This is a one-time action and may create duplicates if run more than once.
                    </p>
                    <Button onClick={handleSeedDatabase} disabled={isSeeding}>
                    {isSeeding ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Seeding...</>
                    ) : (
                        "Seed Exercise Database"
                    )}
                    </Button>
                </div>

                </CardContent>
            </AccordionContent>
            </Card>
        </AccordionItem>
        <AccordionItem value="account" className="border-none">
            <Card>
                <AccordionTrigger className="p-6 text-left">
                    <div className="flex items-center gap-3">
                        <UserIcon className="w-6 h-6 text-destructive" />
                        <div>
                            <CardTitle className="text-destructive">Account</CardTitle>
                            <CardDescription className="mt-1.5 text-left">
                                Permanently delete your account and all associated data.
                            </CardDescription>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">Delete Account</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your
                                        account and remove all of your data from our servers.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleAccountDelete} disabled={isDeletingAccount}>
                                        {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Continue
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </AccordionContent>
            </Card>
        </AccordionItem>
         <AccordionItem value="legal" className="border-none">
            <Card>
            <AccordionTrigger className="p-6 text-left">
                <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-primary" />
                    <div>
                        <CardTitle>Legal</CardTitle>
                        <CardDescription className="mt-1.5 text-left">
                            View the Terms of Service and Privacy Policy.
                        </CardDescription>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <CardContent className="space-y-4">
                   <Link href="/terms" passHref>
                        <Button variant="outline" className="w-full justify-start">
                            Terms of Service
                        </Button>
                   </Link>
                   <Link href="/privacy" passHref>
                        <Button variant="outline" className="w-full justify-start">
                            Privacy Policy
                        </Button>
                   </Link>
                </CardContent>
            </AccordionContent>
            </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
