
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { calculateUserStats } from '@/lib/analytics'; // Imported analytics
import { PlusCircle, Trash2, Loader2, Settings, Target, User as UserIcon, Dumbbell, FileText, Palette, Link as LinkIcon, Database } from 'lucide-react'; // Added Database icon
import { Card, CardContent, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useCollection, useUser, useFirestore, useAuth, addDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, useDoc, setDocumentNonBlocking, deleteUser, linkFacebookAccount } from '@/firebase';
import { collection, doc, query, orderBy, getDocs } from 'firebase/firestore'; // Added query, orderBy, getDocs
import type { UserEquipment, UserProfile, WorkoutLog, WorkoutLocation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { ThemeSelector } from '@/components/theme-selector';
import { Facebook, MapPin, Edit, Check, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';


const equipmentFormSchema = z.object({
    name: z.string().min(2, { message: 'Equipment name must be at least 2 characters.' }),
});

const locationFormSchema = z.object({
    name: z.string().min(2, { message: 'Location name must be at least 2 characters.' }),
    type: z.enum(['home', 'gym', 'other']),
    icon: z.string().optional(),
});

const COMMON_GYM_EQUIPMENT = [
    "Barbell", "Dumbbells", "Cable Machine", "Lat Pulldown",
    "Leg Press", "Smith Machine", "Bench Press", "Squat Rack",
    "Pull-up Bar", "Dip Station", "Rowing Machine", "Treadmill",
    "Stationary Bike", "Kettlebells", "Medicine Ball", "Battle Ropes"
];

const LOCATION_ICONS = ["🏠", "🏋️", "💪", "🏃", "🎯", "⭐"];

const goalsFormSchema = z.object({
    targetWeight: z.coerce.number().optional(),
    weeklyWorkoutGoal: z.coerce.number().min(1, "Goal must be at least 1").max(21, "Goal cannot exceed 21").optional(),
    strengthGoal: z.string().optional(),
    muscleGoal: z.string().optional(),
    fatLossGoal: z.string().optional(),
    biologicalSex: z.enum(['Male', 'Female']).optional(),
});

import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const openSection = searchParams.get('open');
    const defaultAccordionValue = openSection === 'fitness-goals' ? ['fitness-goals'] : [];

    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmittingEquipment, setIsSubmittingEquipment] = useState(false);
    const [isSubmittingGoals, setIsSubmittingGoals] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);

    const equipmentCollection = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/equipment`) : null
        , [firestore, user]);
    const { data: equipment, isLoading: isLoadingEquipment } = useCollection<UserEquipment>(equipmentCollection);

    // Locations collection
    const locationsCollection = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/locations`) : null
        , [firestore, user]);
    const { data: locations, isLoading: isLoadingLocations } = useCollection<WorkoutLocation>(locationsCollection);

    const userProfileRef = useMemoFirebase(() =>
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
        , [firestore, user]);
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

    // Location management state
    const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
    const [editingLocation, setEditingLocation] = useState<WorkoutLocation | null>(null);
    const [editingEquipment, setEditingEquipment] = useState<string[]>([]);
    const [newEquipmentName, setNewEquipmentName] = useState('');
    const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);

    const equipmentForm = useForm<z.infer<typeof equipmentFormSchema>>({
        resolver: zodResolver(equipmentFormSchema),
        defaultValues: {
            name: '',
        },
    });

    const locationForm = useForm<z.infer<typeof locationFormSchema>>({
        resolver: zodResolver(locationFormSchema),
        defaultValues: {
            name: '',
            type: 'home',
            icon: '🏠',
        },
    });

    const goalsForm = useForm<z.infer<typeof goalsFormSchema>>({
        resolver: zodResolver(goalsFormSchema),
        defaultValues: {
            targetWeight: undefined,
            weeklyWorkoutGoal: 3,
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
                weeklyWorkoutGoal: userProfile.weeklyWorkoutGoal ?? 3,
                strengthGoal: userProfile.strengthGoal,
                muscleGoal: userProfile.muscleGoal,
                fatLossGoal: userProfile.fatLossGoal,
                biologicalSex: userProfile.biologicalSex,
            });
        }
    }, [userProfile, goalsForm]);

    useEffect(() => {
        if (!isLoadingEquipment && equipment && user?.uid && equipmentCollection) {
            const hasBodyweight = equipment.some(e => e.name === 'Bodyweight');
            if (!hasBodyweight) {
                const bodyweightEquipment = { name: "Bodyweight", userId: user.uid };
                addDocumentNonBlocking(equipmentCollection, bodyweightEquipment);
            }
        }
    }, [equipment, isLoadingEquipment, equipmentCollection, user?.uid]);


    const onEquipmentSubmit = async (values: z.infer<typeof equipmentFormSchema>) => {
        if (!equipmentCollection || !user?.uid) return;
        setIsSubmittingEquipment(true);
        try {
            await addDocumentNonBlocking(equipmentCollection, { name: values.name, userId: user.uid });
            toast({ title: 'Success', description: `${values.name} added to your equipment.` });
            equipmentForm.reset();
        } catch (error) {
            console.error("Error adding equipment:", error);
            toast({ title: 'Error', description: 'Failed to add equipment.', variant: 'destructive' });
        } finally {
            setIsSubmittingEquipment(false);
        }
    };

    const onGoalsSubmit = async (values: z.infer<typeof goalsFormSchema>) => {
        if (!userProfileRef || !user?.uid) return;
        setIsSubmittingGoals(true);

        const dataToSave: Partial<UserProfile> = { id: user.uid };
        const formKeys = Object.keys(values) as (keyof typeof values)[];

        formKeys.forEach(key => {
            if (values[key] !== undefined && values[key] !== '') {
                // @ts-expect-error - we know the keys match
                dataToSave[key] = values[key];
            }
        });

        try {
            await setDocumentNonBlocking(userProfileRef, dataToSave, { merge: true });
            toast({ title: 'Success', description: 'Your profile has been updated.' });
        } catch (error) {
            console.error("Error updating goals:", error);
            toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
        } finally {
            setIsSubmittingGoals(false);
        }
    };

    const handleDeleteEquipment = (equipmentId: string) => {
        if (!equipmentCollection) return;
        const equipmentDoc = doc(equipmentCollection, equipmentId);
        deleteDocumentNonBlocking(equipmentDoc);
        toast({ title: 'Equipment Removed' });
    };

    // Location management handlers
    const onLocationSubmit = async (values: z.infer<typeof locationFormSchema>) => {
        if (!locationsCollection || !user?.uid) return;
        setIsSubmittingLocation(true);
        try {
            const isFirstLocation = !locations || locations.length === 0;
            const newLocation: Omit<WorkoutLocation, 'id'> = {
                userId: user.uid,
                name: values.name,
                type: values.type,
                icon: values.icon || (values.type === 'home' ? '🏠' : values.type === 'gym' ? '🏋️' : '📍'),
                equipment: values.type === 'gym' ? ['Bodyweight'] : ['Bodyweight'],
                isDefault: isFirstLocation,
                createdAt: new Date().toISOString(),
            };
            await addDocumentNonBlocking(locationsCollection, newLocation);
            toast({ title: 'Location Created', description: `${values.name} has been added.` });
            locationForm.reset();
            setShowAddLocationDialog(false);
        } catch (error) {
            console.error("Error creating location:", error);
            toast({ title: 'Error', description: 'Failed to create location.', variant: 'destructive' });
        } finally {
            setIsSubmittingLocation(false);
        }
    };

    const handleSetDefaultLocation = async (locationId: string) => {
        if (!locationsCollection || !locations) return;
        try {
            // Unset all other defaults
            for (const loc of locations) {
                if (loc.isDefault && loc.id !== locationId) {
                    const locDoc = doc(locationsCollection, loc.id);
                    await setDocumentNonBlocking(locDoc, { isDefault: false }, { merge: true });
                }
            }
            // Set new default
            const locDoc = doc(locationsCollection, locationId);
            await setDocumentNonBlocking(locDoc, { isDefault: true }, { merge: true });

            // Update active location in profile
            if (userProfileRef) {
                await setDocumentNonBlocking(userProfileRef, { activeLocationId: locationId }, { merge: true });
            }

            toast({ title: 'Default Location Updated' });
        } catch (error) {
            console.error("Error setting default location:", error);
            toast({ title: 'Error', description: 'Failed to set default location.', variant: 'destructive' });
        }
    };

    const handleDeleteLocation = async (locationId: string) => {
        if (!locationsCollection || !locations) return;

        // Prevent deleting the last location
        if (locations.length <= 1) {
            toast({ title: 'Cannot Delete', description: 'You must have at least one location.', variant: 'destructive' });
            return;
        }

        const locationToDelete = locations.find(l => l.id === locationId);

        try {
            const locDoc = doc(locationsCollection, locationId);
            await deleteDocumentNonBlocking(locDoc);

            // If deleted location was default, set another as default
            if (locationToDelete?.isDefault && locations.length > 1) {
                const newDefault = locations.find(l => l.id !== locationId);
                if (newDefault) {
                    await handleSetDefaultLocation(newDefault.id);
                }
            }

            toast({ title: 'Location Deleted' });
        } catch (error) {
            console.error("Error deleting location:", error);
            toast({ title: 'Error', description: 'Failed to delete location.', variant: 'destructive' });
        }
    };

    const handleEditLocation = (location: WorkoutLocation) => {
        setEditingLocation(location);
        setEditingEquipment([...location.equipment]);
        setNewEquipmentName('');
    };

    const handleSaveLocationEquipment = async () => {
        if (!editingLocation || !locationsCollection) return;
        try {
            const locDoc = doc(locationsCollection, editingLocation.id);
            await setDocumentNonBlocking(locDoc, { equipment: editingEquipment }, { merge: true });
            toast({ title: 'Equipment Updated' });
            setEditingLocation(null);
        } catch (error) {
            console.error("Error updating location equipment:", error);
            toast({ title: 'Error', description: 'Failed to update equipment.', variant: 'destructive' });
        }
    };

    const handleAddEquipmentToLocation = () => {
        if (!newEquipmentName.trim()) return;
        if (editingEquipment.includes(newEquipmentName.trim())) {
            toast({ title: 'Already Added', description: 'This equipment is already in the list.', variant: 'destructive' });
            return;
        }
        setEditingEquipment([...editingEquipment, newEquipmentName.trim()]);
        setNewEquipmentName('');
    };

    const handleRemoveEquipmentFromLocation = (equipmentName: string) => {
        setEditingEquipment(editingEquipment.filter(e => e !== equipmentName));
    };

    const handleAddSuggestedEquipment = (equipmentName: string) => {
        if (editingEquipment.includes(equipmentName)) return;
        setEditingEquipment([...editingEquipment, equipmentName]);
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
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message: string; };
            console.error("Error deleting account:", firebaseError);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: firebaseError.message || "An error occurred. You may need to sign in again to delete your account.",
            });
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const handleLinkFacebook = async () => {
        if (!auth) return;
        try {
            await linkFacebookAccount(auth);
            toast({
                title: "Account Linked!",
                description: "Your Facebook account has been successfully linked.",
            });
            // Force a re-render or state update if needed to reflect the change
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message: string; };
            console.error("Facebook linking error:", firebaseError);
            let description = "An unknown error occurred.";
            if (firebaseError.code === 'auth/credential-already-in-use') {
                description = "This Facebook account is already linked to another user.";
            } else if (firebaseError.code === 'auth/popup-closed-by-user') {
                description = "The sign-in window was closed before linking was complete.";
            }
            toast({
                variant: "destructive",
                title: "Linking Failed",
                description: description,
            });
        }
    };

    const handleRecalculateStats = async () => {
        if (!user || !userProfileRef) return;
        setIsRecalculating(true);
        try {
            // Fetch all workout logs
            const logsRef = collection(firestore, `users/${user.uid}/workoutLogs`);
            // We need all logs, creating a query is good practice
            const logsQuery = query(logsRef);
            const snapshot = await getDocs(logsQuery);

            const logs = snapshot.docs.map(d => d.data() as WorkoutLog);

            if (logs.length === 0) {
                toast({ title: "No Workouts Found", description: "You don't have any logged workouts to analyze." });
                return;
            }

            // Calculate Stats
            const stats = calculateUserStats(logs);

            // Update Profile
            await setDocumentNonBlocking(userProfileRef, {
                lifetimeVolume: stats.lifetimeVolume,
                xp: stats.xp,
                level: stats.level,
                currentStreak: stats.currentStreak,
                longestStreak: stats.longestStreak,
                lastWorkoutDate: logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
            }, { merge: true });

            toast({
                title: "Stats Updated!",
                description: `Recalculated: Level ${stats.level}, Streak ${stats.currentStreak} days.`
            });

        } catch (error) {
            console.error("Error recalculating stats:", error);
            toast({
                title: "Error",
                description: "Failed to recalculate statistics.",
                variant: "destructive"
            });
        } finally {
            setIsRecalculating(false);
        }
    };

    const isFacebookLinked = user?.providerData.some(p => p.providerId === 'facebook.com');


    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <p className="text-xs text-muted-foreground">Version 2.1</p>
            <div className="flex items-center gap-4">
                <Settings className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage your application settings.</p>
                </div>
            </div>

            <Accordion type="multiple" defaultValue={defaultAccordionValue} className="w-full space-y-4">
                <AccordionItem value="appearance" className="border-none">
                    <Card>
                        <AccordionTrigger className="p-6 text-left">
                            <div className="flex items-center gap-3">
                                <Palette className="w-6 h-6 text-primary" />
                                <div>
                                    <CardTitle>Appearance</CardTitle>
                                    <CardDescription className="mt-1.5 text-left">Customize the look and feel of the app.</CardDescription>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent>
                                <ThemeSelector />
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
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
                                                    name="weeklyWorkoutGoal"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Weekly Workout Goal</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="Days per week (e.g. 3)" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
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
                                            <>
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
                                                <div className="pt-4 border-t">
                                                    <h4 className="font-medium mb-2">Workout Music</h4>
                                                    <p className="text-sm text-muted-foreground mb-3">
                                                        Select your preferred music app to show a quick-access button during workouts.
                                                    </p>
                                                    <Select
                                                        value={userProfile?.preferredMusicApp || 'none'}
                                                        onValueChange={(value) => {
                                                            if (userProfileRef) {
                                                                setDocumentNonBlocking(userProfileRef, { preferredMusicApp: value }, { merge: true });
                                                                toast({ title: 'Music App Updated' });
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a music app" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None (Hide button)</SelectItem>
                                                            <SelectItem value="spotify">🎵 Spotify</SelectItem>
                                                            <SelectItem value="apple-music">🍎 Apple Music</SelectItem>
                                                            <SelectItem value="youtube-music">▶️ YouTube Music</SelectItem>
                                                            <SelectItem value="amazon-music">📦 Amazon Music</SelectItem>
                                                            <SelectItem value="pandora">📻 Pandora</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </>
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
                <AccordionItem value="workout-locations" className="border-none">
                    <Card>
                        <AccordionTrigger className="p-6 text-left">
                            <div className="flex items-center gap-3">
                                <MapPin className="w-6 h-6 text-primary" />
                                <div>
                                    <CardTitle>Workout Locations</CardTitle>
                                    <CardDescription className="mt-1.5 text-left">
                                        Manage equipment for different workout locations.
                                    </CardDescription>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="space-y-6">
                                {/* Add Location Button */}
                                <Button onClick={() => setShowAddLocationDialog(true)} className="w-full">
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add Location
                                </Button>

                                {/* Location List */}
                                <div className="space-y-3">
                                    {isLoadingLocations && <p>Loading locations...</p>}
                                    {locations && locations.length > 0 ? (
                                        locations.map((location) => (
                                            <div key={location.id} className="p-4 bg-secondary rounded-lg space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{location.icon || '📍'}</span>
                                                        <div>
                                                            <p className="font-semibold flex items-center gap-2">
                                                                {location.name}
                                                                {location.isDefault && (
                                                                    <Badge variant="secondary" className="text-xs">Default</Badge>
                                                                )}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {location.equipment?.length || 0} equipment items
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditLocation(location)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        {!location.isDefault && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleSetDefaultLocation(location.id)}
                                                                title="Set as default"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={locations.length <= 1}
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Location?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete "{location.name}" and all its equipment. This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteLocation(location.id)}>
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                                {/* Equipment preview */}
                                                <div className="flex flex-wrap gap-1">
                                                    {location.equipment?.slice(0, 5).map((eq) => (
                                                        <Badge key={eq} variant="outline" className="text-xs">
                                                            {eq}
                                                        </Badge>
                                                    ))}
                                                    {(location.equipment?.length || 0) > 5 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{(location.equipment?.length || 0) - 5} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        !isLoadingLocations && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p className="font-medium">No locations yet</p>
                                                <p className="text-sm">Add your first workout location to get started.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="data-management" className="border-none">
                    <Card>
                        <AccordionTrigger className="p-6 text-left">
                            <div className="flex items-center gap-3">
                                <Database className="w-6 h-6 text-primary" />
                                <div>
                                    <CardTitle>Data Management</CardTitle>
                                    <CardDescription className="mt-1.5 text-left">
                                        Manage your workout history and statistics.
                                    </CardDescription>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <h4 className="font-medium">Recalculate Statistics</h4>
                                    <p className="text-sm text-muted-foreground">
                                        If your streak, level, or lifetime volume seems incorrect, you can verify and recalculate them from your entire workout history.
                                        This provides a safe way to ensure your stats are up to date.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={handleRecalculateStats}
                                        disabled={isRecalculating}
                                    >
                                        {isRecalculating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Recalculating...
                                            </>
                                        ) : (
                                            "Recalculate Statistics"
                                        )}
                                    </Button>
                                </div>
                                <div className="border-t pt-4 space-y-2">
                                    <h4 className="font-medium">Merge Duplicate Exercises</h4>
                                    <p className="text-sm text-muted-foreground">
                                        If you have exercises with slightly different names (e.g., &quot;Close grip Push-ups&quot; vs &quot;Close-Grip Push-ups&quot;),
                                        you can merge them to consolidate your progress tracking.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push('/exercises?merge=true')}
                                    >
                                        Open Exercise Manager
                                    </Button>
                                </div>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="account-linking" className="border-none">
                    <Card>
                        <AccordionTrigger className="p-6 text-left">
                            <div className="flex items-center gap-3">
                                <LinkIcon className="w-6 h-6 text-primary" />
                                <div>
                                    <CardTitle>Account Linking</CardTitle>
                                    <CardDescription className="mt-1.5 text-left">
                                        Connect other sign-in methods to your account.
                                    </CardDescription>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent>
                                <Button onClick={handleLinkFacebook} disabled={isFacebookLinked} className="w-full">
                                    {isFacebookLinked ? (
                                        <>
                                            <Facebook className="mr-2 h-4 w-4" />
                                            Facebook Account Linked
                                        </>
                                    ) : (
                                        <>
                                            <Facebook className="mr-2 h-4 w-4" />
                                            Link Facebook Account
                                        </>
                                    )}
                                </Button>
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

            {/* Add Location Dialog */}
            <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Workout Location</DialogTitle>
                        <DialogDescription>
                            Create a new location to organize your equipment.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...locationForm}>
                        <form onSubmit={locationForm.handleSubmit(onLocationSubmit)} className="space-y-4">
                            <FormField
                                control={locationForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Home Gym, YMCA, Planet Fitness" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={locationForm.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="home">🏠 Home (free-form equipment)</SelectItem>
                                                <SelectItem value="gym">🏋️ Gym (with suggestions)</SelectItem>
                                                <SelectItem value="other">📍 Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={locationForm.control}
                                name="icon"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Icon</FormLabel>
                                        <div className="flex gap-2 flex-wrap">
                                            {LOCATION_ICONS.map((icon) => (
                                                <Button
                                                    key={icon}
                                                    type="button"
                                                    variant={field.value === icon ? "default" : "outline"}
                                                    size="icon"
                                                    onClick={() => field.onChange(icon)}
                                                >
                                                    {icon}
                                                </Button>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowAddLocationDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmittingLocation}>
                                    {isSubmittingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Create Location
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Location Equipment Dialog */}
            <Dialog open={!!editingLocation} onOpenChange={(open) => !open && setEditingLocation(null)}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="text-2xl">{editingLocation?.icon}</span>
                            Edit {editingLocation?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Add or remove equipment for this location.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Add equipment input */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add equipment..."
                                value={newEquipmentName}
                                onChange={(e) => setNewEquipmentName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddEquipmentToLocation();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddEquipmentToLocation}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Suggestions for gym locations */}
                        {editingLocation?.type === 'gym' && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Quick Add:</p>
                                <div className="flex flex-wrap gap-1">
                                    {COMMON_GYM_EQUIPMENT.filter(eq => !editingEquipment.includes(eq)).slice(0, 8).map((eq) => (
                                        <Button
                                            key={eq}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAddSuggestedEquipment(eq)}
                                            className="text-xs"
                                        >
                                            + {eq}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Current equipment list */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Equipment ({editingEquipment.length}):</p>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {editingEquipment.map((eq) => (
                                    <div key={eq} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                        <span>{eq}</span>
                                        {eq !== 'Bodyweight' && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveEquipmentFromLocation(eq)}
                                            >
                                                <X className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {editingEquipment.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No equipment added yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditingLocation(null)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSaveLocationEquipment}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

