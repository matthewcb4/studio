
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Settings, Target, Database, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useCollection, useUser, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { UserEquipment, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { seedExercises } from '@/lib/seed-data';

const equipmentFormSchema = z.object({
  name: z.string().min(2, { message: 'Equipment name must be at least 2 characters.' }),
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
  const [isSubmittingEquipment, setIsSubmittingEquipment] = useState(false);
  const [isSubmittingGoals, setIsSubmittingGoals] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

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

  const onGoalsSubmit = async (values: z.infer<typeof goalsFormSchema>) => {
    if (!userProfileRef) return;
    setIsSubmittingGoals(true);
    try {
      await setDocumentNonBlocking(userProfileRef, { ...values, id: user?.uid }, { merge: true });
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
        const docRef = doc(exercisesRef); // Create a new doc with a unique ID
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


  const handleDelete = (equipmentId: string) => {
    if (!equipmentCollection) return;
    const equipmentDoc = doc(equipmentCollection, equipmentId);
    deleteDocumentNonBlocking(equipmentDoc);
    toast({ title: 'Equipment Removed' });
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
                <div>
                    <CardTitle>My Equipment</CardTitle>
                    <CardDescription className="mt-1.5 text-left">
                        Add or remove the gym equipment you have access to. This will speed up workout generation.
                    </CardDescription>
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
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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
        <AccordionItem value="database-seeding" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 text-left">
                <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-primary" />
                    <div>
                        <CardTitle>Advanced Settings</CardTitle>
                        <CardDescription className="mt-1.5 text-left">Handle with care.</CardDescription>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent>
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
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
