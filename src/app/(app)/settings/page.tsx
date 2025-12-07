
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Settings, Target, User as UserIcon, Dumbbell, FileText, Palette, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useCollection, useUser, useFirestore, useAuth, addDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, useDoc, setDocumentNonBlocking, deleteUser, linkFacebookAccount } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { UserEquipment, UserProfile } from '@/lib/types';
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
import { Facebook } from 'lucide-react';


const equipmentFormSchema = z.object({
    name: z.string().min(2, { message: 'Equipment name must be at least 2 characters.' }),
});

const goalsFormSchema = z.object({
    targetWeight: z.coerce.number().optional(),
    weeklyWorkoutGoal: z.coerce.number().min(1, "Goal must be at least 1").max(21, "Goal cannot exceed 21").optional(),
    strengthGoal: z.string().optional(),
    muscleGoal: z.string().optional(),
    fatLossGoal: z.string().optional(),
    biologicalSex: z.enum(['Male', 'Female']).optional(),
});

export default function SettingsPage() {
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmittingEquipment, setIsSubmittingEquipment] = useState(false);
    const [isSubmittingGoals, setIsSubmittingGoals] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    const equipmentCollection = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/equipment`) : null
        , [firestore, user]);
    const { data: equipment, isLoading: isLoadingEquipment } = useCollection<UserEquipment>(equipmentCollection);

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

    const isFacebookLinked = user?.providerData.some(p => p.providerId === 'facebook.com');


    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Settings className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage your application settings.</p>
                </div>
            </div>

            <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
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
                                                {item.name !== 'Bodyweight' &&
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteEquipment(item.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                }
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
        </div>
    );
}

