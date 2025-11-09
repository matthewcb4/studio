
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Settings, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useCollection, useUser, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { UserEquipment, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const equipmentFormSchema = z.object({
  name: z.string().min(2, { message: 'Equipment name must be at least 2 characters.' }),
});

const goalsFormSchema = z.object({
    targetWeight: z.coerce.number().optional(),
    strengthGoal: z.string().optional(),
    muscleGoal: z.string().optional(),
    fatLossGoal: z.string().optional(),
});


export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmittingEquipment, setIsSubmittingEquipment] = useState(false);
  const [isSubmittingGoals, setIsSubmittingGoals] = useState(false);

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
    },
  });

  useEffect(() => {
    if (userProfile) {
        goalsForm.reset({
            targetWeight: userProfile.targetWeight,
            strengthGoal: userProfile.strengthGoal,
            muscleGoal: userProfile.muscleGoal,
            fatLossGoal: userProfile.fatLossGoal,
        });
    }
  }, [userProfile, goalsForm]);

  const onEquipmentSubmit = async (values: z.infer<typeof equipmentFormSchema>) => {
    if (!equipmentCollection) return;
    setIsSubmittingEquipment(true);
    try {
      await addDocumentNonBlocking(equipmentCollection, { name: values.name });
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
      await setDocumentNonBlocking(userProfileRef, values, { merge: true });
      toast({ title: 'Success', description: 'Your fitness goals have been updated.' });
    } catch (error) {
        console.error("Error updating goals:", error);
        toast({ title: 'Error', description: 'Failed to update goals.', variant: 'destructive' });
    } finally {
        setIsSubmittingGoals(false);
    }
  };


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
      
      <Card>
        <CardHeader>
          <CardTitle>My Equipment</CardTitle>
          <CardDescription>
            Add or remove the gym equipment you have access to. This will speed up workout generation.
          </CardDescription>
        </CardHeader>
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
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              <CardTitle>Fitness Goals</CardTitle>
            </div>
            <CardDescription>Set your targets to help personalize your experience.</CardDescription>
        </CardHeader>
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
      </Card>
    </div>
  );
}

    