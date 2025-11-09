
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useCollection, useUser, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { UserEquipment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Equipment name must be at least 2 characters.' }),
});

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const equipmentCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/equipment`) : null
  , [firestore, user]);

  const { data: equipment, isLoading } = useCollection<UserEquipment>(equipmentCollection);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!equipmentCollection) return;
    setIsSubmitting(true);
    try {
      await addDocumentNonBlocking(equipmentCollection, { name: values.name });
      toast({ title: 'Success', description: `${values.name} added to your equipment.` });
      form.reset();
    } catch (error) {
      console.error("Error adding equipment:", error);
      toast({ title: 'Error', description: 'Failed to add equipment.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
              <FormField
                control={form.control}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Add</span>
              </Button>
            </form>
          </Form>

          <div className="space-y-2">
            {isLoading && <p>Loading your equipment...</p>}
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
              !isLoading && <p className="text-sm text-muted-foreground text-center py-4">No equipment added yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
